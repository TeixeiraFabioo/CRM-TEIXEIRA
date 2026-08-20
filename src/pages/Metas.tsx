import React, { useState, useEffect } from 'react'
import { TrendingUp, Target, Plus, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { GoalRecord } from '@/types/platform'

export function MetasPage() {
  const { tenant } = useTenant()
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const list = await CrmService.getGoals(tenant.id)
        setGoals(list)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenant?.id])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">
            Metas Comerciais &amp; Faturamento
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhamento de metas de receita, contratos fechados e captação de leads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.valor_atual / (g.valor_alvo || 1)) * 100))
          return (
            <div key={g.id} className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm">{g.titulo}</h3>
                  <div className="text-xs text-muted-foreground">Equipe: {g.equipe || 'Geral'}</div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  {pct}% Atingido
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Atual: R$ {g.valor_atual.toLocaleString('pt-BR')}</span>
                  <span>Alvo: R$ {g.valor_alvo.toLocaleString('pt-BR')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default MetasPage
