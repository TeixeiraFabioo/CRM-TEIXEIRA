import React, { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  Download,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { ProposalRecord, TemplateRecord, LeadRecord, CustomerRecord } from '@/types/platform'

export function PropostasPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<ProposalRecord>>({
    titulo: 'Proposta de Assessoria Tributária',
    valor_total: 25000,
    validade: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    condicoes: 'Entrada de 30% + Saldo no êxito judicial',
    descricao: 'Levantamento de créditos tributários e recuperação de PIS/COFINS.',
    status: 'enviada',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [pList, tList, lList] = await Promise.all([
        CrmService.getProposals(tenant.id),
        CrmService.getTemplates(tenant.id),
        CrmService.getLeads(tenant.id),
      ])
      setProposals(pList)
      setTemplates(tList)
      setLeads(lList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.titulo) return
    try {
      await CrmService.createProposal(tenant.id, {
        ...formData,
        data_envio: new Date().toISOString(),
      })
      toast({ title: 'Proposta gerada e vinculada!' })
      setCreateModalOpen(false)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao gerar proposta', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-legal-serif">Propostas de Honorários</h1>
            <Badge variant="outline">{proposals.length} emitidas</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geração estruturada de minutas, orçamentos e propostas comerciais jurídicas.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Proposta de Honorários
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
            <tr>
              <th className="p-3.5 pl-4">Título da Proposta</th>
              <th className="p-3.5">Cliente / Lead</th>
              <th className="p-3.5">Valor Total</th>
              <th className="p-3.5">Condições</th>
              <th className="p-3.5">Validade</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 pr-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Carregando propostas...
                </td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhuma proposta cadastrada ainda.
                </td>
              </tr>
            ) : (
              proposals.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-3.5 pl-4 font-semibold text-foreground">{p.titulo}</td>
                  <td className="p-3.5">
                    {p.expand?.lead_id?.name || p.expand?.cliente_id?.name || 'Cliente Geral'}
                  </td>
                  <td className="p-3.5 font-bold">
                    R$ {Number(p.valor_total || p.valor || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3.5 text-muted-foreground truncate max-w-[180px]">
                    {p.condicoes || 'À vista / Parcelado'}
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {p.validade ? new Date(p.validade).toLocaleDateString('pt-BR') : '15 dias'}
                  </td>
                  <td className="p-3.5">
                    <Badge variant="outline">{p.status}</Badge>
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Visualizar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Gerar Nova Proposta
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={formData.valor_total}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_total: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Validade</Label>
                <Input
                  type="date"
                  value={formData.validade}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Condições de Pagamento</Label>
              <Input
                value={formData.condicoes}
                onChange={(e) => setFormData({ ...formData, condicoes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Escopo</Label>
              <Textarea
                rows={2}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Gerar Proposta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PropostasPage
