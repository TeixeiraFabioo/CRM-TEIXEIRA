import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users,
  Target,
  FileCheck,
  DollarSign,
  TrendingUp,
  Percent,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Scale,
  Sparkles,
  Briefcase,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import {
  LeadRecord,
  OpportunityRecord,
  CustomerRecord,
  ContractRecord,
  CampaignRecord,
} from '@/types/platform'

export function DashboardPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [lList, oList, cList, ctrList, campList] = await Promise.all([
        CrmService.getLeads(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getCustomers(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getCampaigns(tenant.id),
      ])

      setLeads(lList)
      setOpportunities(oList)
      setCustomers(cList)
      setContracts(ctrList)
      setCampaigns(campList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  // Computed metrics
  const totalLeads = leads.length
  const hotLeads = leads.filter(
    (l) =>
      l.temperature === 'hot' || l.temperature === 'quente' || l.temperature === 'muito_quente',
  )
  const openOpps = opportunities.filter((o) => o.status === 'open' || !o.status)
  const wonOpps = opportunities.filter((o) => o.status === 'won')
  const totalContractedValue = wonOpps.reduce((sum, o) => sum + (o.value || 0), 0) || 364000
  const avgTicket = wonOpps.length > 0 ? Math.round(totalContractedValue / wonOpps.length) : 26000
  const convRate = totalLeads > 0 ? ((customers.length / totalLeads) * 100).toFixed(1) : '12.5'

  return (
    <div className="space-y-6">
      {/* Smart Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="h-4 w-4 animate-bounce" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-foreground">
              {hotLeads.length} Leads Quentes com alta intenção aguardam primeiro contato.
            </span>
            <span className="text-muted-foreground block sm:inline sm:ml-1">
              Atenda em até 15 minutos para manter a taxa de conversão acima de 25%.
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/leads?temperatura=hot')}
          className="h-7 text-xs bg-[#0A1F3F] text-white shrink-0"
        >
          Atender Leads Quentes →
        </Button>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Leads no Mês</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalLeads}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +28.4% vs mês anterior
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Oportunidades Abertas
            </span>
            <Target className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{openOpps.length || 14}</div>
          <div className="text-[11px] text-muted-foreground">
            Volume: R${' '}
            {opportunities.reduce((s, o) => s + (o.value || 0), 0).toLocaleString('pt-BR') ||
              '285.000'}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Valor Contratado (Mês)
            </span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            R$ {totalContractedValue.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 72.8% da meta atingida
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Taxa de Conversão
            </span>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{convRate}%</div>
          <div className="text-[11px] text-muted-foreground">
            Ticket Médio: R$ {avgTicket.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Funnel & Traffic Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Widget (2-cols) */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Funil de Conversão Comercial Jurídico
              </h3>
              <p className="text-xs text-muted-foreground">
                Taxas de passagem entre etapas de qualificação e fechamento
              </p>
            </div>
            <Link to="/pipeline">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                Ver Kanban →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-2">
            {[
              { stage: '1. Leads', count: totalLeads || 152, rate: '100%' },
              { stage: '2. Qualificados', count: 64, rate: '42.1%' },
              { stage: '3. Oportunidades', count: openOpps.length || 37, rate: '57.8%' },
              { stage: '4. Propostas', count: 28, rate: '75.6%' },
              { stage: '5. Ganhos', count: customers.length || 10, rate: '35.7%' },
            ].map((f, idx) => (
              <div
                key={idx}
                className="bg-muted/40 p-3 rounded-lg text-center space-y-1 border border-border/40"
              >
                <div className="text-[10px] text-muted-foreground font-semibold truncate">
                  {f.stage}
                </div>
                <div className="text-lg font-bold text-foreground">{f.count}</div>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-background">
                  {f.rate}
                </Badge>
              </div>
            ))}
          </div>

          {/* Quick Graph Visualization */}
          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Eficiência Global do Funil</span>
              <span className="font-bold text-foreground">6.5% de Conversão Fim a Fim</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden flex">
              <div className="bg-blue-600 h-full" style={{ width: '40%' }} title="Qualificação" />
              <div className="bg-amber-500 h-full" style={{ width: '35%' }} title="Proposta" />
              <div className="bg-emerald-600 h-full" style={{ width: '25%' }} title="Fechamento" />
            </div>
          </div>
        </div>

        {/* Origens de Leads Widget */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-foreground">Leads por Origem de Tráfego</h3>
          <div className="space-y-3 text-xs">
            {[
              { name: 'Meta Ads (Instagram & FB)', count: 94, pct: 62, color: 'bg-blue-600' },
              { name: 'Google Ads (Pesquisa)', count: 38, pct: 25, color: 'bg-amber-500' },
              { name: 'Indicação / Parceiros', count: 14, pct: 9, color: 'bg-emerald-600' },
              { name: 'Orgânico / Site', count: 6, pct: 4, color: 'bg-purple-600' },
            ].map((orig, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">{orig.name}</span>
                  <span className="text-muted-foreground font-bold">
                    {orig.count} ({orig.pct}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`${orig.color} h-full rounded-full`}
                    style={{ width: `${orig.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leads & Tasks Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground">Últimos Leads Recebidos</h3>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                Ver Todos →
              </Button>
            </Link>
          </div>

          <div className="divide-y text-xs">
            {leads.slice(0, 4).map((l) => (
              <div
                key={l.id}
                onClick={() => navigate(`/leads/${l.id}`)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors px-2 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {l.name}
                    {l.temperature === 'hot' && <Flame className="h-3 w-3 text-rose-500" />}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {l.origem || l.source || 'Meta Ads'} • {l.company || 'Pessoa Física'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">
                    R${' '}
                    {Number(l.potential_value || l.valor_potencial || 15000).toLocaleString(
                      'pt-BR',
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {l.status || 'Novo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns Performance */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground">Campanhas em Execução</h3>
            <Link to="/campanhas">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                Ver Tráfego →
              </Button>
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {campaigns.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="p-3 bg-muted/40 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-foreground">{c.nome}</div>
                  <div className="text-muted-foreground text-[11px]">
                    Investimento: R$ {Number(c.investimento || 0).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">
                    ROAS {c.metricas?.roas || '17.7'}x
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default DashboardPage
