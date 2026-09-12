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
  Trash2,
  Pencil,
  Edit2,
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react'
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
import { pb } from '@/lib/pocketbase/client'
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
  LEAD_STATUS_LABELS,
} from '@/types/platform'

export function PipelinePage() {
  const { tenant, userRole } = useTenant()
  const isAdmin = userRole === 'admin'
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
    responsavel_id: '',
  })

  // Drag state
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null)

  // Delete card / opportunity state (Admin only)
  const [oppToDelete, setOppToDelete] = useState<{
    id: string
    title: string
    leadId?: string
  } | null>(null)
  const [deletingOpp, setDeletingOpp] = useState(false)

  // Edit Opportunity Modal state (Admin & Gestor)
  const canEditOpportunity = isAdmin || userRole === 'gestor'
  const [editOppModalOpen, setEditOppModalOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState<OpportunityRecord | null>(null)
  const [editFormData, setEditFormData] = useState<{
    title: string
    value: number
    servico: string
    probabilidade: number
    stage_id: string
    responsavel_id: string
    lead_id: string
    status: 'open' | 'won' | 'lost' | 'archived'
    observacoes: string
  }>({
    title: '',
    value: 20000,
    servico: '',
    probabilidade: 50,
    stage_id: '',
    responsavel_id: '',
    lead_id: '',
    status: 'open',
    observacoes: '',
  })
  const [savingEditOpp, setSavingEditOpp] = useState(false)

  // Column / Stage management (Admin only)
  const [columnToEdit, setColumnToEdit] = useState<PipelineStageRecord | null>(null)
  const [editColumnName, setEditColumnName] = useState('')
  const [savingColumn, setSavingColumn] = useState(false)

  const [columnToDelete, setColumnToDelete] = useState<PipelineStageRecord | null>(null)
  const [targetMoveStageId, setTargetMoveStageId] = useState<string>('')
  const [deletingColumn, setDeletingColumn] = useState(false)

  const [createColumnModalOpen, setCreateColumnModalOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnProbability, setNewColumnProbability] = useState(50)
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6')
  const [savingNewColumn, setSavingNewColumn] = useState(false)

  // Updating card assignment in real-time
  const [updatingAssigneeOppId, setUpdatingAssigneeOppId] = useState<string | null>(null)

  const handleConfirmDeleteOpp = async () => {
    if (!oppToDelete?.id || !isAdmin) return
    setDeletingOpp(true)
    try {
      // Soft-delete the opportunity
      await CrmService.softDeleteOpportunity(oppToDelete.id)
      // Also soft-delete the linked lead if available so both go to trash
      if (oppToDelete.leadId) {
        try {
          await CrmService.softDeleteLead(oppToDelete.leadId)
        } catch {
          // ignore lead soft-delete if already deleted or permission
        }
      }
      toast({
        title: 'Card excluído com sucesso!',
        description: `A oportunidade "${oppToDelete.title}" foi movida para a lixeira.`,
      })
      setOppToDelete(null)
      loadPipelineData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao excluir card',
        description: err?.message || 'Falha ao processar exclusão.',
        variant: 'destructive',
      })
    } finally {
      setDeletingOpp(false)
    }
  }

  const handleOpenEditOpp = (e: React.MouseEvent, opp: OpportunityRecord) => {
    e.stopPropagation()
    if (!canEditOpportunity) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas Gestores e Administradores podem editar oportunidades.',
        variant: 'destructive',
      })
      return
    }
    setEditingOpp(opp)
    setEditFormData({
      title: opp.title || '',
      value: opp.value || 0,
      servico: opp.servico || '',
      probabilidade: opp.probabilidade || 50,
      stage_id: opp.stage_id || opp.etapa_id || stages[0]?.id || '',
      responsavel_id: opp.responsavel_id || '',
      lead_id: opp.lead_id || '',
      status: (opp.status as any) || 'open',
      observacoes: opp.observacoes || '',
    })
    setEditOppModalOpen(true)
  }

  const handleSaveEditOpp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOpp || !canEditOpportunity) return
    setSavingEditOpp(true)
    try {
      await CrmService.updateOpportunity(editingOpp.id, {
        title: editFormData.title,
        value: Number(editFormData.value),
        servico: editFormData.servico,
        probabilidade: Number(editFormData.probabilidade),
        stage_id: editFormData.stage_id,
        etapa_id: editFormData.stage_id,
        responsavel_id: editFormData.responsavel_id || null,
        lead_id: editFormData.lead_id || null,
        status: editFormData.status,
        observacoes: editFormData.observacoes,
      })

      // If responsavel was changed and lead is attached, also sync lead's responsavel_id
      if (editFormData.lead_id && editFormData.responsavel_id) {
        try {
          await pb.collection('leads').update(editFormData.lead_id, {
            responsavel_id: editFormData.responsavel_id || null,
          })
        } catch {
          /* ignore sync failure */
        }
      }

      toast({ title: 'Oportunidade atualizada com sucesso!' })
      setEditOppModalOpen(false)
      setEditingOpp(null)
      loadPipelineData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar oportunidade',
        description: err?.message || 'Falha ao salvar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSavingEditOpp(false)
    }
  }

  // Quick assignment from Kanban card (Admin only)
  const handleAssignCard = async (oppId: string, leadId: string | undefined, newUserId: string) => {
    if (!isAdmin) return
    const actualUser = newUserId === '_unassigned_' ? '' : newUserId
    setUpdatingAssigneeOppId(oppId)
    try {
      await CrmService.updateOpportunity(oppId, {
        responsavel_id: actualUser || null,
      })
      if (leadId) {
        await pb.collection('leads').update(leadId, {
          responsavel_id: actualUser || null,
        })
      }
      toast({
        title: 'Responsável atribuído!',
        description: actualUser ? 'Membro atribuído com sucesso.' : 'Card desatribuído.',
      })
      loadPipelineData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atribuir responsável',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setUpdatingAssigneeOppId(null)
    }
  }

  // Column renaming (Admin only)
  const handleSaveColumnName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!columnToEdit || !isAdmin || !editColumnName.trim()) return
    setSavingColumn(true)
    try {
      await CrmService.updateStage(columnToEdit.id, {
        name: editColumnName.trim(),
      })
      toast({ title: 'Coluna renomeada com sucesso!' })
      setColumnToEdit(null)
      setEditColumnName('')
      loadPipelineData()
    } catch (err: any) {
      toast({
        title: 'Erro ao renomear coluna',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingColumn(false)
    }
  }

  // Column creation (Admin only)
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPipeline?.id || !isAdmin || !newColumnName.trim()) return
    setSavingNewColumn(true)
    try {
      const nextOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order || 0)) + 1 : 1
      await CrmService.createStage({
        pipeline_id: currentPipeline.id,
        name: newColumnName.trim(),
        order: nextOrder,
        probability: Number(newColumnProbability) || 50,
        color: newColumnColor || '#3b82f6',
      })
      toast({ title: 'Nova coluna adicionada com sucesso!' })
      setCreateColumnModalOpen(false)
      setNewColumnName('')
      setNewColumnProbability(50)
      loadPipelineData()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar coluna',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingNewColumn(false)
    }
  }

  // Column deletion (Admin only)
  const handleConfirmDeleteColumn = async () => {
    if (!columnToDelete || !isAdmin) return
    setDeletingColumn(true)
    try {
      const oppsInColumn = opportunities.filter(
        (o) => o.stage_id === columnToDelete.id || o.etapa_id === columnToDelete.id,
      )

      // If cards exist, move them to target stage
      if (oppsInColumn.length > 0) {
        if (!targetMoveStageId) {
          toast({
            title: 'Selecione a coluna de destino',
            description: 'Escolha para qual coluna mover os cards existentes.',
            variant: 'destructive',
          })
          setDeletingColumn(false)
          return
        }
        await Promise.all(
          oppsInColumn.map((o) =>
            CrmService.updateOpportunity(o.id, {
              stage_id: targetMoveStageId,
              etapa_id: targetMoveStageId,
            }),
          ),
        )
      }

      await CrmService.deleteStage(columnToDelete.id)
      toast({
        title: 'Coluna excluída com sucesso!',
        description:
          oppsInColumn.length > 0
            ? `${oppsInColumn.length} cards foram movidos para a coluna de destino.`
            : 'A coluna vazia foi removida.',
      })
      setColumnToDelete(null)
      setTargetMoveStageId('')
      loadPipelineData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir coluna',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setDeletingColumn(false)
    }
  }

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
        responsavel_id: '',
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
      opp.responsavel_id === userFilter ||
      opp.expand?.lead_id?.responsavel_id === userFilter

    // Filtro de temperatura
    const oppTemp = opp.expand?.lead_id?.temperature
    const matchesTemp =
      temperatureFilter === 'all' ||
      oppTemp === temperatureFilter ||
      (temperatureFilter === 'hot' && (oppTemp === 'quente' || oppTemp === 'muito_quente')) ||
      (temperatureFilter === 'warm' && oppTemp === 'morno') ||
      (temperatureFilter === 'cold' && oppTemp === 'frio')

    // Filtro de status canônico
    const leadStatus = opp.expand?.lead_id?.status
    const oppStatus = opp.status
    const matchesStatus =
      statusFilter === 'all' ||
      leadStatus === statusFilter ||
      (statusFilter === 'novo' &&
        (!leadStatus || leadStatus === 'novo' || leadStatus === 'Novo Lead')) ||
      (statusFilter === 'qualificado_ia' &&
        (leadStatus === 'qualificado_ia' || leadStatus === 'Qualificado')) ||
      (statusFilter === 'em_contato' &&
        (leadStatus === 'em_contato' || leadStatus === 'Em Atendimento')) ||
      (statusFilter === 'reuniao_agendada' &&
        (leadStatus === 'reuniao_agendada' || leadStatus === 'Reunião Agendada')) ||
      (statusFilter === 'proposta_enviada' &&
        (leadStatus === 'proposta_enviada' || leadStatus === 'Oportunidade Criada')) ||
      (statusFilter === 'ganho' &&
        (leadStatus === 'ganho' ||
          leadStatus === 'Convertido / Ganho' ||
          oppStatus === 'won' ||
          oppStatus === 'ganha')) ||
      (statusFilter === 'perdido' &&
        (leadStatus === 'perdido' ||
          leadStatus === 'Perdido' ||
          oppStatus === 'lost' ||
          oppStatus === 'perdida'))

    // Filtro de origem
    const leadOrigem = opp.expand?.lead_id?.origem || opp.origem
    const matchesSource =
      sourceFilter === 'all' ||
      leadOrigem === sourceFilter ||
      (sourceFilter === 'landing_page' && leadOrigem === 'landing_page')

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

          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                setNewColumnName('')
                setNewColumnProbability(50)
                setNewColumnColor('#3b82f6')
                setCreateColumnModalOpen(true)
              }}
              className="h-9 gap-1.5 text-xs font-semibold border-dashed"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Coluna
            </Button>
          )}

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
                <SelectItem value="novo">{LEAD_STATUS_LABELS.novo}</SelectItem>
                <SelectItem value="qualificado_ia">{LEAD_STATUS_LABELS.qualificado_ia}</SelectItem>
                <SelectItem value="em_contato">{LEAD_STATUS_LABELS.em_contato}</SelectItem>
                <SelectItem value="reuniao_agendada">
                  {LEAD_STATUS_LABELS.reuniao_agendada}
                </SelectItem>
                <SelectItem value="proposta_enviada">
                  {LEAD_STATUS_LABELS.proposta_enviada}
                </SelectItem>
                <SelectItem value="ganho">{LEAD_STATUS_LABELS.ganho}</SelectItem>
                <SelectItem value="perdido">{LEAD_STATUS_LABELS.perdido}</SelectItem>
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
                  className="p-3 border-b bg-card flex items-center justify-between gap-1"
                  style={{ borderTop: `3px solid ${stage.color || '#3b82f6'}` }}
                >
                  {columnToEdit?.id === stage.id ? (
                    <form
                      onSubmit={handleSaveColumnName}
                      className="flex items-center gap-1 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        autoFocus
                        value={editColumnName}
                        onChange={(e) => setEditColumnName(e.target.value)}
                        className="h-7 text-xs font-semibold px-1.5"
                        placeholder="Nome da coluna"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        disabled={savingColumn}
                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0"
                        title="Salvar nome"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setColumnToEdit(null)
                          setEditColumnName('')
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        title="Cancelar"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-xs text-foreground truncate ${
                            isAdmin ? 'cursor-pointer hover:underline' : ''
                          }`}
                          title={isAdmin ? 'Duplo clique para renomear' : undefined}
                          onDoubleClick={() => {
                            if (isAdmin) {
                              setColumnToEdit(stage)
                              setEditColumnName(stage.name)
                            }
                          }}
                        >
                          {stage.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded font-bold text-muted-foreground shrink-0">
                          {columnOpps.length}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                        R$ {columnValue.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    {isAdmin && columnToEdit?.id !== stage.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar nome da coluna (Admin)"
                          onClick={() => {
                            setColumnToEdit(stage)
                            setEditColumnName(stage.name)
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir coluna (Admin)"
                          onClick={() => {
                            setColumnToDelete(stage)
                            // Default target move stage to another existing column
                            const otherStage = stages.find((s) => s.id !== stage.id)
                            setTargetMoveStageId(otherStage?.id || '')
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Adicionar oportunidade nesta coluna"
                      onClick={() => {
                        setTargetStageId(stage.id)
                        setCreateModalOpen(true)
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                            </span>
                            {canEditOpportunity && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar oportunidade (Gestor/Admin)"
                                onClick={(e) => handleOpenEditOpp(e, opp)}
                                className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir card (Admin)"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOppToDelete({
                                    id: opp.id,
                                    title: opp.title,
                                    leadId: opp.expand?.lead_id?.id || opp.lead_id,
                                  })
                                }}
                                className="h-5 w-5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {opp.servico && (
                          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {opp.servico}
                          </div>
                        )}

                        {opp.expand?.lead_id && (
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                            <span className="truncate font-medium text-foreground">
                              Lead: {opp.expand.lead_id.name}
                            </span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir card / lead (Admin)"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOppToDelete({
                                    id: opp.id,
                                    title: opp.title,
                                    leadId: opp.expand!.lead_id!.id,
                                  })
                                }}
                                className="h-5 w-5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0 ml-1"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                          {/* Seletor ou exibição de Responsável no card */}
                          {isAdmin ? (
                            <div
                              className="flex items-center gap-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <User className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Select
                                value={opp.responsavel_id || '_unassigned_'}
                                onValueChange={(val) =>
                                  handleAssignCard(
                                    opp.id,
                                    opp.expand?.lead_id?.id || opp.lead_id,
                                    val,
                                  )
                                }
                                disabled={updatingAssigneeOppId === opp.id}
                              >
                                <SelectTrigger className="h-6 text-[10px] px-1.5 py-0 border-dashed max-w-[130px] font-medium truncate">
                                  <SelectValue placeholder="Atribuir..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="_unassigned_"
                                    className="text-[11px] text-muted-foreground"
                                  >
                                    Não atribuído
                                  </SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id} className="text-[11px]">
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 min-w-0">
                              <User className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span
                                className="truncate font-medium text-foreground max-w-[110px]"
                                title={opp.expand?.responsavel_id?.name || 'Não atribuído'}
                              >
                                {opp.expand?.responsavel_id?.name || 'Não atribuído'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 font-semibold text-foreground shrink-0">
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
                    <td className="p-3">{opp.expand?.responsavel_id?.name || 'Geral'}</td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEditOpportunity && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar Oportunidade"
                            onClick={(e) => handleOpenEditOpp(e, opp)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir Card (Admin)"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOppToDelete({
                                id: opp.id,
                                title: opp.title,
                                leadId: opp.expand?.lead_id?.id || opp.lead_id,
                              })
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Abrir →
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* CONFIRMAÇÃO DE EXCLUSÃO DE CARD / OPORTUNIDADE - APENAS ADMIN */}
      <AlertDialog
        open={Boolean(oppToDelete)}
        onOpenChange={(open) => !open && setOppToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Excluir Card do Funil (Admin)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir o card <strong>"{oppToDelete?.title}"</strong>? O
              card será movido para a lixeira do sistema com soft-delete e poderá ser restaurado
              futuramente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOpp}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDeleteOpp()
              }}
              disabled={deletingOpp}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingOpp ? 'Excluindo...' : 'Sim, Excluir Card'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE COLUNA - APENAS ADMIN */}
      <AlertDialog
        open={Boolean(columnToDelete)}
        onOpenChange={(open) => !open && setColumnToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Excluir Coluna do Kanban
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Tem certeza de que deseja excluir a coluna <strong>"{columnToDelete?.name}"</strong>
                ?
              </span>
              {columnToDelete &&
                (() => {
                  const count = opportunities.filter(
                    (o) => o.stage_id === columnToDelete.id || o.etapa_id === columnToDelete.id,
                  ).length
                  const remainingStages = stages.filter((s) => s.id !== columnToDelete.id)

                  if (count > 0) {
                    return (
                      <div className="pt-2 text-xs text-foreground bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg space-y-2">
                        <p className="font-semibold text-amber-700 dark:text-amber-400">
                          Atenção: Esta coluna possui {count} {count === 1 ? 'card' : 'cards'}.
                          Selecione para onde deseja movê-los antes de excluir:
                        </p>
                        <Select value={targetMoveStageId} onValueChange={setTargetMoveStageId}>
                          <SelectTrigger className="h-8 text-xs bg-card">
                            <SelectValue placeholder="Mover cards para..." />
                          </SelectTrigger>
                          <SelectContent>
                            {remainingStages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <span className="block text-xs text-muted-foreground">
                      Esta coluna não possui cards no momento e pode ser excluída com segurança.
                    </span>
                  )
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingColumn}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDeleteColumn()
              }}
              disabled={deletingColumn}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingColumn ? 'Excluindo...' : 'Sim, Excluir Coluna'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ADICIONAR NOVA COLUNA - APENAS ADMIN */}
      <Dialog open={createColumnModalOpen} onOpenChange={setCreateColumnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Adicionar Nova Coluna ao Kanban
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateColumn} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Coluna *</Label>
              <Input
                required
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ex: Em Análise Pericial"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Probabilidade Sugerida (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newColumnProbability}
                  onChange={(e) => setNewColumnProbability(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="h-9 w-14 p-1 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{newColumnColor}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateColumnModalOpen(false)}
                disabled={savingNewColumn}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingNewColumn}
                className="bg-[#0A1F3F] text-white"
              >
                {savingNewColumn ? 'Criando...' : 'Criar Coluna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDITAR OPORTUNIDADE - GESTOR E ADMIN */}
      <Dialog open={editOppModalOpen} onOpenChange={setEditOppModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Editar Oportunidade
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEditOpp} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Negócio *</Label>
              <Input
                required
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
                <Input
                  type="number"
                  value={editFormData.value}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, value: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Probabilidade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.probabilidade}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, probabilidade: Number(e.target.value) })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Coluna / Etapa</Label>
                <Select
                  value={editFormData.stage_id}
                  onValueChange={(val) => setEditFormData({ ...editFormData, stage_id: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status do Negócio</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Em Aberto</SelectItem>
                    <SelectItem value="won">Ganho / Fechado</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço Jurídico</Label>
              <Input
                value={editFormData.servico}
                onChange={(e) => setEditFormData({ ...editFormData, servico: e.target.value })}
                placeholder="Ex: Recuperação Tributária, Ação Bancária..."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Advogado Responsável</Label>
                <Select
                  value={editFormData.responsavel_id || '_unassigned_'}
                  onValueChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      responsavel_id: val === '_unassigned_' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned_">Não atribuído</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lead Associado</Label>
                <Select
                  value={editFormData.lead_id || '_none_'}
                  onValueChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      lead_id: val === '_none_' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Nenhum</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Comerciais</Label>
              <Input
                value={editFormData.observacoes}
                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                placeholder="Anotações internas sobre o andamento..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOppModalOpen(false)}
                disabled={savingEditOpp}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEditOpp}
                className="bg-[#0A1F3F] text-white"
              >
                {savingEditOpp ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                value={formData.responsavel_id}
                onValueChange={(val) => setFormData({ ...formData, responsavel_id: val })}
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
