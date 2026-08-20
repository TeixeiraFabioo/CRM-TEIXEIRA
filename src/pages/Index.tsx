import React from 'react'
import {
  Activity,
  Share2,
  CheckCircle2,
  Layers,
  Users,
  Target,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel } from '@/hooks/useMetaPixel'
import { MetaPixelDiagnosticsCard } from '@/components/MetaPixelDiagnosticsCard'
import { Link } from 'react-router-dom'

const Index = () => {
  const { tenant, pixelId } = useTenant()
  const { logs, isReady, hasConsent } = useMetaPixel()

  const eventsCount = logs.length
  const isPixelActive = !!pixelId

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-md border border-blue-400/30">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Plataforma SKIP de Inteligência Comercial v2.5</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Integração Nativa Meta Pixel &amp; Performance
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Rastreamento de conversões multinível por tenant com injeção automática no cabeçalho (
            <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-xs">
              &lt;head&gt;
            </code>
            ), conformidade LGPD e disparo automático de PageView, Lead, SubmitApplication e
            Purchase.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/integrations">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs sm:text-sm shadow-md">
                <Share2 className="h-4 w-4" />
                Central de Integrações Meta Ads
              </Button>
            </Link>

            <Link to="/settings">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm gap-2"
              >
                Configurar Pixel ID ({pixelId || 'Pendente'})
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Status do Meta Pixel</span>
              <Share2 className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-xl font-bold mt-1">
              {isPixelActive ? 'Configurado & Ativo' : 'Não Configurado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              ID: {pixelId || 'Nenhum'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Script Injetado (&lt;head&gt;)</span>
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-xl font-bold mt-1">
              {isReady ? 'fbevents.js Carregado' : 'Aguardando Injeção'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            fbq(&apos;init&apos;) executado com sucesso
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Eventos Rastreabilidade</span>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-xl font-bold mt-1">{eventsCount} Disparos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Log em tempo real da sessão
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Conformidade LGPD</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-xl font-bold mt-1">
              {hasConsent ? 'Consentimento Válido' : 'Bloqueado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Controle de privacidade no hook useMetaPixel
          </CardContent>
        </Card>
      </div>

      {/* Meta Pixel Diagnostics Panel */}
      <MetaPixelDiagnosticsCard />

      {/* Quick Access CRM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60 hover:border-blue-500/40 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="outline">Disparo Evento Lead</Badge>
            </div>
            <CardTitle className="text-base font-semibold mt-3">
              CRM &amp; Geração de Leads
            </CardTitle>
            <CardDescription className="text-xs">
              Adicione e gerencie leads qualificados por inteligência artificial. Cada novo lead
              dispara automaticamente o evento{' '}
              <code className="bg-muted px-1 py-0.5 rounded">Lead</code> no Pixel configurado.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/leads" className="w-full">
              <Button variant="outline" className="w-full justify-between text-xs">
                Acessar Leads CRM <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="border-border/60 hover:border-emerald-500/40 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Target className="h-5 w-5" />
              </div>
              <Badge variant="outline">Disparo Evento Purchase</Badge>
            </div>
            <CardTitle className="text-base font-semibold mt-3">
              Pipeline &amp; Fechamentos
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhe negócios no funil comercial. Ao marcar como Ganha, o evento padrão{' '}
              <code className="bg-muted px-1 py-0.5 rounded">Purchase</code> envia a receita em BRL
              diretamente ao Gerenciador de Anúncios.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/opportunities" className="w-full">
              <Button variant="outline" className="w-full justify-between text-xs">
                Acessar Oportunidades <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default Index
