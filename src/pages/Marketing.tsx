import React from 'react'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function MarketingPage() {
  const cards = [
    { title: 'Investimento Total', value: 'R$ 14.650', change: '+12%', sub: 'Neste mês' },
    { title: 'Leads Gerados', value: '152', change: '+28%', sub: 'CPL Médio: R$ 96,38' },
    { title: 'Leads Qualificados', value: '64', change: '42%', sub: 'Taxa de Qualificação' },
    { title: 'Oportunidades Abertas', value: '37', change: '+18%', sub: 'Volume: R$ 580k' },
    { title: 'Contratos Fechados', value: '10', change: '+25%', sub: 'Taxa de Conversão: 6.5%' },
    { title: 'Receita Tráfego', value: 'R$ 238.000', change: '+45%', sub: 'ROAS Global: 16.24x' },
  ]

  const funil = [
    { step: '1. Impressões Tráfego', count: '190.000', conv: '100%' },
    { step: '2. Cliques no Anúncio', count: '5.760', conv: '3.0%' },
    { step: '3. Visitas Landing Page', count: '4.890', conv: '85%' },
    { step: '4. Leads Jurídicos', count: '152', conv: '3.1%' },
    { step: '5. Qualificados Comercial', count: '64', conv: '42%' },
    { step: '6. Propostas Enviadas', count: '28', conv: '43%' },
    { step: '7. Contratos Fechados', count: '10', conv: '35%' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-legal-serif">
          Inteligência de Tráfego &amp; Marketing Jurídico
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dashboard unificado de aquisição, CAC, ROAS e funil de conversão completo.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="bg-card border rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {c.title}
            </span>
            <div className="text-lg font-bold text-foreground">{c.value}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              {c.change} • <span className="text-muted-foreground font-normal">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm">Funil Completo de Aquisição Jurídica</h3>
          <div className="space-y-3">
            {funil.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{f.step}</span>
                  <span className="font-bold">
                    {f.count} ({f.conv})
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${100 - i * 12}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm">Performance por Plataforma de Anúncio</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold">Meta Ads (Instagram / Facebook)</div>
                <div className="text-muted-foreground">Investido: R$ 8.450 • 94 leads</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-600">R$ 150.000 (ROAS 17.7x)</div>
                <Badge variant="outline" className="text-[10px]">
                  6 Contratos
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold">Google Ads (Search &amp; Performance Max)</div>
                <div className="text-muted-foreground">Investido: R$ 6.200 • 58 leads</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-600">R$ 88.000 (ROAS 14.1x)</div>
                <Badge variant="outline" className="text-[10px]">
                  4 Contratos
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default MarketingPage
