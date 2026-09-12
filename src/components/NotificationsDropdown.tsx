import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  UserX,
  ExternalLink,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'

export interface RealNotification {
  id: string
  title: string
  desc: string
  type: 'hot' | 'warning' | 'unassigned' | 'success'
  time: string
  link: string
  read: boolean
}

export function NotificationsDropdown() {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<RealNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const fetchRealNotifications = useCallback(async () => {
    if (!tenant?.id) {
      setNotifications([])
      return
    }

    setLoading(true)
    try {
      const [leads, tasks, messagesMap] = await Promise.all([
        CrmService.getLeads(tenant.id),
        CrmService.getTasks(tenant.id),
        CrmService.getLeadsWithMessagesMap(tenant.id),
      ])

      const list: RealNotification[] = []
      const INITIAL_STATUSES = new Set(['novo', 'Novo Lead', 'qualificado_ia', 'Qualificado'])

      // 1. Leads quentes aguardando primeiro contato (soft_delete=false já vem de CrmService.getLeads)
      const hotAwaiting = leads.filter(
        (l) =>
          INITIAL_STATUSES.has(l.status || 'novo') &&
          !messagesMap.has(l.id) &&
          !l.last_inbound_message_at &&
          !l.last_outbound_message_at,
      )

      if (hotAwaiting.length > 0) {
        list.push({
          id: 'hot_leads_alert',
          title: `${hotAwaiting.length} ${
            hotAwaiting.length === 1
              ? 'Lead Quente aguarda contato'
              : 'Leads Quentes aguardam contato'
          }`,
          desc:
            hotAwaiting.length === 1
              ? `${hotAwaiting[0].name || 'Novo Lead'} aguarda primeiro atendimento.`
              : `${hotAwaiting.length} leads aguardam atendimento. Atenda em até 15 minutos para maximizar a conversão.`,
          type: 'hot',
          time: 'Ação prioritária',
          link: '/leads?status=novo',
          read: false,
        })
      }

      // 2. Leads novos não atribuídos (sem responsável definido)
      const unassignedLeads = leads.filter(
        (l) => !l.responsavel_id && INITIAL_STATUSES.has(l.status || 'novo'),
      )

      if (unassignedLeads.length > 0) {
        list.push({
          id: 'unassigned_leads_alert',
          title: `${unassignedLeads.length} ${
            unassignedLeads.length === 1 ? 'Lead sem responsável' : 'Leads sem responsável'
          }`,
          desc:
            unassignedLeads.length === 1
              ? `O lead "${unassignedLeads[0].name}" ainda não possui advogado responsável atribuído.`
              : `Existem ${unassignedLeads.length} leads recém-chegados aguardando atribuição de responsável.`,
          type: 'unassigned',
          time: 'Aguardando atribuição',
          link: '/leads',
          read: false,
        })
      }

      // 3. Tarefas atrasadas ou que vencem hoje (pendentes ou em andamento)
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)

      const overdueOrTodayTasks = tasks.filter((t) => {
        if (t.status === 'concluida' || t.status === 'cancelada') return false
        if (!t.data) return false
        const taskDate = t.data.slice(0, 10)
        return taskDate <= todayStr
      })

      if (overdueOrTodayTasks.length > 0) {
        const overdueCount = overdueOrTodayTasks.filter(
          (t) => t.data && t.data.slice(0, 10) < todayStr,
        ).length
        const todayCount = overdueOrTodayTasks.length - overdueCount

        let descText = ''
        if (overdueCount > 0 && todayCount > 0) {
          descText = `${overdueCount} atrasada(s) e ${todayCount} agendada(s) para hoje.`
        } else if (overdueCount > 0) {
          descText = `${overdueCount} tarefa(s) ou reunião(ões) com prazo expirado pendente.`
        } else {
          descText = `${todayCount} tarefa(s) jurídica(s) com compromisso agendado para hoje.`
        }

        list.push({
          id: 'pending_tasks_alert',
          title: `${overdueOrTodayTasks.length} ${
            overdueOrTodayTasks.length === 1
              ? 'Tarefa / Reunião para hoje'
              : 'Tarefas / Reuniões urgentes'
          }`,
          desc: descText,
          type: 'warning',
          time: overdueCount > 0 ? 'Atrasada' : 'Hoje',
          link: '/tarefas',
          read: false,
        })
      }

      setNotifications(list)
    } catch (e) {
      console.warn('Erro ao carregar notificações reais:', e)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [tenant?.id])

  useEffect(() => {
    fetchRealNotifications()
  }, [fetchRealNotifications])

  const unreadCount = notifications.filter((n) => !readIds.has(n.id) && !n.read).length

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)))
  }

  const markItemRead = (id: string, link: string) => {
    setReadIds((prev) => new Set([...prev, id]))
    navigate(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-border/80">
        <div className="flex items-center justify-between p-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notificações &amp; Alertas</span>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="text-[10px] h-4 bg-primary/10 text-primary">
                {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">
                0 novas
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar lidas
            </Button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50 custom-scrollbar">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Verificando alertas do sistema...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="h-9 w-9 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-foreground">Tudo em dia!</p>
              <p className="text-[11px] text-muted-foreground">
                Nenhum lead pendente de atendimento, tarefa atrasada ou pendência urgente no
                momento.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isRead = readIds.has(n.id) || n.read
              return (
                <div
                  key={n.id}
                  onClick={() => markItemRead(n.id, n.link)}
                  className={`p-3.5 flex gap-3 cursor-pointer hover:bg-muted/60 transition-colors ${
                    !isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5">
                    {n.type === 'hot' && (
                      <div className="h-7 w-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                        <Flame className="h-4 w-4 animate-bounce" />
                      </div>
                    )}
                    {n.type === 'warning' && (
                      <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}
                    {n.type === 'unassigned' && (
                      <div className="h-7 w-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <UserX className="h-4 w-4" />
                      </div>
                    )}
                    {n.type === 'success' && (
                      <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-semibold text-foreground truncate">{n.title}</h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-2 border-t text-center bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inteligencia')}
            className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Ver central de inteligência e alertas comerciais
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
