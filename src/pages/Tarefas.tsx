import React, { useState, useEffect } from 'react'
import {
  CheckSquare,
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
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { TaskRecord, UserRecord, LeadRecord } from '@/types/platform'

export function TarefasPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<TaskRecord>>({
    titulo: '',
    tipo: 'reuniao',
    prioridade: 'alta',
    status: 'pendente',
    data: new Date().toISOString().slice(0, 10),
    horario: '10:00',
    descricao: '',
    lead_id: '',
    responsavel_id: '',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [tList, uList, lList] = await Promise.all([
        CrmService.getTasks(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getLeads(tenant.id),
      ])
      setTasks(tList)
      setUsers(uList)
      setLeads(lList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.titulo) return
    try {
      await CrmService.createTask(tenant.id, formData)
      toast({ title: 'Tarefa/Compromisso agendado com sucesso!' })
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
        responsavel_id: '',
      })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
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

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true
    return t.status === statusFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-legal-serif">Tarefas &amp; Agenda Jurídica</h1>
            <Badge variant="outline">{filteredTasks.length} tarefas</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhamento de prazos, reuniões de fechamento, ligações e retornos.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Tarefa / Reunião
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-3 flex justify-between items-center text-xs">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="h-7 text-xs"
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === 'pendente' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('pendente')}
            className="h-7 text-xs"
          >
            Pendentes
          </Button>
          <Button
            variant={statusFilter === 'concluida' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('concluida')}
            className="h-7 text-xs"
          >
            Concluídas
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="divide-y text-xs">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando tarefas...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma tarefa encontrada.</div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                  t.status === 'concluida' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTaskStatus(t)}
                    className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                      t.status === 'concluida'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {t.status === 'concluida' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span className={t.status === 'concluida' ? 'line-through' : ''}>
                        {t.titulo}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {t.tipo}
                      </Badge>
                      <Badge
                        className={`text-[10px] h-4 ${
                          t.prioridade === 'urgente'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {t.prioridade}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                      <span>
                        Data: {t.data ? new Date(t.data).toLocaleDateString('pt-BR') : 'Hoje'} às{' '}
                        {t.horario || '10:00'}
                      </span>
                      {t.expand?.lead_id && <span>Lead: {t.expand.lead_id.name}</span>}
                      {t.expand?.responsavel_id && (
                        <span>Resp: {t.expand.responsavel_id.name}</span>
                      )}
                    </div>
                    {t.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTaskStatus(t)}
                  className="h-7 text-xs"
                >
                  {t.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Nova Tarefa / Reunião
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vincular a Lead</Label>
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
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default TarefasPage
