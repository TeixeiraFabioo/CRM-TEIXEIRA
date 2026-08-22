import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Flame,
  Phone,
  Mail,
  Building2,
  Calendar,
  MoreHorizontal,
  FileDown,
  Tag as TagIcon,
  Eye,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import {
  LeadRecord,
  UserRecord,
  ServiceRecord,
  EmpresaRecord,
  SlaConfigRecord,
  TagRecord,
} from '@/types/platform'

export function LeadsPage() {
  const { tenant, userRole } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Soft-delete (archive) is admin-only per the RBAC contract — gestores and
  // advogados never see the button.
  const isAdmin = userRole === 'admin'

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [slaConfig, setSlaConfig] = useState<SlaConfigRecord | null>(null)
  const [leadsWithMessages, setLeadsWithMessages] = useState<Set<string>>(new Set())
  const [tags, setTags] = useState<TagRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Mass action dialogs & state
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedBulkStatus, setSelectedBulkStatus] = useState('Novo Lead')
  const [bulkDeleteAlertOpen, setBulkDeleteAlertOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [temperatureFilter, setTemperatureFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [responsibleFilter, setResponsibleFilter] = useState('all')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<LeadRecord>>({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    company: '',
    position: '',
    city: '',
    estado: 'SP',
    cpf_cnpj: '',
    pessoa_fisica_juridica: 'PJ',
    source: 'Meta Ads',
    temperature: 'hot',
    status: 'Novo Lead',
    service: 'Recuperação Tributária e Teses Fiscais',
    potential_value: 25000,
    observacoes: '',
  })

  // Selected leads for mass actions
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  useEffect(() => {
    if (searchParams.get('novo') === 'true') {
      setCreateModalOpen(true)
      searchParams.delete('novo')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams])

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [leadsData, usersData, servicesData, empresasData, slaData, messagesMap, tagsData] =
        await Promise.all([
          CrmService.getLeads(tenant.id),
          CrmService.getUsers(tenant.id),
          CrmService.getServices(tenant.id),
          CrmService.getEmpresas(tenant.id),
          CrmService.getActiveSlaConfig(tenant.id),
          CrmService.getLeadsWithMessagesMap(tenant.id),
          CrmService.getTags(tenant.id),
        ])
      setLeads(leadsData)
      setUsers(usersData)
      setServices(servicesData)
      setEmpresas(empresasData)
      setSlaConfig(slaData)
      setLeadsWithMessages(messagesMap)
      setTags(tagsData)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  // Duplicate detection on form changes
  const checkDuplicates = (phoneOrEmail: string) => {
    if (!phoneOrEmail || phoneOrEmail.length < 5) {
      setDuplicateWarning(null)
      return
    }
    const clean = phoneOrEmail.toLowerCase().replace(/\D/g, '')
    const match = leads.find((l) => {
      const lPhone = (l.phone || l.whatsapp || '').replace(/\D/g, '')
      const lEmail = (l.email || '').toLowerCase()
      return (
        (clean.length > 7 && lPhone.includes(clean)) ||
        (lEmail && lEmail === phoneOrEmail.toLowerCase())
      )
    })
    if (match) {
      setDuplicateWarning(
        `Possível duplicidade detectada com o lead: "${match.name}" (${match.email || match.phone})`,
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!formData.name?.trim()) {
      toast({ title: 'O nome do lead é obrigatório', variant: 'destructive' })
      return
    }

    try {
      const newLead = await CrmService.createLead(tenant.id, formData)
      toast({ title: 'Lead jurídico cadastrado com sucesso!' })
      setCreateModalOpen(false)
      setFormData({
        name: '',
        phone: '',
        whatsapp: '',
        email: '',
        company: '',
        position: '',
        city: '',
        estado: 'SP',
        cpf_cnpj: '',
        pessoa_fisica_juridica: 'PJ',
        source: 'Meta Ads',
        temperature: 'hot',
        status: 'Novo Lead',
        service: 'Recuperação Tributária e Teses Fiscais',
        potential_value: 25000,
        observacoes: '',
      })
      setDuplicateWarning(null)
      await loadData()
      navigate(`/leads/${newLead.id}`)
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro ao criar lead', description: err.message, variant: 'destructive' })
    }
  }

  const handleSoftDelete = async (id: string) => {
    try {
      await CrmService.softDeleteLead(id)
      toast({ title: 'Lead arquivado com sucesso' })
      await loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao arquivar lead', variant: 'destructive' })
    }
  }

  // Mass actions handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map((l) => l.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return
    setBulkActionLoading(true)
    try {
      await Promise.all(selectedLeads.map((id) => pb.collection('leads').delete(id)))
      toast({
        title: `${selectedLeads.length} ${selectedLeads.length === 1 ? 'lead excluído' : 'leads excluídos'} com sucesso!`,
      })
      if (tenant?.id) {
        await CrmService.logAudit(tenant.id, 'bulk_delete', 'leads', undefined, null, {
          count: selectedLeads.length,
          ids: selectedLeads,
        })
      }
      setSelectedLeads([])
      setBulkDeleteAlertOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao excluir leads em lote',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkReassign = async () => {
    if (selectedLeads.length === 0 || !selectedAssignee) return
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedLeads.map((id) =>
          pb.collection('leads').update(id, {
            assigned_to: selectedAssignee,
            responsavel_id: selectedAssignee,
          }),
        ),
      )
      toast({
        title: `${selectedLeads.length} leads reatribuídos com sucesso!`,
      })
      if (tenant?.id) {
        await CrmService.logAudit(tenant.id, 'bulk_reassign', 'leads', undefined, null, {
          count: selectedLeads.length,
          assigned_to: selectedAssignee,
        })
      }
      setSelectedLeads([])
      setReassignModalOpen(false)
      setSelectedAssignee('')
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao reatribuir leads em lote',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkApplyTag = async () => {
    if (selectedLeads.length === 0 || !selectedTagId) return
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedLeads.map(async (id) => {
          const lead = leads.find((l) => l.id === id)
          const currentTags = Array.isArray(lead?.tags) ? lead.tags : []
          if (!currentTags.includes(selectedTagId)) {
            const nextTags = [...currentTags, selectedTagId]
            return pb.collection('leads').update(id, { tags: nextTags })
          }
          return Promise.resolve()
        }),
      )
      toast({
        title: `Tag aplicada a ${selectedLeads.length} leads com sucesso!`,
      })
      if (tenant?.id) {
        await CrmService.logAudit(tenant.id, 'bulk_tag', 'leads', undefined, null, {
          count: selectedLeads.length,
          tag_id: selectedTagId,
        })
      }
      setSelectedLeads([])
      setTagModalOpen(false)
      setSelectedTagId('')
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao aplicar tag em lote',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkChangeStatus = async () => {
    if (selectedLeads.length === 0 || !selectedBulkStatus) return
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedLeads.map((id) =>
          pb.collection('leads').update(id, {
            status: selectedBulkStatus,
          }),
        ),
      )
      toast({
        title: `Status de ${selectedLeads.length} leads atualizado para "${selectedBulkStatus}"!`,
      })
      if (tenant?.id) {
        await CrmService.logAudit(tenant.id, 'bulk_status_change', 'leads', undefined, null, {
          count: selectedLeads.length,
          status: selectedBulkStatus,
        })
      }
      setSelectedLeads([])
      setStatusModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao alterar status em lote',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast({ title: 'Nenhum lead para exportar' })
      return
    }
    // Colunas especificadas: Nome, Empresa, Email, Telefone, Origem, Status, Temperatura, Responsável, Data de Criação
    const headers = [
      'Nome',
      'Empresa',
      'Email',
      'Telefone',
      'Origem',
      'Status',
      'Temperatura',
      'Responsável',
      'Data de Criação',
    ]

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""'
      const val = String(str).replace(/"/g, '""')
      return `"${val}"`
    }

    const rows = filteredLeads.map((l) => {
      const respName =
        l.expand?.assigned_to?.name || l.expand?.responsavel_id?.name || 'Não atribuído'
      const createdDate = l.created
        ? new Date(l.created).toLocaleDateString('pt-BR') +
          ' ' +
          new Date(l.created).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : ''

      return [
        escapeCsv(l.name),
        escapeCsv(l.company),
        escapeCsv(l.email),
        escapeCsv(l.phone || l.whatsapp),
        escapeCsv(l.source || l.origem),
        escapeCsv(l.status),
        escapeCsv(l.temperature),
        escapeCsv(respName),
        escapeCsv(createdDate),
      ].join(';')
    })

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `leads_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    if (tenant?.id) {
      CrmService.logAudit(tenant.id, 'export', 'leads', undefined, null, {
        count: filteredLeads.length,
      })
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone || '').includes(searchTerm) ||
      (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.service || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTemp =
      temperatureFilter === 'all' ||
      lead.temperature === temperatureFilter ||
      (temperatureFilter === 'hot' && lead.temperature === 'quente') ||
      (temperatureFilter === 'warm' && lead.temperature === 'morno') ||
      (temperatureFilter === 'cold' && lead.temperature === 'frio')

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource =
      sourceFilter === 'all' || lead.source === sourceFilter || lead.origem === sourceFilter
    const matchesResp =
      responsibleFilter === 'all' ||
      lead.assigned_to === responsibleFilter ||
      lead.responsavel_id === responsibleFilter

    return matchesSearch && matchesTemp && matchesStatus && matchesSource && matchesResp
  })

  const isSlaViolated = (lead: LeadRecord) => {
    if (!slaConfig) return false
    const isActive = slaConfig.is_active !== false && slaConfig.ativo !== false
    if (!isActive) return false

    const slaMinutes = slaConfig.first_response_minutes ?? slaConfig.tempo_resposta_minutos ?? 15
    if (!lead.created) return false

    const leadCreatedTime = new Date(lead.created).getTime()
    const now = Date.now()
    const elapsedMinutes = (now - leadCreatedTime) / (1000 * 60)

    const hasMessage = leadsWithMessages.has(lead.id)
    return elapsedMinutes > slaMinutes && !hasMessage
  }

  const getTemperatureBadge = (temp?: string) => {
    switch (temp) {
      case 'hot':
      case 'quente':
      case 'muito_quente':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
            <Flame className="h-3 w-3" /> Quente
          </Badge>
        )
      case 'warm':
      case 'morno':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Morno
          </Badge>
        )
      case 'cold':
      case 'frio':
      default:
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
            Frio
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Leads Jurídicos
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredLeads.length} leads
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão completa de captação de clientes, qualificação e histórico comercial 360º.
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
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Lead Jurídico
          </Button>
        </div>
      </div>

      {/* Barra de Ações em Massa */}
      {selectedLeads.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5">
              {selectedLeads.length}{' '}
              {selectedLeads.length === 1 ? 'lead selecionado' : 'leads selecionados'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLeads([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" /> Limpar seleção
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mudar Status */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(true)}
              className="h-8 text-xs gap-1.5 bg-background shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Mudar Status
            </Button>

            {/* Aplicar Tag */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTagModalOpen(true)}
              className="h-8 text-xs gap-1.5 bg-background shadow-xs"
            >
              <TagIcon className="h-3.5 w-3.5 text-amber-600" /> Aplicar Tag
            </Button>

            {/* Reatribuir (admin/gestor) */}
            {(isAdmin || userRole === 'gestor') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReassignModalOpen(true)}
                className="h-8 text-xs gap-1.5 bg-background shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Reatribuir
              </Button>
            )}

            {/* Excluir em Lote (admin only) */}
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteAlertOpen(true)}
                className="h-8 text-xs gap-1.5 shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir ({selectedLeads.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email, telefone, empresa ou serviço..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Temperatura */}
          <div>
            <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Temperaturas</SelectItem>
                <SelectItem value="hot">🔥 Quente / Muito Quente</SelectItem>
                <SelectItem value="warm">⚡ Morno</SelectItem>
                <SelectItem value="cold">❄️ Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origem */}
          <div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="Meta Ads">Meta Ads (Instagram/FB)</SelectItem>
                <SelectItem value="Google Ads">Google Ads</SelectItem>
                <SelectItem value="landing_page">Landing Page Institucional</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Site">Site / Formulário</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp Direto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Novo Lead">Novo Lead</SelectItem>
                <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                <SelectItem value="Qualificado">Qualificado</SelectItem>
                <SelectItem value="Oportunidade Criada">Oportunidade Criada</SelectItem>
                <SelectItem value="Convertido / Ganho">Convertido / Ganho</SelectItem>
                <SelectItem value="Perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-10 text-center">
                  <Checkbox
                    checked={
                      filteredLeads.length > 0 &&
                      filteredLeads.every((l) => selectedLeads.includes(l.id))
                    }
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Selecionar todos os leads"
                  />
                </th>
                <th className="p-3.5">Lead / Contato</th>
                <th className="p-3.5">Origem / Campanha</th>
                <th className="p-3.5">Serviço Jurídico</th>
                <th className="p-3.5">Temperatura</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Valor Potencial</th>
                <th className="p-3.5">Responsável</th>
                <th className="p-3.5">Data de Entrada</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    Nenhum lead encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                      selectedLeads.includes(lead.id) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    {/* Checkbox */}
                    <td
                      className="p-3.5 pl-4 w-10 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => handleToggleSelect(lead.id)}
                        aria-label={`Selecionar lead ${lead.name}`}
                      />
                    </td>

                    {/* Name & Contact */}
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                        <span>{lead.name}</span>
                        {lead.score && lead.score > 70 && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                            Score {lead.score}
                          </span>
                        )}
                        {isSlaViolated(lead) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                            <AlertCircle className="h-2.5 w-2.5" /> SLA Violado
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                        {lead.phone || lead.whatsapp ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {lead.whatsapp || lead.phone}
                          </span>
                        ) : null}
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </span>
                        )}
                      </div>
                      {lead.company && (
                        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {lead.company}
                        </div>
                      )}
                    </td>

                    {/* Origem */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                        <span>
                          {lead.origem === 'landing_page' || lead.source === 'landing_page'
                            ? 'Landing Page'
                            : lead.origem || lead.source || 'Meta Ads'}
                        </span>
                        {(lead.origem === 'landing_page' || lead.source === 'landing_page') && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                            Web
                          </span>
                        )}
                      </div>
                      {(lead.utm_source || lead.utm_campaign || lead.campaign) && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5 font-mono">
                          {lead.utm_source
                            ? `utm: ${lead.utm_source}`
                            : lead.campaign || lead.utm_campaign}
                        </div>
                      )}
                    </td>

                    {/* Serviço */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">
                        {lead.service || lead.area || 'Consultoria Jurídica'}
                      </div>
                    </td>

                    {/* Temperatura */}
                    <td className="p-3.5">{getTemperatureBadge(lead.temperature)}</td>

                    {/* Status */}
                    <td className="p-3.5">
                      <Badge variant="outline" className="font-medium text-[11px]">
                        {lead.status || 'Novo Lead'}
                      </Badge>
                    </td>

                    {/* Valor */}
                    <td className="p-3.5 font-semibold text-foreground">
                      {lead.potential_value || lead.valor_potencial
                        ? `R$ ${Number(lead.potential_value || lead.valor_potencial).toLocaleString('pt-BR')}`
                        : '—'}
                    </td>

                    {/* Responsável */}
                    <td className="p-3.5 text-muted-foreground">
                      {lead.expand?.assigned_to?.name ||
                        lead.expand?.responsavel_id?.name ||
                        'Não atribuído'}
                    </td>

                    {/* Data */}
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap text-[11px]">
                      {lead.created
                        ? new Date(lead.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Visão 360º Lead
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleSoftDelete(lead.id)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Arquivar Lead
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIÁLOGO: REATRIBUIR EM LOTE */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Reatribuir Leads em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Selecione o advogado ou consultor que assumirá os{' '}
              <strong className="text-foreground">{selectedLeads.length}</strong> leads
              selecionados.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo Responsável</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um usuário do escritório..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassignModalOpen(false)}
              disabled={bulkActionLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkReassign}
              disabled={!selectedAssignee || bulkActionLoading}
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600"
            >
              {bulkActionLoading ? 'Reatribuindo...' : 'Confirmar Reatribuição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: APLICAR TAG EM LOTE */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Aplicar Tag em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Selecione a etiqueta a ser adicionada aos{' '}
              <strong className="text-foreground">{selectedLeads.length}</strong> leads
              selecionados.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tag</Label>
              <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione uma tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: t.cor || '#3b82f6' }}
                        />
                        {t.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTagModalOpen(false)}
              disabled={bulkActionLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApplyTag}
              disabled={!selectedTagId || bulkActionLoading}
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600"
            >
              {bulkActionLoading ? 'Aplicando...' : 'Aplicar Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: MUDAR STATUS EM LOTE */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Mudar Status em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Atualize a fase do funil para os{' '}
              <strong className="text-foreground">{selectedLeads.length}</strong> leads
              selecionados.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo Status</Label>
              <Select value={selectedBulkStatus} onValueChange={setSelectedBulkStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo Lead">Novo Lead</SelectItem>
                  <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="Qualificado">Qualificado</SelectItem>
                  <SelectItem value="Oportunidade Criada">Oportunidade Criada</SelectItem>
                  <SelectItem value="Convertido / Ganho">Convertido / Ganho</SelectItem>
                  <SelectItem value="Perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
              disabled={bulkActionLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkChangeStatus}
              disabled={bulkActionLoading}
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600"
            >
              {bulkActionLoading ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: EXCLUIR EM LOTE */}
      <AlertDialog open={bulkDeleteAlertOpen} onOpenChange={setBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Excluir {selectedLeads.length}{' '}
              {selectedLeads.length === 1 ? 'Lead' : 'Leads'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza de que deseja excluir permanentemente os {selectedLeads.length} leads
              selecionados? Esta ação removerá os registros do banco de dados e não poderá ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {bulkActionLoading ? 'Excluindo...' : 'Sim, Excluir Leads'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CREATE LEAD MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-legal-serif">
              Cadastrar Novo Lead Jurídico
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
            {duplicateWarning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Completo / Contato *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Dr. Roberto Alencar"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WhatsApp / Telefone Principal *</Label>
                <Input
                  required
                  value={formData.whatsapp || formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, whatsapp: e.target.value, phone: e.target.value })
                    checkDuplicates(e.target.value)
                  }}
                  placeholder="(11) 98765-4321"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail Corporativo</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    checkDuplicates(e.target.value)
                  }}
                  placeholder="contato@empresa.com.br"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Empresa / Razão Social</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Ex: Alencar Logística S.A."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF ou CNPJ</Label>
                <Input
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Pessoa</Label>
                <Select
                  value={formData.pessoa_fisica_juridica}
                  onValueChange={(val: 'PF' | 'PJ') =>
                    setFormData({ ...formData, pessoa_fisica_juridica: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                    <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Origem do Lead</Label>
                <Select
                  value={formData.source || formData.origem}
                  onValueChange={(val) => setFormData({ ...formData, source: val, origem: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meta Ads">Meta Ads (Instagram &amp; Facebook)</SelectItem>
                    <SelectItem value="Google Ads">Google Ads (Pesquisa &amp; Display)</SelectItem>
                    <SelectItem value="Indicação">Indicação de Cliente / Parceiro</SelectItem>
                    <SelectItem value="Site">Site Institucional / Landing Page</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp Comercial</SelectItem>
                    <SelectItem value="Outro">Outro Canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Temperatura</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(val: any) => setFormData({ ...formData, temperature: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Quente (Interesse Imediato)</SelectItem>
                    <SelectItem value="warm">⚡ Morno (Em Avaliação)</SelectItem>
                    <SelectItem value="cold">❄️ Frio (Topo de Funil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Serviço de Interesse</Label>
                <Select
                  value={formData.service}
                  onValueChange={(val) => setFormData({ ...formData, service: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.nome}>
                        {s.nome} ({s.area})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Potencial Estimado (R$)</Label>
                <Input
                  type="number"
                  value={formData.potential_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      potential_value: Number(e.target.value),
                      valor_potencial: Number(e.target.value),
                    })
                  }
                  placeholder="25000"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Responsável / Advogado</Label>
                <Select
                  value={formData.assigned_to || formData.responsavel_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, assigned_to: val, responsavel_id: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um advogado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cidade / Estado</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                    className="h-9 text-xs flex-1"
                  />
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="SP"
                    className="h-9 text-xs w-16 uppercase"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Detalhes do Caso</Label>
              <Textarea
                rows={3}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Detalhes sobre a demanda jurídica, histórico inicial..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600"
              >
                Salvar e Abrir Lead 360º
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default LeadsPage
