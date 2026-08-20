import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Flame,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Send,
  Pin,
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  Target,
  Share2,
  Edit,
  Tag,
  AlertTriangle,
  Scale,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import { TimelineView, TimelineItem } from '@/components/TimelineView'
import {
  LeadRecord,
  NoteRecord,
  TaskRecord,
  OpportunityRecord,
  ProposalRecord,
  ContractRecord,
  UserRecord,
  PipelineStageRecord,
} from '@/types/platform'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [stages, setStages] = useState<PipelineStageRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [notePinned, setNotePinned] = useState(false)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskData, setTaskData] = useState<Partial<TaskRecord>>({
    titulo: 'Reunião de Alinhamento Jurídico',
    tipo: 'reuniao',
    prioridade: 'alta',
    data: new Date().toISOString().slice(0, 10),
    horario: '14:00',
    descricao: '',
  })

  const [oppModalOpen, setOppModalOpen] = useState(false)
  const [oppData, setOppData] = useState<Partial<OpportunityRecord>>({
    title: '',
    value: 20000,
    servico: 'Recuperação Tributária e Teses Fiscais',
    probabilidade: 50,
  })

  const [wonModalOpen, setWonModalOpen] = useState(false)
  const [wonData, setWonData] = useState({
    value: 25000,
    servico: 'Honorários Advocatícios Especializados',
    observacoes: 'Contratação aprovada pela diretoria.',
  })

  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [lostData, setLostData] = useState({
    loss_reason: 'preço',
    observacoes: '',
  })

  const loadAll = async () => {
    if (!id || !tenant?.id) return
    setLoading(true)
    try {
      const [leadData, allNotes, allTasks, allOpps, allProps, allUsers] = await Promise.all([
        CrmService.getLeadById(id),
        CrmService.getNotes(tenant.id, `lead_id = "${id}"`),
        CrmService.getTasks(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getProposals(tenant.id),
        CrmService.getUsers(tenant.id),
      ])

      setLead(leadData)
      setNotes(allNotes)
      setTasks(allTasks.filter((t) => t.lead_id === id))
      setOpportunities(allOpps.filter((o) => o.lead_id === id))
      setProposals(allProps.filter((p) => p.lead_id === id))
      setUsers(allUsers)

      if (leadData) {
        setOppData((prev) => ({
          ...prev,
          title: `Assessoria: ${leadData.name}`,
          value: leadData.potential_value || leadData.valor_potencial || 20000,
          servico: leadData.service || 'Recuperação Tributária e Teses Fiscais',
        }))
        setWonData((prev) => ({
          ...prev,
          value: leadData.potential_value || leadData.valor_potencial || 25000,
          servico: leadData.service || 'Assessoria Jurídica',
        }))
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar detalhes do lead', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [id, tenant?.id])

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim() || !tenant?.id || !id) return
    try {
      await CrmService.createNote(tenant.id, {
        conteudo: noteContent,
        lead_id: id,
        fixada: notePinned,
        categoria: 'Atendimento Jurídico',
      })
      setNoteContent('')
      setNotePinned(false)
      setNoteModalOpen(false)
      toast({ title: 'Nota interna registrada com sucesso' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao criar nota', variant: 'destructive' })
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      await CrmService.createTask(tenant.id, {
        ...taskData,
        lead_id: id,
      })
      setTaskModalOpen(false)
      toast({ title: 'Tarefa jurídica agendada com sucesso' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao agendar tarefa', variant: 'destructive' })
    }
  }

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      const opp = await CrmService.createOpportunity(tenant.id, {
        ...oppData,
        lead_id: id,
        status: 'open',
      })
      setOppModalOpen(false)
      toast({ title: 'Oportunidade criada no Kanban!' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao criar oportunidade', variant: 'destructive' })
    }
  }

  const handleMarkWon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      // Create opportunity if none exists, then mark won
      let targetOppId = opportunities[0]?.id
      if (!targetOppId) {
        const opp = await CrmService.createOpportunity(tenant.id, {
          title: `Contrato Fechado: ${lead?.name}`,
          value: wonData.value,
          servico: wonData.servico,
          lead_id: id,
          status: 'open',
        })
        targetOppId = opp.id
      }
      await CrmService.markOpportunityWon(targetOppId, wonData)
      toast({ title: 'Parabéns! Lead convertido em CLIENTE contratado!' })
      setWonModalOpen(false)
      navigate('/clientes')
    } catch (err: any) {
      toast({ title: 'Erro ao marcar como ganho', variant: 'destructive' })
    }
  }

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      if (opportunities.length > 0) {
        await CrmService.markOpportunityLost(
          opportunities[0].id,
          lostData.loss_reason,
          lostData.observacoes,
        )
      }
      await CrmService.updateLead(id, {
        status: 'Perdido',
        observacoes:
          (lead?.observacoes || '') +
          `\n[MOTIVO PERDA]: ${lostData.loss_reason} - ${lostData.observacoes}`,
      })
      toast({ title: 'Lead registrado como perda com justificativa' })
      setLostModalOpen(false)
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar perda', variant: 'destructive' })
    }
  }

  // Build timeline events
  const timelineItems: TimelineItem[] = []
  if (lead) {
    timelineItems.push({
      id: 'lead_create',
      type: 'creation',
      title: 'Lead Jurídico Captado',
      description: `Lead entrou via ${lead.origem || lead.source || 'Meta Ads'}${lead.campaign ? ` (Campanha: ${lead.campaign})` : ''}. Valor Potencial: R$ ${Number(lead.potential_value || lead.valor_potencial || 0).toLocaleString('pt-BR')}`,
      date: lead.created || '',
      badge: lead.temperature,
    })
  }

  notes.forEach((n) => {
    timelineItems.push({
      id: n.id,
      type: 'note',
      title: n.fixada ? '📌 Nota Fixada de Atendimento' : 'Nota Interna Registrada',
      description: n.conteudo,
      date: n.created || '',
      author: n.expand?.autor_id?.name || 'Advogado',
    })
  })

  tasks.forEach((t) => {
    timelineItems.push({
      id: t.id,
      type: 'task',
      title: `Tarefa: ${t.titulo}`,
      description: `Tipo: ${t.tipo} • Status: ${t.status} • Agendado para ${t.data || ''} ${t.horario || ''}`,
      date: t.created || '',
    })
  })

  opportunities.forEach((o) => {
    timelineItems.push({
      id: o.id,
      type: o.status === 'won' ? 'won' : o.status === 'lost' ? 'lost' : 'proposal',
      title: `Oportunidade: ${o.title}`,
      description: `Valor: R$ ${Number(o.value || 0).toLocaleString('pt-BR')} • Status: ${o.status} • Serviço: ${o.servico || 'Não informado'}`,
      date: o.created || '',
    })
  })

  // Sort timeline newest first
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-16 space-y-3">
        <h2 className="text-lg font-bold">Lead não encontrado</h2>
        <Button onClick={() => navigate('/leads')}>Voltar para Lista de Leads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate('/leads')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
                {lead.name}
              </h1>
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                <Flame className="h-3 w-3" /> {lead.temperature || 'Quente'}
              </Badge>
              <Badge variant="outline">{lead.status || 'Em Atendimento'}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              <span>
                Origem: <strong>{lead.origem || lead.source || 'Meta Ads'}</strong>
              </span>
              <span>•</span>
              <span>
                Serviço: <strong>{lead.service || 'Recuperação Tributária'}</strong>
              </span>
              <span>•</span>
              <span>
                Valor Potencial:{' '}
                <strong>
                  R${' '}
                  {Number(lead.potential_value || lead.valor_potencial || 0).toLocaleString(
                    'pt-BR',
                  )}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNoteModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="h-4 w-4 text-blue-500" /> Nova Nota
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTaskModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Calendar className="h-4 w-4 text-amber-500" /> Nova Tarefa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOppModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Target className="h-4 w-4 text-purple-500" /> Criar Oportunidade
          </Button>
          <Button
            size="sm"
            onClick={() => setWonModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" /> Marcar Ganho (Cliente)
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLostModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <XCircle className="h-4 w-4" /> Marcar Perda
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Details Card & Right 360 Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1-col: Lead Profile Details */}
        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">
              Dados do Contato Jurídico
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Telefone / WhatsApp:
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  {lead.whatsapp || lead.phone || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">E-mail Corporativo:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  {lead.email || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Empresa / Razão Social:
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-500" />
                  {lead.company || 'Pessoa Física / Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">CPF / CNPJ:</span>
                <span className="font-mono font-medium text-foreground">
                  {lead.cpf_cnpj || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Localização:</span>
                <span className="font-medium text-foreground">
                  {lead.city || 'São Paulo'} {lead.estado ? `- ${lead.estado}` : ''}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Advogado Responsável:
                </span>
                <span className="font-semibold text-foreground">
                  {lead.expand?.assigned_to?.name ||
                    lead.expand?.responsavel_id?.name ||
                    'Equipe Geral'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Lead Score de Conversão:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${lead.score || 80}%` }}
                    />
                  </div>
                  <span className="font-bold text-emerald-600 text-xs">{lead.score || 80}/100</span>
                </div>
              </div>
            </div>

            {lead.observacoes && (
              <div className="pt-3 border-t">
                <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                  Observações Iniciais:
                </span>
                <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg whitespace-pre-line leading-relaxed">
                  {lead.observacoes}
                </p>
              </div>
            )}
          </div>

          {/* Tráfego & UTMs Card */}
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-blue-500" /> Rastreamento &amp; Tráfego
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Canal:</span>
                <span className="font-medium">{lead.channel || lead.source || 'Meta Ads'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Campanha:</span>
                <span className="font-medium truncate max-w-[150px]">
                  {lead.campaign || lead.utm_campaign || 'PIS/COFINS Q3'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">UTM Source:</span>
                <span className="font-mono text-[11px]">{lead.utm_source || 'meta_instagram'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Data Captura:</span>
                <span className="font-mono text-[11px]">
                  {lead.created ? new Date(lead.created).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2-cols: 360 View Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4">
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Linha do Tempo 360º ({timelineItems.length})
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Notas Internas ({notes.length})
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Tarefas &amp; Reuniões ({tasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="opportunities"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Oportunidades ({opportunities.length})
              </TabsTrigger>
              <TabsTrigger
                value="proposals"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Propostas &amp; Contratos ({proposals.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB TIMELINE */}
            <TabsContent value="timeline" className="pt-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
                <TimelineView items={timelineItems} />
              </div>
            </TabsContent>

            {/* TAB NOTES */}
            <TabsContent value="notes" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Notas Internas &amp; Pareceres</h4>
                <Button
                  size="sm"
                  onClick={() => setNoteModalOpen(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Nota
                </Button>
              </div>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma nota interna registrada ainda.
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        note.fixada
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-card border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">
                            {note.expand?.autor_id?.name || 'Advogado'}
                          </span>
                          {note.fixada && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] h-4 gap-1">
                              <Pin className="h-2.5 w-2.5" /> Fixada
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {note.created ? new Date(note.created).toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                        {note.conteudo}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB TASKS */}
            <TabsContent value="tasks" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Tarefas e Compromissos</h4>
                <Button
                  size="sm"
                  onClick={() => setTaskModalOpen(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Agendar Tarefa
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma tarefa agendada para este lead.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-2">
                          {task.titulo}
                          <Badge variant="outline" className="text-[10px] h-4">
                            {task.tipo}
                          </Badge>
                          <Badge
                            className={`text-[10px] h-4 ${
                              task.prioridade === 'urgente'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {task.prioridade}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Data:{' '}
                          <strong>
                            {task.data || 'Hoje'} às {task.horario || '14:00'}
                          </strong>{' '}
                          • Status: {task.status}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await CrmService.updateTask(task.id, {
                            status: task.status === 'concluida' ? 'pendente' : 'concluida',
                            data_conclusao:
                              task.status === 'concluida' ? undefined : new Date().toISOString(),
                          })
                          toast({ title: 'Status da tarefa atualizado' })
                          loadAll()
                        }}
                        className="h-8 text-xs"
                      >
                        {task.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB OPPORTUNITIES */}
            <TabsContent value="opportunities" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Oportunidades de Negócio</h4>
                <Button
                  size="sm"
                  onClick={() => setOppModalOpen(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova Oportunidade
                </Button>
              </div>

              <div className="space-y-3">
                {opportunities.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma oportunidade criada para este lead.
                  </div>
                ) : (
                  opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/oportunidades/${opp.id}`)}
                    >
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {opp.title}
                          <Badge variant="outline">{opp.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Serviço: <strong>{opp.servico || 'Não definido'}</strong> • Probabilidade:{' '}
                          {opp.probabilidade || 50}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Ver detalhes →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB PROPOSALS */}
            <TabsContent value="proposals" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Propostas e Minutas de Honorários</h4>
                <Button
                  size="sm"
                  onClick={() => navigate(`/propostas?lead_id=${id}`)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Gerar Proposta
                </Button>
              </div>

              <div className="space-y-3">
                {proposals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma proposta enviada ainda.
                  </div>
                ) : (
                  proposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {prop.titulo}
                          <Badge variant="outline">{prop.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Validade até{' '}
                          {prop.validade
                            ? new Date(prop.validade).toLocaleDateString('pt-BR')
                            : '30 dias'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          R$ {Number(prop.valor_total || prop.valor || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* CREATE NOTE MODAL */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Nova Nota Interna de Atendimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Conteúdo da Nota / Parecer *</Label>
              <Textarea
                required
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ex: Cliente tem interesse no protocolo imediato do Mandado de Segurança..."
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-note"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
                className="rounded text-primary"
              />
              <Label htmlFor="pin-note" className="text-xs cursor-pointer">
                Fixar nota no topo do histórico
              </Label>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Nota
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE TASK MODAL */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Agendar Tarefa / Reunião
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Compromisso *</Label>
              <Input
                required
                value={taskData.titulo}
                onChange={(e) => setTaskData({ ...taskData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={taskData.tipo}
                  onValueChange={(val: any) => setTaskData({ ...taskData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião / Demo</SelectItem>
                    <SelectItem value="whatsapp">Mensagem WhatsApp</SelectItem>
                    <SelectItem value="ligacao">Ligação Telefônica</SelectItem>
                    <SelectItem value="proposta">Enviar Proposta</SelectItem>
                    <SelectItem value="acompanhamento">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select
                  value={taskData.prioridade}
                  onValueChange={(val: any) => setTaskData({ ...taskData, prioridade: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">🚨 Urgente</SelectItem>
                    <SelectItem value="alta">⚡ Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={taskData.data}
                  onChange={(e) => setTaskData({ ...taskData, data: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horário</Label>
                <Input
                  type="time"
                  value={taskData.horario}
                  onChange={(e) => setTaskData({ ...taskData, horario: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTaskModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Agendar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE OPPORTUNITY MODAL */}
      <Dialog open={oppModalOpen} onOpenChange={setOppModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Criar Oportunidade no Funil Kanban
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOpportunity} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título da Oportunidade *</Label>
              <Input
                required
                value={oppData.title}
                onChange={(e) => setOppData({ ...oppData, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
              <Input
                type="number"
                value={oppData.value}
                onChange={(e) => setOppData({ ...oppData, value: Number(e.target.value) })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço Jurídico</Label>
              <Input
                value={oppData.servico}
                onChange={(e) => setOppData({ ...oppData, servico: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOppModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Criar Oportunidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MARK WON MODAL */}
      <Dialog open={wonModalOpen} onOpenChange={setWonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-600 font-legal-serif flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Converter Lead em Cliente Ganho
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkWon} className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Esta ação converterá o lead em um <strong>Cliente Ativo</strong> com histórico
              permanente e disparará o evento de conversão Purchase para o Meta Ads.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Valor Total do Contrato Fechado (R$) *
              </Label>
              <Input
                required
                type="number"
                value={wonData.value}
                onChange={(e) => setWonData({ ...wonData, value: Number(e.target.value) })}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço Jurídico Contratado</Label>
              <Input
                value={wonData.servico}
                onChange={(e) => setWonData({ ...wonData, servico: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações do Fechamento</Label>
              <Textarea
                rows={3}
                value={wonData.observacoes}
                onChange={(e) => setWonData({ ...wonData, observacoes: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWonModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar Contratação (Ganho)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MARK LOST MODAL */}
      <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 font-legal-serif flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Registrar Motivo de Perda
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkLost} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo Principal da Perda *</Label>
              <Select
                value={lostData.loss_reason}
                onValueChange={(val) => setLostData({ ...lostData, loss_reason: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preço">Preço / Honorários Elevados</SelectItem>
                  <SelectItem value="sem_interesse">Sem Interesse no Momento</SelectItem>
                  <SelectItem value="sem_retorno">Não Respondeu / Sem Contato</SelectItem>
                  <SelectItem value="concorrente">Fechou com Concorrente</SelectItem>
                  <SelectItem value="sem_viabilidade">Caso Sem Viabilidade Jurídica</SelectItem>
                  <SelectItem value="desistencia">Desistência do Cliente</SelectItem>
                  <SelectItem value="outro">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Detalhadas</Label>
              <Textarea
                rows={3}
                value={lostData.observacoes}
                onChange={(e) => setLostData({ ...lostData, observacoes: e.target.value })}
                placeholder="Explique o feedback recebido para enriquecer os relatórios de inteligência comercial..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLostModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" variant="destructive">
                Salvar Perda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default LeadDetailPage
