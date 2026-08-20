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
  Tag,
  Eye,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
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
import { LeadRecord, UserRecord, ServiceRecord, EmpresaRecord } from '@/types/platform'

export function LeadsPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [loading, setLoading] = useState(true)

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
      const [leadsData, usersData, servicesData, empresasData] = await Promise.all([
        CrmService.getLeads(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getServices(tenant.id),
        CrmService.getEmpresas(tenant.id),
      ])
      setLeads(leadsData)
      setUsers(usersData)
      setServices(servicesData)
      setEmpresas(empresasData)
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

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast({ title: 'Nenhum lead para exportar' })
      return
    }
    const headers =
      'ID,Nome,Telefone,WhatsApp,Email,Empresa,Origem,Temperatura,Status,Valor Potencial,Data\n'
    const rows = filteredLeads
      .map(
        (l) =>
          `"${l.id}","${l.name}","${l.phone || ''}","${l.whatsapp || ''}","${l.email || ''}","${l.company || ''}","${l.source || l.origem || ''}","${l.temperature || ''}","${l.status || ''}","${l.potential_value || l.valor_potencial || 0}","${l.created || ''}"`,
      )
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `leads_teixeira_nascimento_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                <th className="p-3.5 pl-4">Lead / Contato</th>
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
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    Nenhum lead encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    {/* Name & Contact */}
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {lead.name}
                        {lead.score && lead.score > 70 && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                            Score {lead.score}
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
                      <div className="font-medium text-foreground">
                        {lead.origem || lead.source || 'Meta Ads'}
                      </div>
                      {(lead.campaign || lead.utm_campaign) && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                          {lead.campaign || lead.utm_campaign}
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
                          <DropdownMenuItem
                            onClick={() => handleSoftDelete(lead.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Arquivar Lead
                          </DropdownMenuItem>
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
