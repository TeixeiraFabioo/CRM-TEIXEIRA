import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Scale,
  FolderKanban,
  CheckCircle2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { ServiceRecord } from '@/types/platform'

const AREAS_JURIDICAS = [
  'Direito Tributário',
  'Direito Bancário',
  'Direito Trabalhista',
  'Direito do Consumidor',
  'Direito Civil / Contratos',
  'Direito Societário / M&A',
  'Direito Previdenciário',
  'Direito Administrativo / Regulatório',
  'Outro',
]

const CATEGORIAS = ['Consultoria', 'Contencioso', 'Assessoria Mensal', 'Parecer', 'Auditoria']

export function ServicosPage() {
  const { tenant, userRole, user } = useTenant()
  const isAdmin = userRole === 'admin' || user?.role === 'admin'
  const { toast } = useToast()

  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<ServiceRecord>>({
    nome: '',
    descricao: '',
    area: 'Direito Tributário',
    categoria: 'Consultoria',
    valor_padrao: 15000,
    status: 'ativo',
  })

  const [editFormData, setEditFormData] = useState<Partial<ServiceRecord>>({
    nome: '',
    descricao: '',
    area: 'Direito Tributário',
    categoria: 'Consultoria',
    valor_padrao: 0,
    status: 'ativo',
  })

  const loadServices = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const data = await CrmService.getServices(tenant.id)
      setServices(data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar catálogo de serviços', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.nome) return
    setSubmitting(true)
    try {
      await pb.collection('services').create({
        tenant_id: tenant.id,
        nome: formData.nome,
        descricao: formData.descricao || '',
        area: formData.area || 'Direito Tributário',
        categoria: formData.categoria || 'Consultoria',
        valor_padrao: Number(formData.valor_padrao) || 0,
        status: formData.status || 'ativo',
      })
      toast({ title: 'Serviço jurídico cadastrado com sucesso!' })
      setCreateModalOpen(false)
      setFormData({
        nome: '',
        descricao: '',
        area: 'Direito Tributário',
        categoria: 'Consultoria',
        valor_padrao: 15000,
        status: 'ativo',
      })
      loadServices()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar serviço', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (srv: ServiceRecord) => {
    setEditingService(srv)
    setEditFormData({
      nome: srv.nome || '',
      descricao: srv.descricao || '',
      area: srv.area || 'Direito Tributário',
      categoria: srv.categoria || 'Consultoria',
      valor_padrao: srv.valor_padrao || 0,
      status: srv.status || 'ativo',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingService?.id || !editFormData.nome) return
    setSubmitting(true)
    try {
      await pb.collection('services').update(editingService.id, {
        nome: editFormData.nome,
        descricao: editFormData.descricao || '',
        area: editFormData.area || 'Direito Tributário',
        categoria: editFormData.categoria || 'Consultoria',
        valor_padrao: Number(editFormData.valor_padrao) || 0,
        status: editFormData.status || 'ativo',
      })
      toast({ title: 'Serviço atualizado com sucesso!' })
      setEditModalOpen(false)
      setEditingService(null)
      loadServices()
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar serviço', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!serviceToDelete?.id) return
    setSubmitting(true)
    try {
      await pb.collection('services').delete(serviceToDelete.id)
      toast({ title: 'Serviço excluído com sucesso!' })
      setDeleteConfirmOpen(false)
      setServiceToDelete(null)
      loadServices()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir serviço', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredServices = services.filter((s) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      (s.nome || '').toLowerCase().includes(q) ||
      (s.descricao || '').toLowerCase().includes(q) ||
      (s.area || '').toLowerCase().includes(q) ||
      (s.categoria || '').toLowerCase().includes(q)

    const matchesArea = selectedArea === 'all' || s.area === selectedArea
    return matchesSearch && matchesArea
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Catálogo de Serviços Jurídicos
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredServices.length} serviços
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Portfólio de teses, consultorias e produtos jurídicos com precificação padrão.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do serviço, descrição ou categoria..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filtrar por área..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas jurídicas</SelectItem>
              {AREAS_JURIDICAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Nome do Serviço</th>
                <th className="p-3.5">Área do Direito</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Preço Base (R$)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando catálogo de serviços...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Nenhum serviço jurídico encontrado.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground">{srv.nome}</div>
                      {srv.descricao && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md mt-0.5">
                          {srv.descricao}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[11px]">
                        {srv.area || 'Geral'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {srv.categoria || 'Consultoria'}
                    </td>
                    <td className="p-3.5 font-bold text-foreground">
                      R${' '}
                      {Number(srv.valor_padrao || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={
                          srv.status === 'ativo'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {srv.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(srv)}
                          className="h-7 text-xs gap-1"
                          title="Editar Serviço"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setServiceToDelete(srv)
                              setDeleteConfirmOpen(true)
                            }}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            title="Excluir Serviço (Admin)"
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
      </div>

      {/* CREATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Cadastrar Novo Serviço Jurídico
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Serviço *</Label>
              <Input
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Recuperação de Créditos de PIS/COFINS"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Área do Direito *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(val) => setFormData({ ...formData, area: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS_JURIDICAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Preço Base / Honorários Padrão (R$)</Label>
                <Input
                  type="number"
                  value={formData.valor_padrao}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_padrao: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição / Escopo do Serviço</Label>
              <Textarea
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhe os entregáveis, teses aplicáveis e benefícios para o cliente..."
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
                {submitting ? 'Salvando...' : 'Salvar Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Editar Serviço Jurídico
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Serviço *</Label>
              <Input
                required
                value={editFormData.nome || ''}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Área do Direito *</Label>
                <Select
                  value={editFormData.area || 'Direito Tributário'}
                  onValueChange={(val) => setEditFormData({ ...editFormData, area: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS_JURIDICAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select
                  value={editFormData.categoria || 'Consultoria'}
                  onValueChange={(val) => setEditFormData({ ...editFormData, categoria: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Preço Base / Honorários Padrão (R$)</Label>
                <Input
                  type="number"
                  value={editFormData.valor_padrao || 0}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, valor_padrao: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={editFormData.status || 'ativo'}
                  onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição / Escopo do Serviço</Label>
              <Textarea
                rows={3}
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
            <AlertDialogTitle>Excluir Serviço Jurídico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço <strong>{serviceToDelete?.nome}</strong> do
              catálogo? Esta ação não pode ser desfeita.
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

export default ServicosPage
