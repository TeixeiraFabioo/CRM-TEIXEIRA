import React from 'react'
import {
  UserPlus,
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  Tag,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface TimelineItem {
  id: string
  type:
    | 'creation'
    | 'message'
    | 'note'
    | 'task'
    | 'proposal'
    | 'contract'
    | 'won'
    | 'lost'
    | 'stage'
    | 'status'
  title: string
  description?: string
  date: string
  author?: string
  badge?: string
}

interface TimelineViewProps {
  items: TimelineItem[]
  className?: string
}

export function TimelineView({ items, className = '' }: TimelineViewProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl border-dashed p-6">
        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
        Nenhum evento registrado nesta linha do tempo.
      </div>
    )
  }

  const getIconAndColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'creation':
        return {
          icon: UserPlus,
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        }
      case 'message':
        return {
          icon: MessageSquare,
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        }
      case 'note':
        return {
          icon: FileText,
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        }
      case 'task':
        return {
          icon: Calendar,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        }
      case 'proposal':
        return {
          icon: DollarSign,
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        }
      case 'contract':
        return {
          icon: Briefcase,
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        }
      case 'won':
        return { icon: CheckCircle2, bg: 'bg-emerald-600 text-white border-emerald-600' }
      case 'lost':
        return { icon: XCircle, bg: 'bg-rose-600 text-white border-rose-600' }
      case 'stage':
      case 'status':
      default:
        return { icon: Tag, bg: 'bg-blue-600/10 text-blue-600 border-blue-500/20' }
    }
  }

  return (
    <div
      className={`relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border ${className}`}
    >
      {items.map((item) => {
        const { icon: Icon, bg } = getIconAndColor(item.type)
        return (
          <div key={item.id} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110 ${bg}`}
            >
              <Icon className="h-3 w-3" />
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs group-hover:border-border transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {item.date
                    ? new Date(item.date).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : ''}
                </span>
              </div>

              {item.description && (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.description}
                </p>
              )}

              {item.author && (
                <div className="mt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
                  <span>Registrado por:</span>
                  <span className="font-medium text-foreground">{item.author}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
