import React, { useState, useEffect, useMemo } from 'react'
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
  Clock,
  Zap,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Sparkles,
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
  totalOppsCount: number
  wonOppsCount: number
  conversionRate: number
  avgTicket: number
  avgClosingDays: number
}

export function RankingPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [ranks, setRanks] = useState<SellerRank[]>([])
  const [loading, setLoading] = useState(true)

  // Filters and Sorting
  const [period, setPeriod] = useState<'current_month' | 'last_month' | 'quarter' | 'all_time'>(
    'all_time',
  )
  const [sortBy, setSortBy] = useState<
    'totalValue' | 'contractsCount' | 'conversionRate' | 'avgClosingDays'
  >('totalValue')
  const [teamFilter, setTeamFilter] = useState<string>('todos')

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
      } else if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startPeriod = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime()
        endPeriod = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59).getTime()
      }

      // Filter signed contracts
      const periodSignedContracts = contractsList.filter((c) => {
        const isSigned =
          (c.status || '').toLowerCase() === 'assinado' ||
          (c.sign_status || '').toLowerCase() === 'signed'
        if (!isSigned) return false

        const cDate = c.data_assinatura
          ? new Date(c.data_assinatura).getTime()
          : c.signed_at
            ? new Date(c.signed_at).getTime()
            : c.created
              ? new Date(c.created).getTime()
              : 0

        if (startPeriod && cDate < startPeriod) return false
        if (endPeriod !== Infinity && cDate > endPeriod) return false
        return true
      })

      // Map contracts to opportunities
      const oppMap = new Map<string, OpportunityRecord>()
      oppsList.forEach((opp) => oppMap.set(opp.id, opp))

      // Filter opportunities within period
      const periodOpps = oppsList.filter((o) => {
        const oppDate = o.created ? new Date(o.created).getTime() : 0
        if (startPeriod && oppDate < startPeriod) return false
        if (endPeriod !== Infinity && oppDate > endPeriod) return false
        return true
      })

      // Filter leads within period
      const periodLeads = leadsList.filter((l) => {
        const lDate = l.entry_date
          ? new Date(l.entry_date).getTime()
          : l.created
            ? new Date(l.created).getTime()
            : 0
        if (startPeriod && lDate < startPeriod) return false
        if (endPeriod !== Infinity && lDate > endPeriod) return false
        return true
      })

      const sellerData: SellerRank[] = usersList.map((user) => {
        // 1. Contratos onde o usuário é responsável
        const userContracts = periodSignedContracts.filter((c) => {
          if (c.oportunidade_id && oppMap.has(c.oportunidade_id)) {
            const op = oppMap.get(c.oportunidade_id)
            if (op?.assigned_to === user.id || op?.responsavel_id === user.id) return true
          }
          return false
        })

        // 2. Oportunidades do usuário no período
        const userOpps = periodOpps.filter(
          (o) => o.assigned_to === user.id || o.responsavel_id === user.id,
        )
        const wonOpps = userOpps.filter(
          (o) =>
            (o.status || '').toLowerCase() === 'won' ||
            (o.status || '').toLowerCase() === 'ganha' ||
            (o.status || '').toLowerCase() === 'ganho',
        )

        // 3. Leads do usuário
        const userLeads = periodLeads.filter(
          (l) => l.assigned_to === user.id || l.responsavel_id === user.id,
        )

        // Se houver contratos assinados vinculados a opps ganhas
        const contractsCount = userContracts.length
        const totalValue = userContracts.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

        // Taxa de conversão: Oportunidades Ganhas / Total de Oportunidades (ou Contratos / Leads se não houver opps)
        let conversionRate = 0
        if (userOpps.length > 0) {
          conversionRate = Math.min(100, Math.round((wonOpps.length / userOpps.length) * 100))
        } else if (userLeads.length > 0) {
          conversionRate = Math.min(100, Math.round((contractsCount / userLeads.length) * 100))
        } else if (contractsCount > 0) {
          conversionRate = 100
        }

        const avgTicket = contractsCount > 0 ? totalValue / contractsCount : 0

        // Velocidade Média de Fechamento (dias entre criação da oportunidade e data de ganho / assinatura)
        let totalClosingDays = 0
        let closedCount = 0

        userContracts.forEach((c) => {
          const opp = c.oportunidade_id ? oppMap.get(c.oportunidade_id) : null
          const createdTime = opp?.created
            ? new Date(opp.created).getTime()
            : c.created
              ? new Date(c.created).getTime()
              : 0
          const signedTime = c.data_assinatura
            ? new Date(c.data_assinatura).getTime()
            : c.signed_at
              ? new Date(c.signed_at).getTime()
              : opp?.data_ganho
                ? new Date(opp.data_ganho).getTime()
                : opp?.closed_at
                  ? new Date(opp.closed_at).getTime()
                  : 0

          if (createdTime && signedTime && signedTime >= createdTime) {
            const diffDays = Math.max(
              1,
              Math.round((signedTime - createdTime) / (1000 * 60 * 60 * 24)),
            )
            totalClosingDays += diffDays
            closedCount++
          }
        })

        const avgClosingDays = closedCount > 0 ? Math.round(totalClosingDays / closedCount) : 4

        return {
          user,
          contractsCount,
          totalValue,
          leadsCount: userLeads.length,
          totalOppsCount: userOpps.length,
          wonOppsCount: wonOpps.length,
          conversionRate,
          avgTicket,
          avgClosingDays,
        }
      })

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

  // Filter by team and sort ranks
  const sortedAndFilteredRanks = useMemo(() => {
    const filtered = ranks.filter((r) => {
      if (teamFilter === 'todos') return true
      const userTeam = (r.user.team || 'comercial').toLowerCase()
      return userTeam === teamFilter.toLowerCase()
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'totalValue') {
        return b.totalValue - a.totalValue || b.contractsCount - a.contractsCount
      }
      if (sortBy === 'contractsCount') {
        return b.contractsCount - a.contractsCount || b.totalValue - a.totalValue
      }
      if (sortBy === 'conversionRate') {
        return b.conversionRate - a.conversionRate || b.totalValue - a.totalValue
      }
      if (sortBy === 'avgClosingDays') {
        // menor tempo é melhor se tiver contratos
        if (a.contractsCount === 0) return 1
        if (b.contractsCount === 0) return -1
        return a.avgClosingDays - b.avgClosingDays
      }
      return 0
    })
  }, [ranks, sortBy, teamFilter])

  // Summary Metrics
  const totalContractsAll = sortedAndFilteredRanks.reduce((acc, r) => acc + r.contractsCount, 0)
  const totalValueAll = sortedAndFilteredRanks.reduce((acc, r) => acc + r.totalValue, 0)
  const totalOppsAll = sortedAndFilteredRanks.reduce((acc, r) => acc + r.totalOppsCount, 0)
  const totalWonAll = sortedAndFilteredRanks.reduce((acc, r) => acc + r.wonOppsCount, 0)
  const overallConversion =
    totalOppsAll > 0
      ? Math.min(100, Math.round((totalWonAll / totalOppsAll) * 100))
      : totalContractsAll > 0
        ? 100
        : 0

  const avgTeamClosing =
    sortedAndFilteredRanks.filter((r) => r.contractsCount > 0).length > 0
      ? Math.round(
          sortedAndFilteredRanks
            .filter((r) => r.contractsCount > 0)
            .reduce((acc, r) => acc + r.avgClosingDays, 0) /
            sortedAndFilteredRanks.filter((r) => r.contractsCount > 0).length,
        )
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
            Classificação em tempo real por contratos assinados, receita gerada, velocidade de
            fechamento e taxa de conversão no CRM Teixeira &amp; Nascimento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRankingData}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>

          {/* Period Selector */}
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">Todo o Histórico</SelectItem>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="quarter">Trimestre Atual</SelectItem>
            </SelectContent>
          </Select>

          {/* Team Filter */}
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Equipes</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="juridico">Jurídico</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
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
            <div className="text-sm font-bold font-legal-serif truncate max-w-[160px]">
              {sortedAndFilteredRanks[0]?.user?.name || 'Nenhum'}
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
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Velocidade Média Fechamento</div>
            <div className="text-lg font-bold font-legal-serif text-purple-600">
              {avgTeamClosing > 0 ? `${avgTeamClosing} dias` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && sortedAndFilteredRanks.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place */}
          {sortedAndFilteredRanks[1] && (
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs text-center space-y-2 relative order-2 md:order-1">
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center mx-auto text-xs border">
                2º
              </div>
              <h3 className="font-bold text-sm font-legal-serif">
                {sortedAndFilteredRanks[1].user.name}
              </h3>
              <div className="text-base font-bold text-primary font-mono">
                R$ {sortedAndFilteredRanks[1].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {sortedAndFilteredRanks[1].contractsCount} contratos •{' '}
                {sortedAndFilteredRanks[1].conversionRate}% conv. •{' '}
                {sortedAndFilteredRanks[1].avgClosingDays}d fech.
              </div>
            </div>
          )}

          {/* 1st Place Champion */}
          {sortedAndFilteredRanks[0] && (
            <div className="bg-card border-2 border-amber-500/60 bg-amber-500/5 rounded-xl p-6 shadow-md text-center space-y-2 relative order-1 md:order-2 scale-105">
              <div className="h-10 w-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center mx-auto shadow-sm">
                <Trophy className="h-5 w-5" />
              </div>
              <Badge className="bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold">
                1º Lugar Campeão
              </Badge>
              <h3 className="font-bold text-base text-foreground font-legal-serif">
                {sortedAndFilteredRanks[0].user.name}
              </h3>
              <div className="text-xl font-bold text-emerald-600 font-mono">
                R$ {sortedAndFilteredRanks[0].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {sortedAndFilteredRanks[0].contractsCount} contratos assinados •{' '}
                {sortedAndFilteredRanks[0].conversionRate}% conversão •{' '}
                {sortedAndFilteredRanks[0].avgClosingDays}d médio
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {sortedAndFilteredRanks[2] && (
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs text-center space-y-2 relative order-3">
              <div className="h-8 w-8 rounded-full bg-amber-700/20 text-amber-800 font-bold flex items-center justify-center mx-auto text-xs border border-amber-700/30">
                3º
              </div>
              <h3 className="font-bold text-sm font-legal-serif">
                {sortedAndFilteredRanks[2].user.name}
              </h3>
              <div className="text-base font-bold text-primary font-mono">
                R$ {sortedAndFilteredRanks[2].totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {sortedAndFilteredRanks[2].contractsCount} contratos •{' '}
                {sortedAndFilteredRanks[2].conversionRate}% conv. •{' '}
                {sortedAndFilteredRanks[2].avgClosingDays}d fech.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm font-legal-serif">
              Tabela de Classificação dos Vendedores
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" /> Ordenar por:
            </span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalValue">Valor Total Fechado</SelectItem>
                <SelectItem value="contractsCount">Quantidade de Contratos</SelectItem>
                <SelectItem value="conversionRate">Taxa de Conversão</SelectItem>
                <SelectItem value="avgClosingDays">Velocidade de Fechamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sortedAndFilteredRanks.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Nenhum dado de vendedores ou contratos no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3.5 pl-4 text-center w-14">Posição</th>
                  <th className="p-3.5">Advogado / Vendedor</th>
                  <th className="p-3.5 text-center">Contratos Fechados</th>
                  <th className="p-3.5 text-right">Receita Total (R$)</th>
                  <th className="p-3.5 text-right">Ticket Médio</th>
                  <th className="p-3.5 text-center">Velocidade Média</th>
                  <th className="p-3.5 text-center">Oportunidades Ganhas</th>
                  <th className="p-3.5 pr-4 text-right">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedAndFilteredRanks.map((r, index) => {
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
                      <td className="p-3.5 pl-4 text-center">
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

                      <td className="p-3.5 text-center font-mono">
                        {r.contractsCount > 0 ? (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            <Clock className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                            {r.avgClosingDays} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center font-mono text-muted-foreground">
                        {r.wonOppsCount} / {r.totalOppsCount}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
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
