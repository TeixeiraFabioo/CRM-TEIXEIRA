import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  FileCheck,
  Eye,
  FileDown,
  Trash2,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { useTenant, useUserRole } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { CustomerRecord } from '@/types/platform'

const ESTADOS_CIVIS = ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável']
const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

type CustomerFormData = Partial<
  Pick<
    CustomerRecord,
    'name' | 'email' | 'phone' | 'document' | 'rg' | 'estado_civil' | 'address' | 'city' | 'state'
  >
>

export function CustomersPage() {
  const { tenant } = useTenant()
  const { role: userRole } = useUserRole()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [togglingCustomerId, setTogglingCustomerId] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)
  const [editFormData, setEditFormData] = useState<CustomerFormData>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const loadCustomers = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const data = await CrmService.getCustomers(tenant.id)
      setCustomers(data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [tenant?.id])

  const handleToggleCustomerActive = async (e: React.MouseEvent, cust: CustomerRecord) => {
    e.stopPropagation()
    const currentActive = cust.active !== false && cust.status !== 'Inativo'
    const newActive = !currentActive
    setTogglingCustomerId(cust.id)

    try {
      await pb.collection('customers').update(cust.id, {
        active: newActive,
        status: newActive ? 'Ativo' : 'Inativo',
      })

      if (tenant?.id) {
        await CrmService.logAudit(
          tenant.id,
          newActive ? 'activate_customer' : 'deactivate_customer',
          'customer',
          cust.id,
          { active: currentActive, status: cust.status },
          { active: newActive, status: newActive ? 'Ativo' : 'Inativo' },
        )
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cust.id
            ? { ...c, active: newActive, status: newActive ? 'Ativo' : 'Inativo' }
            : c,
        ),
      )

      toast({
        title: newActive ? 'Cliente Ativado' : 'Cliente Inativado',
        description: `Status de ${cust.name} atualizado para ${newActive ? 'Ativo' : 'Inativo'}.`,
      })
    } catch (err: any) {
      console.error('Error toggling customer status:', err)
      toast({
        title: 'Erro ao atualizar status do cliente',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setTogglingCustomerId(null)
    }
  }

  const handleDeleteCustomer = async (e: React.MouseEvent, cust: CustomerRecord) => {
    e.stopPropagation()
    const confirmed = window.confirm(
      `Tem certeza que deseja arquivar/enviar para a lixeira o cliente ${cust.name}?`,
    )
    if (!confirmed) return

    try {
      await CrmService.softDeleteCustomer(cust.id)
      toast({
        title: 'Cliente enviado para a lixeira',
        description: `${cust.name} foi arquivado com sucesso.`,
      })
      await loadCustomers()
    } catch (err: any) {
      console.error('Error deleting customer:', err)
      toast({
        title: 'Erro ao arquivar cliente',
        description: err?.message || 'Falha ao arquivar no banco de dados.',
        variant: 'destructive',
      })
    }
  }

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast({ title: 'Nenhum cliente para exportar' })
      return
    }

    // Colunas especificadas: Nome, Documento (CPF/CNPJ), Email, Telefone, Cidade, Estado, Status, Data de Cadastro
    const headers = [
      'Nome',
      'Documento (CPF/CNPJ)',
      'Email',
      'Telefone',
      'Cidade',
      'Estado',
      'Status',
      'Data de Cadastro',
    ]

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""'
      const val = String(str).replace(/"/g, '""')
      return `"${val}"`
    }

    const rows = filteredCustomers.map((c) => {
      const createdDate = c.created
        ? new Date(c.created).toLocaleDateString('pt-BR') +
          ' ' +
          new Date(c.created).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : ''

      return [
        escapeCsv(c.name),
        escapeCsv(c.document),
        escapeCsv(c.email),
        escapeCsv(c.phone),
        escapeCsv(c.city),
        escapeCsv(c.state),
        escapeCsv(c.status || (c.active !== false ? 'Ativo' : 'Inativo')),
        escapeCsv(createdDate),
      ].join(';')
    })

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `clientes_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    if (tenant?.id) {
      CrmService.logAudit(tenant.id, 'export', 'customers', undefined, null, {
        count: filteredCustomers.length,
      })
    }
  }

  const openEditModal = (cust: CustomerRecord) => {
    setEditingCustomer(cust)
    setEditFormData({
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      document: cust.document || '',
      rg: (cust as any).rg || '',
      estado_civil: (cust as any).estado_civil || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
    })
    setEditModalOpen(true)
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return
    if (!editFormData.name || !editFormData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' })
      return
    }
    setSavingEdit(true)
    try {
      await pb.collection('customers').update(editingCustomer.id, { ...editFormData })
      toast({ title: 'Cliente atualizado com sucesso!' })
      setEditModalOpen(false)
      setEditingCustomer(null)
      await loadCustomers()
    } catch (err: any) {
      console.error('Error updating customer:', err)
      toast({
        title: 'Erro ao atualizar cliente',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase()
    const matchesQuery =
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.document || '').includes(q)

    const isCustomerActive = c.active !== false && c.status !== 'Inativo'
    if (statusFilter === 'active') return matchesQuery && isCustomerActive
    if (statusFilter === 'inactive') return matchesQuery && !isCustomerActive
    return matchesQuery
  })

  const activeCustomersCount = customers.filter(
    (c) => c.active !== false && c.status !== 'Inativo',
  ).length
  const inactiveCustomersCount = customers.length - activeCustomersCount

  const totalContracted = customers.reduce(
    (sum, c) => sum + (c.lifetime_value || c.valor_total_contratado || 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Clientes Jurídicos Contratados
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {activeCustomersCount} ativos • {inactiveCustomersCount} inativos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carteira de clientes convertidos com gestão de status, contratos e histórico perpétuo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs"
          >
            <FileDown className="h-4 w-4" /> Exportar CSV
          </Button>

          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold uppercase">
              Receita Total em Carteira
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              R$ {totalContracted.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar & Status Filter */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do cliente, empresa, CPF/CNPJ, e-mail..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-muted/50 p-1 rounded-lg border text-xs">
          <Button
            type="button"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'all' ? 'bg-[#0A1F3F] text-white' : ''}`}
          >
            Todos ({customers.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'active' ? 'bg-emerald-700 text-white' : ''}`}
          >
            Ativos ({activeCustomersCount})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'inactive' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'inactive' ? 'bg-slate-700 text-white' : ''}`}
          >
            Inativos ({inactiveCustomersCount})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Cliente / Titular</th>
                <th className="p-3.5">Empresa / Documento</th>
                <th className="p-3.5">Serviços Contratados</th>
                <th className="p-3.5">Valor Total Contratado</th>
                <th className="p-3.5">Data de Conversão</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Carregando carteira de clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Nenhum cliente contratado encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/clientes/${cust.id}`)}
                  >
                    {/* Name */}
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cust.name}
                      </div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                        {cust.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cust.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company & CPF/CNPJ */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">
                        {cust.company || 'Pessoa Física'}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {cust.document || '—'}
                      </div>
                    </td>

                    {/* Services */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">
                        {Array.isArray(cust.servicos_contratados) &&
                        cust.servicos_contratados.length > 0
                          ? cust.servicos_contratados.join(', ')
                          : 'Assessoria Jurídica Especializada'}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="p-3.5 font-bold text-foreground">
                      R${' '}
                      {Number(
                        cust.lifetime_value || cust.valor_total_contratado || 0,
                      ).toLocaleString('pt-BR')}
                    </td>

                    {/* Conversion Date */}
                    <td className="p-3.5 text-muted-foreground text-[11px] whitespace-nowrap">
                      {cust.data_conversao || cust.created
                        ? new Date(cust.data_conversao || cust.created!).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>

                    {/* Status & Active Switch Toggle */}
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cust.active !== false && cust.status !== 'Inativo'}
                          disabled={togglingCustomerId === cust.id}
                          onCheckedChange={() => {
                            const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent
                            handleToggleCustomerActive(syntheticEvent, cust)
                          }}
                          aria-label="Alternar status do cliente"
                        />
                        <Badge
                          className={
                            cust.active !== false && cust.status !== 'Inativo'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]'
                          }
                        >
                          {cust.active !== false && cust.status !== 'Inativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clientes/${cust.id}`)}
                          className="h-7 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visão 360º
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(cust)}
                          className="h-7 text-xs gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        {userRole === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteCustomer(e, cust)}
                            className="h-7 text-xs gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
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

      {/* MODAL DE EDIÇÃO DE CLIENTE */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome *</Label>
                <Input
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input
                  value={editFormData.phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF/CNPJ</Label>
                <Input
                  value={editFormData.document || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, document: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">RG</Label>
                <Input
                  value={editFormData.rg || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, rg: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado Civil</Label>
                <Select
                  value={editFormData.estado_civil || ''}
                  onValueChange={(val) => setEditFormData({ ...editFormData, estado_civil: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_CIVIS.map((ec) => (
                      <SelectItem key={ec} value={ec}>
                        {ec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Endereço</Label>
                <Input
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  value={editFormData.city || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado (UF)</Label>
                <Select
                  value={editFormData.state || ''}
                  onValueChange={(val) => setEditFormData({ ...editFormData, state: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a UF..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit}
                className="bg-[#0A1F3F] text-white"
              >
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default CustomersPage
