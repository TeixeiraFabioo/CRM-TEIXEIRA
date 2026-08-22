import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Search, Plus, Phone, Globe, MapPin, Eye, Trash2, Edit } from 'lucide-react'
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
import { EmpresaRecord } from '@/types/platform'

export function EmpresasPage() {
  const { tenant, userRole, user } = useTenant()
  const isAdmin = userRole === 'admin' || user?.role === 'admin'
  const { toast } = useToast()
  const navigate = useNavigate()

  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [empresaToDelete, setEmpresaToDelete] = useState<EmpresaRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<EmpresaRecord>>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    segmento: 'Transportes & Logística',
    porte: 'Grande Porte',
    endereco: '',
    cidade: 'São Paulo',
    estado: 'SP',
    telefone: '',
    site: '',
    observacoes: '',
  })

  const [editFormData, setEditFormData] = useState<Partial<EmpresaRecord>>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    segmento: '',
    porte: '',
    endereco: '',
    cidade: '',
    estado: '',
    telefone: '',
    site: '',
    observacoes: '',
  })

  const loadEmpresas = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const data = await CrmService.getEmpresas(tenant.id)
      setEmpresas(data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar empresas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmpresas()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.razao_social) return
    setSubmitting(true)
    try {
      await CrmService.createEmpresa(tenant.id, formData)
      toast({ title: 'Empresa cadastrada com sucesso!' })
      setCreateModalOpen(false)
      setFormData({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        segmento: 'Transportes & Logística',
        porte: 'Grande Porte',
        endereco: '',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '',
        site: '',
        observacoes: '',
      })
      loadEmpresas()
    } catch (e: any) {
      toast({ title: 'Erro ao cadastrar empresa', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (emp: EmpresaRecord) => {
    setEditingEmpresa(emp)
    setEditFormData({
      razao_social: emp.razao_social || '',
      nome_fantasia: emp.nome_fantasia || '',
      cnpj: emp.cnpj || '',
      segmento: emp.segmento || 'Geral',
      porte: emp.porte || 'Médio Porte',
      endereco: emp.endereco || '',
      cidade: emp.cidade || '',
      estado: emp.estado || '',
      telefone: emp.telefone || '',
      site: emp.site || '',
      observacoes: emp.observacoes || '',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmpresa?.id || !editFormData.razao_social) return
    setSubmitting(true)
    try {
      await pb.collection('empresas').update(editingEmpresa.id, editFormData)
      toast({ title: 'Empresa atualizada com sucesso!' })
      setEditModalOpen(false)
      setEditingEmpresa(null)
      loadEmpresas()
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar empresa', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!empresaToDelete?.id) return
    setSubmitting(true)
    try {
      await pb.collection('empresas').delete(empresaToDelete.id)
      toast({ title: 'Empresa excluída com sucesso!' })
      setDeleteConfirmOpen(false)
      setEmpresaToDelete(null)
      loadEmpresas()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir empresa', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEmpresas = empresas.filter((emp) => {
    const q = searchTerm.toLowerCase()
    return (
      (emp.razao_social || '').toLowerCase().includes(q) ||
      (emp.nome_fantasia || '').toLowerCase().includes(q) ||
      (emp.cnpj || '').includes(q) ||
      (emp.segmento || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Empresas &amp; Contas B2B
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredEmpresas.length} empresas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mapeamento corporativo de pessoas jurídicas, passivos e contratos.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Empresa B2B
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por Razão Social, Nome Fantasia, CNPJ ou Segmento..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Razão Social / Nome Fantasia</th>
                <th className="p-3.5">CNPJ</th>
                <th className="p-3.5">Segmento</th>
                <th className="p-3.5">Porte</th>
                <th className="p-3.5">Localização</th>
                <th className="p-3.5">Telefone / Site</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Carregando empresas...
                  </td>
                </tr>
              ) : filteredEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                filteredEmpresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground">{emp.razao_social}</div>
                      {emp.nome_fantasia && (
                        <div className="text-[11px] text-muted-foreground">{emp.nome_fantasia}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {emp.cnpj || '—'}
                    </td>
                    <td className="p-3.5">{emp.segmento || 'Geral'}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px]">
                        {emp.porte || 'Médio Porte'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {emp.cidade || 'São Paulo'} {emp.estado ? ` - ${emp.estado}` : ''}
                    </td>
                    <td className="p-3.5">
                      {emp.telefone && <div>{emp.telefone}</div>}
                      {emp.site && (
                        <a
                          href={emp.site}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline text-[10px]"
                        >
                          {emp.site}
                        </a>
                      )}
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(emp)}
                          className="h-7 text-xs gap-1"
                          title="Editar Empresa"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/empresas/${emp.id}`)}
                          className="h-7 text-xs"
                        >
                          Ver Detalhes
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEmpresaToDelete(emp)
                              setDeleteConfirmOpen(true)
                            }}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            title="Excluir Empresa (Admin)"
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
              Cadastrar Empresa B2B
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Razão Social *</Label>
              <Input
                required
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                placeholder="Ex: Confiança Distribuidora de Alimentos S.A."
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Fantasia</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Confiança Alimentos"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Segmento</Label>
                <Input
                  value={formData.segmento}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Porte</Label>
                <Select
                  value={formData.porte}
                  onValueChange={(val) => setFormData({ ...formData, porte: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pequeno Porte">Pequeno Porte</SelectItem>
                    <SelectItem value="Médio Porte">Médio Porte</SelectItem>
                    <SelectItem value="Grande Porte">Grande Porte</SelectItem>
                    <SelectItem value="Multinacional">Multinacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endereço</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Av. Paulista, 1000 - Bela Vista"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="São Paulo"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado (UF)</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Site / Domínio</Label>
                <Input
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  placeholder="https://empresa.com.br"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Passivos</Label>
              <Textarea
                rows={2}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
                {submitting ? 'Salvando...' : 'Salvar Empresa'}
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
              Editar Empresa B2B
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Razão Social *</Label>
              <Input
                required
                value={editFormData.razao_social || ''}
                onChange={(e) => setEditFormData({ ...editFormData, razao_social: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Fantasia</Label>
                <Input
                  value={editFormData.nome_fantasia || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, nome_fantasia: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CNPJ</Label>
                <Input
                  value={editFormData.cnpj || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Segmento</Label>
                <Input
                  value={editFormData.segmento || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, segmento: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Porte</Label>
                <Select
                  value={editFormData.porte || 'Médio Porte'}
                  onValueChange={(val) => setEditFormData({ ...editFormData, porte: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pequeno Porte">Pequeno Porte</SelectItem>
                    <SelectItem value="Médio Porte">Médio Porte</SelectItem>
                    <SelectItem value="Grande Porte">Grande Porte</SelectItem>
                    <SelectItem value="Multinacional">Multinacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endereço</Label>
              <Input
                value={editFormData.endereco || ''}
                onChange={(e) => setEditFormData({ ...editFormData, endereco: e.target.value })}
                placeholder="Av. Paulista, 1000 - Bela Vista"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  value={editFormData.cidade || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, cidade: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado (UF)</Label>
                <Input
                  value={editFormData.estado || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                  maxLength={2}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input
                  value={editFormData.telefone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Site / Domínio</Label>
                <Input
                  value={editFormData.site || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, site: e.target.value })}
                  placeholder="https://empresa.com.br"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Passivos</Label>
              <Textarea
                rows={2}
                value={editFormData.observacoes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
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
            <AlertDialogTitle>Excluir Empresa B2B</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa{' '}
              <strong>{empresaToDelete?.razao_social}</strong>? Esta ação não pode ser desfeita.
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
export default EmpresasPage
