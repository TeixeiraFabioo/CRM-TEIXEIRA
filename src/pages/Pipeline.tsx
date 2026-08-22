import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Kanban as KanbanIcon,
  Plus,
  Filter,
  Search,
  List,
  Flame,
  User,
  ArrowRight,
  TrendingUp,
  Target,
  DollarSign,
  Briefcase,
  CheckCircle2,
  FileSignature,
  Send,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  OpportunityRecord,
  PipelineStageRecord,
  PipelineRecord,
  UserRecord,
  LeadRecord,
  ContractRecord,
} from '@/types/platform'

export function PipelinePage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [pipelines, setPipelines] = useState<PipelineRecord[]>([])
  const [currentPipeline, setCurrentPipeline] = useState<PipelineRecord | null>(null)
  const [stages, setStages] = useState<PipelineStageRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingContractId, setSendingContractId] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [temperatureFilter, setTemperatureFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [targetStageId, setTargetStageId] = useState<string>('')
  const [formData, setFormData] = useState<Partial<OpportunityRecord>>({
    title: '',
    value: 20000,
    servico: 'Recuperação Tributária e Teses Fiscais',
    probabilidade: 50,
    lead_id: '',
    assigned_to: '',
  })

  // Drag state
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null)

  const loadPipelineData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [pipeList, oppList, userList, leadList, contractList] = await Promise.all([
        CrmService.getPipelines(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getLeads(tenant.id),
        CrmService.getContracts(tenant.id),
      ])

      setPipelines(pipeList)
      setOpportunities(oppList)
      setUsers(userList)
      setLeads(leadList)
      setContracts(contractList)

      const activePipe = pipeList.find((p) => p.is_default) || pipeList[0]
      if (activePipe) {
        setCurrentPipeline(activePipe)
        const stageList = await CrmService.getStages(activePipe.id)
        setStages(stageList)
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar Pipeline', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPipelineData()
  }, [tenant?.id])

  useEffect(() => {
    if (searchParams.get('nova') === 'true') {
      setCreateModalOpen(true)
      searchParams.delete('nova')
      setSearchParams(searchParams)
    }
  }, [searchParams, setSearchParams])

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.title) return
    try {
      const stageToUse = targetStageId || stages[0]?.id
      await CrmService.createOpportunity(tenant.id, {
        ...formData,
        pipeline_id: currentPipeline?.id,
        funil_id: currentPipeline?.id,
        stage_id: stageToUse,
        etapa_id: stageToUse,
        status: 'open',
      })
      toast({ title: 'Oportunidade adicionada ao Kanban com sucesso!' })
      setCreateModalOpen(false)
      setFormData({
        title: '',
        value: 20000,
        servico: 'Recuperação Tributária e Teses Fiscais',
        probabilidade: 50,
        lead_id: '',
        assigned_to: '',
      })
      loadPipelineData()
    } catch (err: any) {
      toast({ title: 'Erro ao criar oportunidade', variant: 'destructive' })
    }
  }

  // Verifica se o estágio corresponde a Contrato ou Proposta Aceita
  const isContractStage = (stageName?: string, stageProb?: number) => {
    if (!stageName) return false
    const n = stageName.toLowerCase()
    return (
      n.includes('contrato') ||
      n.includes('negociação') ||
      n.includes('proposta aceita') ||
      n.includes('fechamento') ||
      (stageProb !== undefined && stageProb >= 85 && stageProb < 100)
    )
  }

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedOppId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStageId: string) => {
    e.preventDefault()
    const oppId = draggedOppId || e.dataTransfer.getData('text/plain')
    if (!oppId) return

    const targetStage = stages.find((s) => s.id === newStageId)
    const targetOpp = opportunities.find((o) => o.id === oppId)

    // Optimistic UI update
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, stage_id: newStageId, etapa_id: newStageId } : o)),
    )

    try {
      await CrmService.updateOpportunity(oppId, {
        stage_id: newStageId,
        etapa_id: newStageId,
      })

      // Se moveu para etapa de Contrato / Proposta Aceita, dispara criação de contrato vinculado
      if (tenant?.id && targetStage && isContractStage(targetStage.name, targetStage.probability)) {
        // Verificar se já existe contrato para essa oportunidade
        const existing = contracts.find((c) => c.oportunidade_id === oppId)
        if (!existing) {
          const createdContract = await CrmService.createContract(tenant.id, {
            oportunidade_id: oppId,
            cliente_id: targetOpp?.customer_id || targetOpp?.cliente_id,
            titulo: `Contrato de Honorários - ${targetOpp?.title || 'Novo Negócio'}`,
            valor: targetOpp?.value || 20000,
            status: 'aguardando',
            sign_status: 'pending',
            plataforma: 'zapsign',
            sign_provider: 'zapsign',
          })
          setContracts((prev) => [createdContract, ...prev])
          toast({
            title: 'Contrato gerado automaticamente!',
            description: 'Pronto para disparo e assinatura eletrônica via ZapSign.',
          })
        }
      }

      toast({ title: 'Etapa da oportunidade atualizada!' })
    } catch (err) {
      toast({ title: 'Erro ao mover oportunidade', variant: 'destructive' })
      loadPipelineData()
    } finally {
      setDraggedOppId(null)
    }
  }

  // Disparo manual/direto de envio para ZapSign
  const handleSendContract = async (
    e: React.MouseEvent,
    opp: OpportunityRecord,
    contract?: ContractRecord,
  ) => {
    e.stopPropagation()
    if (!tenant?.id) return

    let targetContract = contract
    setSendingContractId(opp.id)

    try {
      // Se ainda não existir contrato, criar antes
      if (!targetContract) {
        targetContract = await CrmService.createContract(tenant.id, {
          oportunidade_id: opp.id,
          cliente_id: opp.customer_id || opp.cliente_id,
          titulo: `Contrato de Honorários - ${opp.title}`,
          valor: opp.value || 20000,
          status: 'aguardando',
          sign_status: 'pending',
          plataforma: 'zapsign',
          sign_provider: 'zapsign',
        })
      }

      // Atualizar sign_status para 'sent' — isso dispara o hook do backend que integra com ZapSign
      const updated = await CrmService.sendContractForSignature(targetContract.id)

      // Atualizar lista local
      setContracts((prev) => {
        const filtered = prev.filter((c) => c.id !== updated.id)
        return [updated, ...filtered]
      })

      toast({
        title: 'Enviado para assinatura!',
        description: 'Documento gerado e enviado para assinatura eletrônica via ZapSign.',
      })

      // Recarrega em 2 segundos para sincronizar o sign_link criado pelo backend hook
      setTimeout(() => {
        loadPipelineData()
      }, 2000)
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar para assinatura',
        description: err?.message || 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setSendingContractId(null)
    }
  }

  const activeFiltersCount = [
    searchTerm ? 1 : 0,
    userFilter !== 'all' ? 1 : 0,
    temperatureFilter !== 'all' ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
    sourceFilter !== 'all' ? 1 : 0,
    startDateFilter ? 1 : 0,
    endDateFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearAllFilters = () => {
    setSearchTerm('')
    setUserFilter('all')
    setTemperatureFilter('all')
    setStatusFilter('all')
    setSourceFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
  }

  // Filtragem no frontend aplicando os filtros de busca, temperatura, status, origem, responsável e intervalo de data de criação
  const filteredOpps = opportunities.filter((opp) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      (opp.title || '').toLowerCase().includes(q) ||
      (opp.servico || '').toLowerCase().includes(q) ||
      (opp.expand?.lead_id?.name || '').toLowerCase().includes(q) ||
      (opp.expand?.lead_id?.email || '').toLowerCase().includes(q) ||
      (opp.expand?.lead_id?.phone || '').includes(searchTerm) ||
      (opp.expand?.lead_id?.company || '').toLowerCase().includes(q) ||
      (opp.expand?.cliente_id?.name || '').toLowerCase().includes(q) ||
      (opp.expand?.customer_id?.name || '').toLowerCase().includes(q)

    const matchesUser =
      userFilter === 'all' ||
      opp.assigned_to === userFilter ||
      opp.responsavel_id === userFilter ||
      opp.expand?.lead_id?.assigned_to === userFilter ||
      opp.expand?.lead_id?.responsavel_id === userFilter

    // Filtro de temperatura (copiado/adaptado de Leads.tsx)
    const oppTemp = opp.expand?.lead_id?.temperature
    const matchesTemp =
      temperatureFilter === 'all' ||
      oppTemp === temperatureFilter ||
      (temperatureFilter === 'hot' && (oppTemp === 'quente' || oppTemp === 'muito_quente')) ||
      (temperatureFilter === 'warm' && oppTemp === 'morno') ||
      (temperatureFilter === 'cold' && oppTemp === 'frio')

    // Filtro de status (copiado/adaptado de Leads.tsx)
    const leadStatus = opp.expand?.lead_id?.status
    const oppStatus = opp.status
    const matchesStatus =
      statusFilter === 'all' ||
      leadStatus === statusFilter ||
      (statusFilter === 'Novo Lead' && (!leadStatus || leadStatus === 'Novo Lead')) ||
      (statusFilter === 'Convertido / Ganho' && (oppStatus === 'won' || oppStatus === 'ganha')) ||
      (statusFilter === 'Perdido' && (oppStatus === 'lost' || oppStatus === 'perdida'))

    // Filtro de origem (copiado/adaptado de Leads.tsx)
    const leadSource = opp.expand?.lead_id?.source || opp.expand?.lead_id?.origem || opp.origem
    const matchesSource =
      sourceFilter === 'all' ||
      leadSource === sourceFilter ||
      (sourceFilter === 'landing_page' && (leadSource === 'landing_page' || leadSource === 'Site'))

    // Filtro de intervalo de data de criação (de / até) pelo campo created
    const createdDateStr = opp.expand?.lead_id?.created || opp.created
    let matchesDate = true
    if (createdDateStr) {
      const createdDate = new Date(createdDateStr)
      if (startDateFilter) {
        const start = new Date(`${startDateFilter}T00:00:00`)
        if (createdDate < start) matchesDate = false
      }
      if (endDateFilter) {
        const end = new Date(`${endDateFilter}T23:59:59.999`)
        if (createdDate > end) matchesDate = false
      }
    } else if (startDateFilter || endDateFilter) {
      matchesDate = false
    }

    return (
      matchesSearch && matchesUser && matchesTemp && matchesStatus && matchesSource && matchesDate
    )
  })

  const totalPipelineValue = filteredOpps.reduce((sum, o) => sum + (o.value || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Pipeline Comercial Jurídico
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredOpps.length} em aberto
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão visual por etapas de qualificação, propostas e negociação de contratos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-primary block font-semibold uppercase">
              Volume no Funil
            </span>
            <span className="text-sm font-bold text-foreground">
              R$ {totalPipelineValue.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex bg-muted rounded-lg p-0.5 border">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2.5 text-xs"
            >
              <KanbanIcon className="h-3.5 w-3.5 mr-1" /> Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2.5 text-xs"
            >
              <List className="h-3.5 w-3.5 mr-1" /> Lista
            </Button>
          </div>

          <Button
            onClick={() => {
              setTargetStageId(stages[0]?.id || '')
              setCreateModalOpen(true)
            }}
            className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
        {/* Row 1: Search, Temperatura, Origem, Status, Responsável */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar título, lead, serviço..."
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

          {/* Responsável */}
          <div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Advogados</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date Range Filter (Data inicial e Data final) & Active Filter Badges / Reset */}
        <div className="pt-2 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Data de Criação:
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">De:</span>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-8 text-xs font-mono w-36 px-2"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">Até:</span>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-8 text-xs font-mono w-36 px-2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                <Filter className="h-3 w-3" />
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
              </Badge>
            )}

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
              >
                <RotateCcw className="h-3 w-3" /> Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[580px]">
          {stages.map((stage) => {
            const columnOpps = filteredOpps.filter(
              (o) =>
                o.stage_id === stage.id ||
                o.etapa_id === stage.id ||
                (!o.stage_id && stage.order === 1),
            )
            const columnValue = columnOpps.reduce((sum, o) => sum + (o.value || 0), 0)

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-80 shrink-0 flex flex-col bg-muted/40 border border-border/70 rounded-xl overflow-hidden shadow-xs"
              >
                {/* Column Header */}
                <div
                  className="p-3 border-b bg-card flex items-center justify-between"
                  style={{ borderTop: `3px solid ${stage.color || '#3b82f6'}` }}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-foreground">{stage.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded font-bold text-muted-foreground">
                        {columnOpps.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                      R$ {columnValue.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTargetStageId(stage.id)
                      setCreateModalOpen(true)
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[640px]">
                  {columnOpps.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                      Arraste oportunidades para cá
                    </div>
                  ) : (
                    columnOpps.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onClick={() => navigate(`/oportunidades/${opp.id}`)}
                        className="bg-card border border-border/80 rounded-lg p-3 shadow-xs hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {opp.title}
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        {opp.servico && (
                          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {opp.servico}
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[100px]">
                              {opp.expand?.assigned_to?.name || 'Não atribuído'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-semibold text-foreground">
                            <span>{opp.probabilidade || stage.probability || 50}%</span>
                          </div>
                        </div>

                        {/* SEÇÃO DE CONTRATO / ZAPSIGN TRIGGER NO CARD */}
                        {(() => {
                          const oppContract = contracts.find((c) => c.oportunidade_id === opp.id)
                          const isInContractStage = isContractStage(stage.name, stage.probability)

                          if (!isInContractStage && !oppContract) return null

                          const isSent =
                            oppContract?.sign_status === 'sent' || oppContract?.status === 'enviado'
                          const isSigned =
                            oppContract?.sign_status === 'signed' ||
                            oppContract?.status === 'assinado'
                          const signLink =
                            oppContract?.sign_link ||
                            oppContract?.sign_url ||
                            oppContract?.signing_link

                          return (
                            <div
                              className="mt-2.5 pt-2 border-t border-dashed border-border/80 flex flex-col gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold flex items-center gap-1 text-primary">
                                  <FileSignature className="h-3 w-3" />
                                  {isSigned
                                    ? 'Contrato Assinado'
                                    : isSent
                                      ? 'Aguardando Assinatura'
                                      : 'Contrato ZapSign'}
                                </span>
                                {isSigned ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] h-4 px-1.5">
                                    Assinado
                                  </Badge>
                                ) : isSent ? (
                                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[9px] h-4 px-1.5">
                                    Enviado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                    Pendente
                                  </Badge>
                                )}
                              </div>

                              {!isSigned && !isSent && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleSendContract(e, opp, oppContract)}
                                  disabled={sendingContractId === opp.id}
                                  className="h-6 text-[10px] w-full bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1"
                                >
                                  {sendingContractId === opp.id ? (
                                    <>
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Disparando
                                      ZapSign...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-2.5 w-2.5" /> Enviar para Assinatura
                                    </>
                                  )}
                                </Button>
                              )}

                              {signLink && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(signLink)
                                      toast({ title: 'Link de assinatura copiado!' })
                                    }}
                                    className="h-5 text-[9px] flex-1 px-1.5 gap-1"
                                  >
                                    <Copy className="h-2.5 w-2.5" /> Copiar Link
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-5 text-[9px] px-1.5"
                                  >
                                    <a href={signLink} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
              <tr>
                <th className="p-3 pl-4">Título / Oportunidade</th>
                <th className="p-3">Serviço Jurídico</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Etapa Atual</th>
                <th className="p-3">Contrato / Assinatura</th>
                <th className="p-3">Responsável</th>
                <th className="p-3 pr-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOpps.map((opp) => {
                const oppContract = contracts.find((c) => c.oportunidade_id === opp.id)
                const isSent =
                  oppContract?.sign_status === 'sent' || oppContract?.status === 'enviado'
                const isSigned =
                  oppContract?.sign_status === 'signed' || oppContract?.status === 'assinado'

                return (
                  <tr
                    key={opp.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/oportunidades/${opp.id}`)}
                  >
                    <td className="p-3 pl-4 font-semibold text-foreground">{opp.title}</td>
                    <td className="p-3 text-muted-foreground">{opp.servico || 'Geral'}</td>
                    <td className="p-3 font-bold">
                      R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {opp.expand?.stage_id?.name || 'Qualificação'}
                      </Badge>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {oppContract ? (
                        <div className="flex items-center gap-1.5">
                          {isSigned ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                              Assinado
                            </Badge>
                          ) : isSent ? (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                              Enviado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => handleSendContract(e, opp, oppContract)}
                              disabled={sendingContractId === opp.id}
                              className="h-6 text-[10px] bg-[#0A1F3F] text-white gap-1"
                            >
                              <Send className="h-2.5 w-2.5" /> Enviar p/ Assinar
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-3">{opp.expand?.assigned_to?.name || 'Geral'}</td>
                    <td className="p-3 pr-4 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Abrir →
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* CREATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Nova Oportunidade no Funil
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOpportunity} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Negócio *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Mandado de Segurança - ICMS Vanguarda"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Probabilidade (%)</Label>
                <Input
                  type="number"
                  value={formData.probabilidade}
                  onChange={(e) =>
                    setFormData({ ...formData, probabilidade: Number(e.target.value) })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vincular a Lead Existente</Label>
              <Select
                value={formData.lead_id}
                onValueChange={(val) => setFormData({ ...formData, lead_id: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.company ? `(${l.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Advogado Responsável</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(val) =>
                  setFormData({ ...formData, assigned_to: val, responsavel_id: val })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o responsável..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
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
                Salvar Oportunidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PipelinePage
