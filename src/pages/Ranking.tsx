import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Award,
  TrendingUp,
  Target,
  FileCheck,
  DollarSign,
  Users,
  Calendar,
  Medal,
  Percent,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { UserRecord, ContractRecord, LeadRecord, OpportunityRecord } from '@/types/platform'

interface SellerRank {
  user: UserRecord
  contractsCount: number
  totalValue: number
  leadsCount: number
  conversionRate: number
  avgTicket: number
}

export function RankingPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [ranks, setRanks] = useState<SellerRank[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'current_month' | 'last_month' | 'all_time'>('current_month')

  const loadRankingData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [usersList, contractsList, leadsList, oppsList] = await Promise.all([
        CrmService.getUsers(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getLeads(tenant.id),
        CrmService.getOpportunities(tenant.id),
      ])

      const now = new Date()
      let startPeriod = 0
      let endPeriod = Infinity

      if (period === 'current_month') {
        startPeriod = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        endPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()
      } else if (period === 'last_month') {
        startPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
        endPeriod = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime()
      }

      // Filter signed contracts
      const signedContracts = contractsList.filter((c) => {
        const isSigned =
          (c.status || '').toLowerCase() === 'assinado' ||
          (c.sign_status || '').toLowerCase() === 'signed'
        if (!isSigned) return false

        const cDate = c.data_assinatura
          ? new Date(c.data_assinatura).getTime()
          : c.created
            ? new Date(c.created).getTime()
            : 0

        if (startPeriod && cDate < startPeriod) return false
        if (endPeriod !== Infinity && cDate > endPeriod) return false
        return true
      })

      // Filter leads
      const periodLeads = leadsList.filter((l) => {
        const lDate = l.created ? new Date(l.created).getTime() : 0
        if (startPeriod && lDate < startPeriod) return false
        if (endPeriod !== Infinity && lDate > endPeriod) return false
        return true
      })

      // Map contracts to responsible user
      const oppMap = new Map<string, OpportunityRecord>()
      oppsList.forEach((opp) => oppMap.set(opp.id, opp))

      const sellerData = usersList.map((user) => {
        // Contracts where user is directly assigned or responsible for opp
        const userContracts = signedContracts.filter((c) => {
          if (c.oportunidade_id && oppMap.has(c.oportunidade_id)) {
            const op = oppMap.get(c.oportunidade_id)
            if (op?.assigned_to === user.id || op?.responsavel_id === user.id) return true
          }
          // fallback if contract has responsavel_id or if single user
          return false
        })

        // If no user matched but user is the only one, assign tenant contracts
        const effectiveContracts =
          userContracts.length > 0 ? userContracts : usersList.length === 1 ? signedContracts : []

        const contractsCount = effectiveContracts.length
        const totalValue = effectiveContracts.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

        // User leads
        const userLeads = periodLeads.filter(
          (l) =>
            l.assigned_to === user.id || l.responsavel_id === user.id || usersList.length === 1,
        )
        const leadsCount = userLeads.length

        // Conversion Rate (Leads -> Contracts)
        const conversionRate =
          leadsCount > 0
            ? Math.min(100, Math.round((contractsCount / leadsCount) * 100))
            : contractsCount > 0
              ? 100
              : 0

        const avgTicket = contractsCount > 0 ? totalValue / contractsCount : 0

        return {
          user,
          contractsCount,
          totalValue,
          leadsCount,
          conversionRate,
          avgTicket,
        }
      })

      // Sort by total value descending
      sellerData.sort((a, b) => b.totalValue - a.totalValue || b.contractsCount - a.contractsCount)

      setRanks(sellerData)
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Erro ao carregar ranking', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRankingData()
  }, [tenant?.id, period])

  // Summary Metrics
  const totalContractsAll = ranks.reduce((acc, r) => acc + r.contractsCount, 0)
  const totalValueAll = ranks.reduce((acc, r) => acc + r.totalValue, 0)
  const totalLeadsAll = ranks.reduce((acc, r) => acc + r.leadsCount, 0)
  const overallConversion =
    totalLeadsAll > 0
      ? Math.min(100, Math.round((totalContractsAll / totalLeadsAll) * 100))
      : totalContractsAll > 0
        ? 100
        : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Ranking &amp; Performance dos Advogados / Vendedores
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classificação em tempo real por contratos assinados, receita gerada e taxa de conversão
            no período.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="all_time">Todo o Período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Líder do Período</div>
            <div className="text-sm font-bold font-legal-serif truncate max-w-[150px]">
              {ranks[0]?.user?.name || 'Nenhum'}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Receita Total Fechada</div>
            <div className="text-lg font-bold font-legal-serif">
              R$ {totalValueAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Contratos Assinados</div>
            <div className="text-lg font-bold font-legal-serif text-emerald-600">
              {totalContractsAll}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Conversão Geral (Leads → Contrato)</div>
            <div className="text-lg font-bold font-legal-serif text-purple-600">
              {overallConversion}%
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && ranks.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place */}
          {ranks[1] && (
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs text-center space-y-2 relative order-2 md:order-1">
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center mx-auto text-xs border">
                2º
              </div>
              <h3 className="font-bold text-sm">{ranks[1].user.name}</h3>
              <div className="text-base font-bold text-primary font-mono">
                R$ {ranks[1].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {ranks[1].contractsCount} contratos • {ranks[1].conversionRate}% conv.
              </div>
            </div>
          )}

          {/* 1st Place Champion */}
          {ranks[0] && (
            <div className="bg-card border-2 border-amber-500/60 bg-amber-500/5 rounded-xl p-6 shadow-md text-center space-y-2 relative order-1 md:order-2 scale-105">
              <div className="h-10 w-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center mx-auto shadow-sm">
                <Trophy className="h-5 w-5" />
              </div>
              <Badge className="bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold">
                1º Lugar Campeão
              </Badge>
              <h3 className="font-bold text-base text-foreground font-legal-serif">
                {ranks[0].user.name}
              </h3>
              <div className="text-xl font-bold text-emerald-600 font-mono">
                R$ {ranks[0].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {ranks[0].contractsCount} contratos assinados • {ranks[0].conversionRate}% conversão
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {ranks[2] && (
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs text-center space-y-2 relative order-3">
              <div className="h-8 w-8 rounded-full bg-amber-700/20 text-amber-800 font-bold flex items-center justify-center mx-auto text-xs border border-amber-700/30">
                3º
              </div>
              <h3 className="font-bold text-sm">{ranks[2].user.name}</h3>
              <div className="text-base font-bold text-primary font-mono">
                R$ {ranks[2].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {ranks[2].contractsCount} contratos • {ranks[2].conversionRate}% conv.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
          <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            Tabela Completa de Classificação
          </h3>
          <span className="text-xs text-muted-foreground">
            Ordenado por <strong>Valor Total Fechado</strong>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : ranks.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Nenhum dado de vendedores ou contratos no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3.5 pl-5 text-center w-14">Posição</th>
                  <th className="p-3.5">Advogado / Vendedor</th>
                  <th className="p-3.5 text-center">Contratos Fechados</th>
                  <th className="p-3.5 text-right">Valor Total (R$)</th>
                  <th className="p-3.5 text-right">Ticket Médio</th>
                  <th className="p-3.5 text-center">Leads Atendidos</th>
                  <th className="p-3.5 pr-5 text-right">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ranks.map((r, index) => {
                  const pos = index + 1
                  const isTop1 = pos === 1
                  const isTop2 = pos === 2
                  const isTop3 = pos === 3

                  return (
                    <tr
                      key={r.user.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isTop1 ? 'bg-amber-500/5 font-medium' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-5 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-bold text-xs shadow-2xs">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-800 font-bold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono">{pos}º</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {r.user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              {r.user.name}
                              {isTop1 && (
                                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 h-4">
                                  Líder
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {r.user.email || r.user.cargo || 'Membro do Escritório'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold font-mono text-sm">
                        {r.contractsCount}
                      </td>

                      <td className="p-3.5 text-right font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        R$ {r.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3.5 text-right font-mono text-muted-foreground">
                        R$ {r.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3.5 text-center font-mono text-muted-foreground">
                        {r.leadsCount}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <Badge
                          className={
                            r.conversionRate >= 20
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold font-mono'
                              : r.conversionRate >= 10
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 font-mono'
                                : 'bg-muted text-muted-foreground font-mono'
                          }
                        >
                          {r.conversionRate}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default RankingPage
