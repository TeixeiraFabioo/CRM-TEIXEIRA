import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'

export function NotificationsDropdown() {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(3)
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Lead Quente Sem Atendimento',
      desc: 'Lead VIP Dr. Carlos Mendonça (Vanguarda Logística) aguarda contato há 18 min.',
      type: 'hot',
      time: '18 min atrás',
      link: '/leads',
      read: false,
    },
    {
      id: '2',
      title: 'Oportunidade parada há mais de 48h',
      desc: 'Defesa Execução Fiscal R$ 35.000 parada na etapa Negociação.',
      type: 'warning',
      time: '2 horas atrás',
      link: '/pipeline',
      read: false,
    },
    {
      id: '3',
      title: 'Campanha Meta Ads com alto ROAS',
      desc: 'Campanha Recuperação PIS/COFINS atingiu ROAS 17.75x este mês.',
      type: 'success',
      time: 'Hoje, 09:30',
      link: '/campanhas',
      read: false,
    },
  ])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markItemRead = (id: string, link: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    navigate(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
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
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 bg-primary/10 text-primary">
                {unreadCount} novas
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
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markItemRead(n.id, n.link)}
              className={`p-3.5 flex gap-3 cursor-pointer hover:bg-muted/60 transition-colors ${
                !n.read ? 'bg-primary/5' : ''
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
          ))}
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
