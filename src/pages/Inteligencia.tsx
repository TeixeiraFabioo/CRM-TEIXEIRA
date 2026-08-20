import React from 'react'
import {
  Brain,
  Sparkles,
  Flame,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

export function InteligenciaPage() {
  const navigate = useNavigate()

  const insights = [
    {
      title: 'Top Canal por Retorno Financeiro: Meta Ads',
      desc: 'O canal Meta Ads gera o maior ticket médio (R$ 25.000) e o maior volume de clientes B2B qualificados para recuperação tributária.',
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      title: 'Gargalo Detectado: Tempo de Resposta em Leads de Final de Semana',
      desc: 'Leads gerados no sábado e domingo levam em média 14h para primeiro contato. A taxa de conversão cai de 28% para 9%.',
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
    {
      title: 'Principal Motivo de Perda: Preço / Honorários de Entrada',
      desc: '48% dos leads que não fecham alegam dificuldade com valor de entrada fixo. Recomendação: Oferecer modelo com percentual de êxito maior.',
      icon: Target,
      color: 'text-rose-600',
    },
  ]

  const alerts = [
    {
      id: '1',
      title: '3 Leads Quentes sem Follow-up há mais de 24 horas',
      action: 'Ver leads pendentes',
      link: '/leads',
    },
    {
      id: '2',
      title: '2 Propostas de Alto Valor (R$ 70k+) expirando em 48h',
      action: 'Ver propostas',
      link: '/propostas',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-legal-serif">
              Inteligência Comercial &amp; Recomendações IA
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Diagnósticos automatizados, identificação de gargalos e oportunidades de otimização no
              escritório.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Flame className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{a.title}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(a.link)}
              className="h-7 text-xs"
            >
              {a.action} →
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-sm">Diagnósticos &amp; Análises Baseadas em Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {insights.map((ins, i) => {
            const Icon = ins.icon
            return (
              <div key={i} className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${ins.color}`} />
                  <h4 className="font-bold text-sm">{ins.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default InteligenciaPage
