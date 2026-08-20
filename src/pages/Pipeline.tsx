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
  const [users, setUsers] = useState<UserRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')

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
      const [pipeList, oppList, userList, leadList] = await Promise.all([
        CrmService.getPipelines(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getLeads(tenant.id),
      ])

      setPipelines(pipeList)
      setOpportunities(oppList)
      setUsers(userList)
      setLeads(leadList)

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

    // Optimistic UI update
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, stage_id: newStageId, etapa_id: newStageId } : o)),
    )

    try {
      await CrmService.updateOpportunity(oppId, {
        stage_id: newStageId,
        etapa_id: newStageId,
      })
      toast({ title: 'Etapa da oportunidade atualizada!' })
    } catch (err) {
      toast({ title: 'Erro ao mover oportunidade', variant: 'destructive' })
      loadPipelineData()
    } finally {
      setDraggedOppId(null)
    }
  }

  const filteredOpps = opportunities.filter((o) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      (o.title || '').toLowerCase().includes(q) || (o.servico || '').toLowerCase().includes(q)
    const matchesUser =
      userFilter === 'all' || o.assigned_to === userFilter || o.responsavel_id === userFilter
    return matchesSearch && matchesUser
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
      <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar oportunidades..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-9 text-xs w-48">
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
                <th className="p-3">Probabilidade</th>
                <th className="p-3">Responsável</th>
                <th className="p-3 pr-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOpps.map((opp) => (
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
                    <Badge variant="outline">{opp.expand?.stage_id?.name || 'Qualificação'}</Badge>
                  </td>
                  <td className="p-3">{opp.probabilidade || 50}%</td>
                  <td className="p-3">{opp.expand?.assigned_to?.name || 'Geral'}</td>
                  <td className="p-3 pr-4 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Abrir →
                    </Button>
                  </td>
                </tr>
              ))}
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
