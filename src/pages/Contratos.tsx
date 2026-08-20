import React, { useState, useEffect } from 'react'
import {
  FileCheck,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
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
import { ContractRecord, CustomerRecord } from '@/types/platform'

export function ContratosPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<ContractRecord>>({
    titulo: 'Contrato de Prestação de Serviços Advocatícios',
    valor: 35000,
    plataforma: 'zapsign',
    status: 'aguardando',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [cList, custList] = await Promise.all([
        CrmService.getContracts(tenant.id),
        CrmService.getCustomers(tenant.id),
      ])
      setContracts(cList)
      setCustomers(custList)
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
      await CrmService.createContract(tenant.id, {
        ...formData,
        data_envio: new Date().toISOString(),
      })
      toast({ title: 'Contrato gerado e enviado para assinatura!' })
      setCreateModalOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao criar contrato', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'assinado':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Assinado
          </Badge>
        )
      case 'enviado':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Enviado</Badge>
      case 'recusado':
        return <Badge variant="destructive">Recusado</Badge>
      default:
        return <Badge variant="outline">{status || 'Aguardando'}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-legal-serif">
              Contratos &amp; Assinaturas Digitais
            </h1>
            <Badge variant="outline">{contracts.length} contratos</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Integração nativa com ZapSign e Clicksign para formalização e segurança jurídica.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Novo Contrato de Honorários
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
            <tr>
              <th className="p-3.5 pl-4">Contrato / Título</th>
              <th className="p-3.5">Cliente Contratante</th>
              <th className="p-3.5">Valor do Contrato</th>
              <th className="p-3.5">Plataforma</th>
              <th className="p-3.5">Status Assinatura</th>
              <th className="p-3.5">Data de Envio</th>
              <th className="p-3.5 pr-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Carregando contratos...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum contrato formalizado ainda.
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-3.5 pl-4 font-semibold text-foreground">{c.titulo}</td>
                  <td className="p-3.5">{c.expand?.cliente_id?.name || 'Cliente Geral'}</td>
                  <td className="p-3.5 font-bold">
                    R$ {Number(c.valor || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3.5 uppercase font-mono text-[10px]">{c.plataforma}</td>
                  <td className="p-3.5">{getStatusBadge(c.status)}</td>
                  <td className="p-3.5 text-muted-foreground">
                    {c.data_envio ? new Date(c.data_envio).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await CrmService.updateContract(c.id, {
                          status: c.status === 'assinado' ? 'aguardando' : 'assinado',
                          data_assinatura:
                            c.status === 'assinado' ? undefined : new Date().toISOString(),
                        })
                        toast({ title: 'Status do contrato atualizado!' })
                        loadData()
                      }}
                      className="h-7 text-xs"
                    >
                      {c.status === 'assinado' ? 'Reverter' : 'Marcar Assinado'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Gerar Contrato para Assinatura
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Instrumento *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
              <Input
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plataforma de Assinatura</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(val) => setFormData({ ...formData, plataforma: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapsign">ZapSign (WhatsApp &amp; E-mail)</SelectItem>
                  <SelectItem value="clicksign">Clicksign</SelectItem>
                  <SelectItem value="manual">Assinatura Manual / Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente Contratante</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(val) => setFormData({ ...formData, cliente_id: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Disparar Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ContratosPage
