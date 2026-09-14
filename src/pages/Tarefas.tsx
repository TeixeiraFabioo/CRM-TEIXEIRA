import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  Video,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  CalendarDays,
  ListTodo,
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
import { useTenant, useUserRole } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { TaskRecord, UserRecord, LeadRecord, OpportunityRecord } from '@/types/platform'
import { Edit2, Trash2 } from 'lucide-react'
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

export function TarefasPage() {
  const { tenant, user } = useTenant()
  const { role: userRole } = useUserRole()
  const { toast } = useToast()

  const canDeleteMeeting = userRole === 'admin' || userRole === 'gestor'

  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [googleMeetError, setGoogleMeetError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<'list' | 'weekly' | 'daily'>('list')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'concluida'>('all')
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  // Estados de Edição e Exclusão
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskRecord | null>(null)
  const [deletingTask, setDeletingTask] = useState(false)

  // Quando o modal abre ou o usuário logado carrega, pré-seleciona o responsavel_id se vazio
  useEffect(() => {
    if (createModalOpen && user?.id && !formData.responsavel_id) {
      setFormData((prev) => ({ ...prev, responsavel_id: user.id }))
    }
  }, [createModalOpen, user?.id])

  const [formData, setFormData] = useState<{
    titulo: string
    tipo: TaskRecord['tipo']
    prioridade: TaskRecord['prioridade']
    status: TaskRecord['status']
    data: string
    horario: string
    descricao: string
    lead_id: string
    oportunidade_id: string
    responsavel_id: string
    participantes: string
    meet_link: string
  }>({
    titulo: '',
    tipo: 'reuniao',
    prioridade: 'alta',
    status: 'pendente',
    data: new Date().toISOString().slice(0, 10),
    horario: '10:00',
    descricao: '',
    lead_id: '',
    oportunidade_id: '',
    responsavel_id: user?.id || '',
    participantes: '',
    meet_link: '',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [tList, uList, lList, oppList, googleCfg] = await Promise.all([
        CrmService.getTasks(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getLeads(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getGoogleMeetConfig(tenant.id),
      ])
      setTasks(tList)
      setUsers(uList)
      setLeads(lList)
      setOpportunities(oppList)
      setGoogleMeetError(googleCfg.error_message || '')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  // Normalização de data para YYYY-MM-DD
  const formatYmd = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Helper de parse de participantes
  const getParticipantsList = (task: TaskRecord): string[] => {
    if (!task.participantes) return []
    if (Array.isArray(task.participantes)) {
      return task.participantes.map(String).filter(Boolean)
    }
    if (typeof task.participantes === 'string') {
      try {
        const parsed = JSON.parse(task.participantes)
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
      } catch {
        /* intentionally ignored */
      }
      return task.participantes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }

  // Detecção de conflito de agenda (mesmo responsável, mesma data e mesmo horário em tarefas pendentes/em_andamento)
  const conflictMap = useMemo(() => {
    const map = new Set<string>()
    const activeTasks = tasks.filter(
      (t) => t.status !== 'concluida' && t.status !== 'cancelada' && t.data && t.horario,
    )

    for (let i = 0; i < activeTasks.length; i++) {
      for (let j = i + 1; j < activeTasks.length; j++) {
        const a = activeTasks[i]
        const b = activeTasks[j]
        const aResp = a.responsavel_id || 'unassigned'
        const bResp = b.responsavel_id || 'unassigned'
        const aDate = (a.data || '').slice(0, 10)
        const bDate = (b.data || '').slice(0, 10)
        const aTime = (a.horario || '').slice(0, 5)
        const bTime = (b.horario || '').slice(0, 5)

        if (aResp === bResp && aDate === bDate && aTime === bTime) {
          map.add(a.id)
          map.add(b.id)
        }
      }
    }
    return map
  }, [tasks])

  // Contador de carga de trabalho por responsável (tarefas pendentes ativas)
  const workloadByUser = useMemo(() => {
    const counts: Record<
      string,
      { total: number; urgente: number; hoje: number; reunioes: number }
    > = {}
    const todayStr = formatYmd(new Date())

    tasks.forEach((t) => {
      if (t.status === 'concluida' || t.status === 'cancelada') return
      const uId = t.responsavel_id || 'unassigned'
      if (!counts[uId]) {
        counts[uId] = { total: 0, urgente: 0, hoje: 0, reunioes: 0 }
      }
      counts[uId].total += 1
      if (t.prioridade === 'urgente') counts[uId].urgente += 1
      if ((t.data || '').slice(0, 10) === todayStr) counts[uId].hoje += 1
      if (t.tipo === 'reuniao') counts[uId].reunioes += 1
    })

    return counts
  }, [tasks])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.titulo.trim()) return

    if (formData.tipo === 'reuniao' && !formData.responsavel_id) {
      toast({
        title: 'Responsável obrigatório',
        description: 'Selecione um responsável para agendar a reunião.',
        variant: 'destructive',
      })
      return
    }

    setSavingTask(true)
    try {
      // Sanitização de participantes: o backend espera ids de usuários válidos
      const userIdsList = users.map((u) => u.id)
      const participantsArray = formData.participantes
        ? formData.participantes
            .split(',')
            .map((p) => p.trim())
            .filter((p) => userIdsList.includes(p))
        : []

      await CrmService.createTask(tenant.id, {
        titulo: formData.titulo.trim(),
        tipo: formData.tipo,
        prioridade: formData.prioridade,
        status: formData.status,
        data: formData.data || undefined,
        horario: formData.horario || undefined,
        descricao: formData.descricao?.trim() || undefined,
        lead_id: formData.lead_id || undefined,
        oportunidade_id: formData.oportunidade_id || undefined,
        responsavel_id: formData.responsavel_id || undefined,
        meet_link: formData.meet_link?.trim() || undefined,
        participantes: participantsArray,
      })

      toast({
        title: 'Tarefa / Reunião agendada com sucesso!',
        description:
          formData.tipo === 'reuniao' ? 'Se integrado, o link Google Meet será gerado.' : undefined,
      })
      setCreateModalOpen(false)
      setFormData({
        titulo: '',
        tipo: 'reuniao',
        prioridade: 'alta',
        status: 'pendente',
        data: new Date().toISOString().slice(0, 10),
        horario: '10:00',
        descricao: '',
        lead_id: '',
        oportunidade_id: '',
        responsavel_id: user?.id || '',
        participantes: '',
        meet_link: '',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar tarefa',
        description: err?.message || 'Falha ao gravar registro.',
        variant: 'destructive',
      })
    } finally {
      setSavingTask(false)
    }
  }

  const openEditModal = (task: TaskRecord) => {
    setEditingTask(task)
    setFormData({
      titulo: task.titulo || '',
      tipo: task.tipo || 'reuniao',
      prioridade: task.prioridade || 'alta',
      status: task.status || 'pendente',
      data: task.data ? task.data.slice(0, 10) : new Date().toISOString().slice(0, 10),
      horario: task.horario ? task.horario.slice(0, 5) : '10:00',
      descricao: task.descricao || '',
      lead_id: task.lead_id || '',
      oportunidade_id: task.oportunidade_id || '',
      responsavel_id: task.responsavel_id || user?.id || '',
      participantes: Array.isArray(task.participantes)
        ? task.participantes.join(', ')
        : typeof task.participantes === 'string'
          ? task.participantes
          : '',
      meet_link: task.meet_link || '',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask?.id || !formData.titulo.trim()) return

    if (formData.tipo === 'reuniao' && !formData.responsavel_id) {
      toast({
        title: 'Responsável obrigatório',
        description: 'Selecione um responsável para a reunião.',
        variant: 'destructive',
      })
      return
    }

    setUpdatingTask(true)
    try {
      const userIdsList = users.map((u) => u.id)
      const participantsArray = formData.participantes
        ? formData.participantes
            .split(',')
            .map((p) => p.trim())
            .filter((p) => userIdsList.includes(p))
        : []

      await CrmService.updateTask(editingTask.id, {
        titulo: formData.titulo.trim(),
        tipo: formData.tipo,
        prioridade: formData.prioridade,
        status: formData.status,
        data: formData.data || undefined,
        horario: formData.horario || undefined,
        descricao: formData.descricao?.trim() || undefined,
        lead_id: formData.lead_id || undefined,
        oportunidade_id: formData.oportunidade_id || undefined,
        responsavel_id: formData.responsavel_id || undefined,
        meet_link: formData.meet_link?.trim() || undefined,
        participantes: participantsArray,
      })

      toast({
        title: 'Compromisso atualizado!',
        description:
          formData.tipo === 'reuniao'
            ? 'Alterações sincronizadas com o Google Calendar se integrado.'
            : undefined,
      })
      setEditModalOpen(false)
      setEditingTask(null)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: err?.message || 'Falha ao atualizar registro.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingTask(false)
    }
  }

  const confirmDeleteTask = (task: TaskRecord) => {
    setTaskToDelete(task)
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!taskToDelete?.id) return
    setDeletingTask(true)
    try {
      await CrmService.deleteTask(taskToDelete.id)
      toast({
        title: 'Compromisso excluído',
        description:
          taskToDelete.tipo === 'reuniao'
            ? 'A reunião foi removida e o evento cancelado no Calendar.'
            : 'Tarefa removida com sucesso.',
      })
      setDeleteModalOpen(false)
      setTaskToDelete(null)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir compromisso',
        description: err?.message || 'Apenas administradores e gestores podem excluir reuniões.',
        variant: 'destructive',
      })
    } finally {
      setDeletingTask(false)
    }
  }

  const toggleTaskStatus = async (task: TaskRecord) => {
    const nextStatus = task.status === 'concluida' ? 'pendente' : 'concluida'
    try {
      await CrmService.updateTask(task.id, {
        status: nextStatus,
        data_conclusao: nextStatus === 'concluida' ? new Date().toISOString() : undefined,
      })
      toast({ title: `Tarefa marcada como ${nextStatus}` })
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' })
    }
  }

  // Filtragem
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          if (t.responsavel_id) return false
        } else if (t.responsavel_id !== selectedUserFilter) {
          return false
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = t.titulo?.toLowerCase().includes(q)
        const matchDesc = t.descricao?.toLowerCase().includes(q)
        const matchLead = t.expand?.lead_id?.name?.toLowerCase().includes(q)
        const matchResp = t.expand?.responsavel_id?.name?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchLead && !matchResp) return false
      }
      return true
    })
  }, [tasks, statusFilter, selectedUserFilter, searchQuery])

  // Cálculo da semana selecionada (Segunda a Domingo)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate)
    const day = curr.getDay()
    // Ajuste para começar na segunda-feira
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(curr.setDate(diffToMonday))

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }, [selectedDate])

  const selectedDateYmd = formatYmd(selectedDate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-legal-serif text-foreground">
              Tarefas &amp; Agenda Jurídica
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredTasks.length} de {tasks.length}
            </Badge>
            {conflictMap.size > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {conflictMap.size} conflitos de agenda
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de prazos, reuniões (Google Meet), audiências e contador de carga por
            responsável.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 bg-[#0A1F3F] text-white hover:bg-[#0e2a56] text-xs font-semibold shadow-2xs"
          >
            <Plus className="h-4 w-4" /> Nova Tarefa / Reunião
          </Button>
        </div>
      </div>

      {/* Banner de erro da integração com Google Calendar se houver erro */}
      {googleMeetError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
            <div className="space-y-1">
              <p className="font-bold text-sm">
                Falha na integração com Google Meet &amp; Calendar
              </p>
              <p className="text-destructive/90 leading-relaxed">
                Mensagem do Google / Sistema:{' '}
                <span className="font-semibold">{googleMeetError}</span>
              </p>
              {(googleMeetError.toLowerCase().includes('invalid_grant') ||
                googleMeetError.toLowerCase().includes('unauthorized') ||
                googleMeetError.toLowerCase().includes('revogada') ||
                googleMeetError.toLowerCase().includes('expirada')) && (
                <p className="text-[11px] text-muted-foreground bg-background/60 p-2 rounded-md border border-destructive/20 mt-1">
                  💡 <strong>Como resolver:</strong> O Refresh Token informado foi revogado ou
                  expirou. Gere um novo Refresh Token através do Google OAuth 2.0 Playground com o
                  escopo{' '}
                  <code className="font-mono text-foreground font-semibold">
                    https://www.googleapis.com/auth/calendar.events
                  </code>{' '}
                  e atualize na Central de Integrações.
                </p>
              )}
            </div>
          </div>
          <a
            href="/integracoes"
            className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Reconfigurar Credenciais OAuth →
          </a>
        </div>
      )}

      {/* Carga de trabalho por Responsável (Cenário 2) */}
      <div className="bg-card border rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Distribuição de Carga de Trabalho (Tarefas Ativas)</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Clique no responsável para filtrar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedUserFilter('all')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedUserFilter === 'all'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-border/70 hover:bg-muted/40'
            }`}
          >
            <div className="text-[11px] font-medium text-muted-foreground truncate">
              Todos os Responsáveis
            </div>
            <div className="text-lg font-bold mt-0.5 font-legal-serif">
              {tasks.filter((t) => t.status !== 'concluida' && t.status !== 'cancelada').length}
            </div>
            <div className="text-[10px] text-muted-foreground">ativas no total</div>
          </button>

          {users.map((u) => {
            const load = workloadByUser[u.id] || { total: 0, urgente: 0, hoje: 0, reunioes: 0 }
            const isSelected = selectedUserFilter === u.id
            const isOverloaded = load.total >= 8

            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserFilter(isSelected ? 'all' : u.id)}
                className={`p-2.5 rounded-lg border text-left transition-all relative ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border/70 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold truncate text-foreground">
                    {u.name || u.email}
                  </span>
                  {isOverloaded && (
                    <span
                      title="Carga elevada: mais de 8 tarefas pendentes"
                      className="h-2 w-2 rounded-full bg-rose-500 shrink-0"
                    />
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold font-legal-serif">{load.total}</span>
                  <span className="text-[10px] text-muted-foreground">tarefas</span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  {load.urgente > 0 && (
                    <span className="text-rose-600 font-semibold">{load.urgente} urgentes</span>
                  )}
                  {load.reunioes > 0 && <span>• {load.reunioes} reun.</span>}
                </div>
              </button>
            )
          })}

          {workloadByUser['unassigned']?.total > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelectedUserFilter(selectedUserFilter === 'unassigned' ? 'all' : 'unassigned')
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedUserFilter === 'unassigned'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border/70 hover:bg-muted/40'
              }`}
            >
              <div className="text-[11px] font-medium text-amber-600 truncate">Sem Responsável</div>
              <div className="text-lg font-bold mt-0.5 font-legal-serif text-amber-600">
                {workloadByUser['unassigned'].total}
              </div>
              <div className="text-[10px] text-muted-foreground">pendentes de triagem</div>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros & Alternância de Visualização */}
      <div className="bg-card border rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, lead, responsável..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="h-7 text-xs px-2.5"
            >
              Todas
            </Button>
            <Button
              variant={statusFilter === 'pendente' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('pendente')}
              className="h-7 text-xs px-2.5"
            >
              Pendentes
            </Button>
            <Button
              variant={statusFilter === 'concluida' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('concluida')}
              className="h-7 text-xs px-2.5"
            >
              Concluídas
            </Button>
          </div>
        </div>

        {/* Modos de Visão */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 text-xs gap-1.5"
          >
            <ListTodo className="h-3.5 w-3.5" /> Lista
          </Button>
          <Button
            variant={viewMode === 'weekly' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('weekly')}
            className="h-7 text-xs gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Semanal
          </Button>
          <Button
            variant={viewMode === 'daily' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('daily')}
            className="h-7 text-xs gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" /> Diária
          </Button>
        </div>
      </div>

      {/* Conteúdo: Lista, Semanal ou Diária */}
      {viewMode === 'list' && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-2xs">
          <div className="divide-y text-xs">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando tarefas...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma tarefa encontrada para os filtros selecionados.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const hasConflict = conflictMap.has(t.id)
                const participants = getParticipantsList(t)
                const isCompleted = t.status === 'concluida'

                return (
                  <div
                    key={t.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                      isCompleted ? 'opacity-60 bg-muted/10' : ''
                    } ${hasConflict ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(t)}
                        title={isCompleted ? 'Reabrir tarefa' : 'Concluir tarefa'}
                        className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>

                      <div className="space-y-1">
                        <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                          <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                            {t.titulo}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 uppercase">
                            {t.tipo}
                          </Badge>
                          <Badge
                            className={`text-[10px] h-4 ${
                              t.prioridade === 'urgente'
                                ? 'bg-rose-500/10 text-rose-600'
                                : t.prioridade === 'alta'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {t.prioridade}
                          </Badge>

                          {hasConflict && (
                            <Badge className="bg-amber-500 text-white text-[10px] h-4 gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Conflito de Horário
                            </Badge>
                          )}

                          {t.meet_link ? (
                            <a
                              href={t.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium bg-blue-500/10 px-2 py-0.5 rounded-md"
                            >
                              <Video className="h-3 w-3" /> Entrar no Google Meet
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            t.tipo === 'reuniao' &&
                            googleMeetError && (
                              <span
                                title={`Evento não criado no Google Calendar: ${googleMeetError}`}
                                className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-medium"
                              >
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>Evento não criado no Google Calendar: {googleMeetError}</span>
                              </span>
                            )
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.data
                              ? new Date(t.data).toLocaleDateString('pt-BR')
                              : 'Data não definida'}{' '}
                            às {t.horario || '10:00'}
                          </span>

                          {t.expand?.responsavel_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Resp: <strong>{t.expand.responsavel_id.name}</strong>
                            </span>
                          )}

                          {t.expand?.lead_id && (
                            <span className="flex items-center gap-1">
                              Lead: <strong>{t.expand.lead_id.name}</strong>
                            </span>
                          )}

                          {participants.length > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <Users className="h-3 w-3" />
                              {participants.length} participante(s): {participants.join(', ')}
                            </span>
                          )}
                        </div>

                        {t.descricao && (
                          <p className="text-xs text-muted-foreground pt-0.5">{t.descricao}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTaskStatus(t)}
                        className="h-7 text-xs"
                      >
                        {isCompleted ? 'Reabrir' : 'Concluir'}
                      </Button>

                      {/* Botão Editar visível a todos os perfis */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(t)}
                        title="Editar compromisso"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {/* Botão Excluir apenas para admin e gestor */}
                      {(t.tipo !== 'reuniao' || canDeleteMeeting) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteTask(t)}
                          title="Excluir compromisso"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Visão Semanal */}
      {viewMode === 'weekly' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card border rounded-xl p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 7)
                  setSelectedDate(d)
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 7)
                  setSelectedDate(d)
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-foreground">
                Semana de {currentWeekDays[0].toLocaleDateString('pt-BR')} a{' '}
                {currentWeekDays[6].toLocaleDateString('pt-BR')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-7 text-xs"
            >
              Hoje
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {currentWeekDays.map((dayDate) => {
              const dayYmd = formatYmd(dayDate)
              const isToday = dayYmd === formatYmd(new Date())
              const dayTasks = filteredTasks.filter((t) => (t.data || '').slice(0, 10) === dayYmd)

              return (
                <div
                  key={dayYmd}
                  className={`bg-card border rounded-xl p-2.5 min-h-[300px] flex flex-col shadow-2xs ${
                    isToday ? 'border-primary ring-1 ring-primary/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b mb-2">
                    <span className="text-xs font-semibold capitalize">
                      {dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                    <Badge
                      variant={isToday ? 'default' : 'outline'}
                      className="text-[10px] h-4 font-mono px-1.5"
                    >
                      {dayDate.getDate()}
                    </Badge>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayTasks.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground/60 italic block text-center pt-6">
                        Sem tarefas
                      </span>
                    ) : (
                      dayTasks.map((t) => {
                        const hasConflict = conflictMap.has(t.id)
                        const isDone = t.status === 'concluida'

                        return (
                          <div
                            key={t.id}
                            className={`p-2 rounded-lg border text-left text-xs space-y-1 transition-all ${
                              isDone
                                ? 'opacity-50 line-through bg-muted/20'
                                : 'bg-background hover:border-primary'
                            } ${hasConflict ? 'border-amber-500 bg-amber-500/10' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-[11px] truncate">{t.titulo}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {t.horario || '10:00'}
                              </span>
                            </div>

                            {hasConflict && (
                              <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> Conflito
                              </div>
                            )}

                            {t.expand?.responsavel_id && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                👤 {t.expand.responsavel_id.name}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              {t.meet_link ? (
                                <a
                                  href={t.meet_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5 hover:underline"
                                >
                                  <Video className="h-2.5 w-2.5" /> Meet
                                </a>
                              ) : t.tipo === 'reuniao' && googleMeetError ? (
                                <span
                                  title={`Evento não criado no Google Calendar: ${googleMeetError}`}
                                  className="text-[9px] text-rose-600 font-medium flex items-center gap-1 bg-rose-500/10 px-1 py-0.5 rounded truncate"
                                >
                                  <AlertCircle className="h-2.5 w-2.5 shrink-0" /> Não sincronizado
                                </span>
                              ) : (
                                <div />
                              )}

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(t)}
                                  title="Editar compromisso"
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {(t.tipo !== 'reuniao' || canDeleteMeeting) && (
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteTask(t)}
                                    title="Excluir compromisso"
                                    className="text-muted-foreground hover:text-rose-600 p-0.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Visão Diária */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card border rounded-xl p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(d)
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d)
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-foreground">
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-7 text-xs"
            >
              Hoje
            </Button>
          </div>

          <div className="bg-card border rounded-xl divide-y text-xs shadow-2xs">
            {(() => {
              const dayTasks = filteredTasks.filter(
                (t) => (t.data || '').slice(0, 10) === selectedDateYmd,
              )
              if (dayTasks.length === 0) {
                return (
                  <div className="p-12 text-center text-muted-foreground">
                    Nenhum compromisso agendado para este dia.
                  </div>
                )
              }
              return dayTasks
                .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
                .map((t) => {
                  const hasConflict = conflictMap.has(t.id)
                  const participants = getParticipantsList(t)
                  const isDone = t.status === 'concluida'

                  return (
                    <div
                      key={t.id}
                      className={`p-4 flex items-center justify-between gap-3 ${
                        isDone ? 'opacity-60 bg-muted/20' : ''
                      } ${hasConflict ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="font-mono text-sm font-bold text-muted-foreground w-14 shrink-0 pt-0.5">
                          {t.horario || '10:00'}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold text-sm ${isDone ? 'line-through' : ''}`}
                            >
                              {t.titulo}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 uppercase">
                              {t.tipo}
                            </Badge>
                            {hasConflict && (
                              <Badge className="bg-amber-500 text-white text-[10px] h-4 gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> Conflito de Horário
                              </Badge>
                            )}
                            {t.meet_link ? (
                              <a
                                href={t.meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded font-medium hover:underline"
                              >
                                <Video className="h-3 w-3" /> Entrar Meet
                              </a>
                            ) : (
                              t.tipo === 'reuniao' &&
                              googleMeetError && (
                                <span
                                  title={`Evento não criado no Google Calendar: ${googleMeetError}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-medium"
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>
                                    Evento não criado no Google Calendar: {googleMeetError}
                                  </span>
                                </span>
                              )
                            )}
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                            {t.expand?.responsavel_id && (
                              <span>Resp: {t.expand.responsavel_id.name}</span>
                            )}
                            {t.expand?.lead_id && <span>Lead: {t.expand.lead_id.name}</span>}
                            {participants.length > 0 && (
                              <span className="text-primary">
                                Participantes: {participants.join(', ')}
                              </span>
                            )}
                          </div>
                          {t.descricao && (
                            <p className="text-xs text-muted-foreground">{t.descricao}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTaskStatus(t)}
                          className="h-7 text-xs"
                        >
                          {isDone ? 'Reabrir' : 'Concluir'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(t)}
                          title="Editar compromisso"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {(t.tipo !== 'reuniao' || canDeleteMeeting) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteTask(t)}
                            title="Excluir compromisso"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
            })()}
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Nova Tarefa / Reunião Jurídica
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Compromisso *</Label>
              <Input
                required
                placeholder="Ex: Reunião de Fechamento com Lead"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val: any) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião (Google Meet)</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="proposta">Apresentação Proposta</SelectItem>
                    <SelectItem value="documento">Análise Documental</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(val: any) => setFormData({ ...formData, prioridade: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horário</Label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Responsável{' '}
                  {formData.tipo === 'reuniao' && <span className="text-rose-500">*</span>}
                </Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(val) => setFormData({ ...formData, responsavel_id: val })}
                  required={formData.tipo === 'reuniao'}
                >
                  <SelectTrigger
                    className={`h-9 text-xs ${formData.tipo === 'reuniao' && !formData.responsavel_id ? 'border-rose-400' : ''}`}
                  >
                    <SelectValue placeholder="Selecione o responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.tipo === 'reuniao' && !formData.responsavel_id && (
                  <p className="text-[10px] text-rose-500">
                    Obrigatório para sincronizar agenda e Google Calendar.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vincular Lead</Label>
                <Select
                  value={formData.lead_id}
                  onValueChange={(val) => setFormData({ ...formData, lead_id: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Participantes (e-mails ou nomes) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Participantes Adicionais (Usuários da Equipe)
              </Label>
              <div className="grid grid-cols-2 gap-2 p-2 border rounded-md max-h-32 overflow-y-auto bg-muted/20">
                {users.map((u) => {
                  const parts = formData.participantes
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean)
                  const isChecked = parts.includes(u.id)
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 text-xs cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let nextParts: string[]
                          if (e.target.checked) {
                            nextParts = [...parts, u.id]
                          } else {
                            nextParts = parts.filter((p) => p !== u.id)
                          }
                          setFormData({ ...formData, participantes: nextParts.join(', ') })
                        }}
                        className="rounded"
                      />
                      <span className="truncate">{u.name || u.email}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Selecione os membros da equipe que participarão da reunião / compromisso.
              </p>
            </div>

            {/* Meet link opcional ou automático */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Link do Google Meet (Opcional)</Label>
              <Input
                placeholder="https://meet.google.com/abc-defg-hij (ou deixe em branco para gerar via Google Calendar)"
                value={formData.meet_link}
                onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pauta / Observações</Label>
              <Textarea
                rows={2}
                placeholder="Detalhes e objetivos da reunião..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={savingTask}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0A1F3F] text-white hover:bg-[#0e2a56]"
                disabled={savingTask}
              >
                {savingTask ? 'Agendando...' : 'Agendar Compromisso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Tarefa / Reunião (acessível a todos os perfis) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Editar Tarefa / Reunião Jurídica
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Compromisso *</Label>
              <Input
                required
                placeholder="Ex: Reunião de Fechamento com Lead"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val: any) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião (Google Meet)</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="proposta">Apresentação Proposta</SelectItem>
                    <SelectItem value="documento">Análise Documental</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(val: any) => setFormData({ ...formData, prioridade: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horário</Label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Responsável{' '}
                  {formData.tipo === 'reuniao' && <span className="text-rose-500">*</span>}
                </Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(val) => setFormData({ ...formData, responsavel_id: val })}
                  required={formData.tipo === 'reuniao'}
                >
                  <SelectTrigger
                    className={`h-9 text-xs ${formData.tipo === 'reuniao' && !formData.responsavel_id ? 'border-rose-400' : ''}`}
                  >
                    <SelectValue placeholder="Selecione o responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vincular Lead</Label>
                <Select
                  value={formData.lead_id}
                  onValueChange={(val) => setFormData({ ...formData, lead_id: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Participantes: lista de usuários sanitizados */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Participantes Adicionais (Usuários da Equipe)
              </Label>
              <div className="grid grid-cols-2 gap-2 p-2 border rounded-md max-h-32 overflow-y-auto bg-muted/20">
                {users.map((u) => {
                  const parts = formData.participantes
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean)
                  const isChecked = parts.includes(u.id)
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 text-xs cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let nextParts: string[]
                          if (e.target.checked) {
                            nextParts = [...parts, u.id]
                          } else {
                            nextParts = parts.filter((p) => p !== u.id)
                          }
                          setFormData({ ...formData, participantes: nextParts.join(', ') })
                        }}
                        className="rounded"
                      />
                      <span className="truncate">{u.name || u.email}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Meet Link */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Link do Google Meet</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={formData.meet_link}
                onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pauta / Observações</Label>
              <Textarea
                rows={2}
                placeholder="Detalhes e objetivos da reunião..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditModalOpen(false)
                  setEditingTask(null)
                }}
                disabled={updatingTask}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0A1F3F] text-white hover:bg-[#0e2a56]"
                disabled={updatingTask}
              >
                {updatingTask ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão (Admin e Gestor apenas) */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Excluir Compromisso
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o compromisso <strong>"{taskToDelete?.titulo}"</strong>
              ?
              {taskToDelete?.tipo === 'reuniao' && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  O evento correspondente também será cancelado no Google Calendar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTask}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deletingTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTask ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TarefasPage
