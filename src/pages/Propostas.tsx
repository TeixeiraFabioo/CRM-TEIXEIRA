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
  Edit,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import pb from '@/lib/pocketbase/client'
import {
  ProposalRecord,
  TemplateRecord,
  LeadRecord,
  CustomerRecord,
  ServiceRecord,
} from '@/types/platform'

export function PropostasPage() {
  const { tenant, userRole, user } = useTenant()
  const isAdmin = userRole === 'admin' || user?.role === 'admin'
  const { toast } = useToast()

  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<ProposalRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [proposalToDelete, setProposalToDelete] = useState<ProposalRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<ProposalRecord>>({
    titulo: 'Proposta de Assessoria Tributária',
    cliente_id: '',
    lead_id: '',
    valor_total: 25000,
    validade: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    condicoes: 'Entrada de 30% + Saldo no êxito judicial',
    descricao: 'Levantamento de créditos tributários e recuperação de PIS/COFINS.',
    status: 'enviada',
  })

  const [editFormData, setEditFormData] = useState<Partial<ProposalRecord>>({
    titulo: '',
    cliente_id: '',
    lead_id: '',
    valor_total: 0,
    validade: '',
    condicoes: '',
    descricao: '',
    status: 'enviada',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [pList, tList, lList, cList, sList] = await Promise.all([
        CrmService.getProposals(tenant.id),
        CrmService.getTemplates(tenant.id),
        CrmService.getLeads(tenant.id),
        CrmService.getCustomers(tenant.id),
        CrmService.getServices(tenant.id),
      ])
      setProposals(pList)
      setTemplates(tList)
      setLeads(lList)
      setCustomers(cList)
      setServices(sList)
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
    setSubmitting(true)
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (p: ProposalRecord) => {
    setEditingProposal(p)
    setEditFormData({
      titulo: p.titulo || '',
      cliente_id: p.cliente_id || '',
      lead_id: p.lead_id || '',
      valor_total: p.valor_total || p.valor || 0,
      validade: p.validade ? p.validade.slice(0, 10) : '',
      condicoes: p.condicoes || '',
      descricao: p.descricao || '',
      status: p.status || 'enviada',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProposal?.id || !editFormData.titulo) return
    setSubmitting(true)
    try {
      await pb.collection('proposals').update(editingProposal.id, editFormData)
      toast({ title: 'Proposta atualizada com sucesso!' })
      setEditModalOpen(false)
      setEditingProposal(null)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar proposta', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!proposalToDelete?.id) return
    setSubmitting(true)
    try {
      await pb.collection('proposals').delete(proposalToDelete.id)
      toast({ title: 'Proposta excluída com sucesso!' })
      setDeleteConfirmOpen(false)
      setProposalToDelete(null)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao excluir proposta', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProposals = proposals.filter((p) => {
    const q = searchTerm.toLowerCase()
    const clientName = (p.expand?.lead_id?.name || p.expand?.cliente_id?.name || '').toLowerCase()
    return (p.titulo || '').toLowerCase().includes(q) || clientName.includes(q)
  })

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

      {/* Search Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título da proposta ou nome do cliente..."
            className="pl-9 h-9 text-xs"
          />
        </div>
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
            ) : filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhuma proposta encontrada.
                </td>
              </tr>
            ) : (
              filteredProposals.map((p) => (
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="h-7 text-xs gap-1"
                        title="Editar Proposta"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProposalToDelete(p)
                            setDeleteConfirmOpen(true)
                          }}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          title="Excluir Proposta (Admin)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
                value={formData.titulo || ''}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cliente Vinculado</Label>
                <Select
                  value={formData.cliente_id || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, cliente_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Lead direto</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ou Lead Prospect</Label>
                <Select
                  value={formData.lead_id || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, lead_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={formData.valor_total || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor_total: Number(e.target.value),
                      valor: Number(e.target.value),
                    })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Validade</Label>
                <Input
                  type="date"
                  value={formData.validade || ''}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status da Proposta</Label>
              <Select
                value={formData.status || 'enviada'}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="visualizada">Visualizada</SelectItem>
                  <SelectItem value="aceita">Aceita / Aprovada</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Condições de Pagamento</Label>
              <Input
                value={formData.condicoes || ''}
                onChange={(e) => setFormData({ ...formData, condicoes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Escopo</Label>
              <Textarea
                rows={2}
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0A1F3F] text-white"
              >
                {submitting ? 'Gerando...' : 'Gerar Proposta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Editar Proposta de Honorários
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título *</Label>
              <Input
                required
                value={editFormData.titulo || ''}
                onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cliente Vinculado</Label>
                <Select
                  value={editFormData.cliente_id || 'none'}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, cliente_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Lead direto</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ou Lead Prospect</Label>
                <Select
                  value={editFormData.lead_id || 'none'}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, lead_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={editFormData.valor_total || 0}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      valor_total: Number(e.target.value),
                      valor: Number(e.target.value),
                    })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Validade</Label>
                <Input
                  type="date"
                  value={editFormData.validade || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, validade: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status da Proposta</Label>
              <Select
                value={editFormData.status || 'enviada'}
                onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="visualizada">Visualizada</SelectItem>
                  <SelectItem value="aceita">Aceita / Aprovada</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Condições de Pagamento</Label>
              <Input
                value={editFormData.condicoes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, condicoes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Escopo</Label>
              <Textarea
                rows={2}
                value={editFormData.descricao || ''}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0A1F3F] text-white"
              >
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Proposta de Honorários</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a proposta <strong>{proposalToDelete?.titulo}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default PropostasPage
