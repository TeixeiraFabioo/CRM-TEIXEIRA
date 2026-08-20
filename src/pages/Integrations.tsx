import React, { useEffect, useState } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Settings2,
  RefreshCw,
  ExternalLink,
  Plus,
  Shield,
  Zap,
  Share2,
  MessageSquare,
  FileSignature,
  Calendar,
  Mail,
  SlidersHorizontal,
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
import { IntegrationService } from '@/services/tenant'
import { IntegrationRecord } from '@/types/platform'
import { MetaPixelConfigModal } from '@/components/MetaPixelConfigModal'
import { MetaPixelDiagnosticsCard } from '@/components/MetaPixelDiagnosticsCard'
import { useToast } from '@/hooks/use-toast'

export const IntegrationsPage: React.FC = () => {
  const { tenant, pixelId } = useTenant()
  const { toast } = useToast()

  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [metaModalOpen, setMetaModalOpen] = useState(false)

  const loadIntegrations = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const data = await IntegrationService.getIntegrations(tenant.id)
      setIntegrations(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
  }, [tenant, pixelId])

  const metaIntegration = integrations.find((i) => i.type === 'meta_ads')
  const isMetaConfigured = !!(pixelId || metaIntegration?.config?.pixel_id)

  const handleToggleIntegration = async (int: IntegrationRecord) => {
    const nextStatus = int.status === 'connected' ? 'disconnected' : 'connected'
    try {
      await IntegrationService.updateIntegration(int.id, { status: nextStatus })
      toast({
        title: `Integração ${int.name}`,
        description: `Status alterado para ${nextStatus === 'connected' ? 'Conectado' : 'Desconectado'}.`,
      })
      loadIntegrations()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Central de Integrações &amp; Rastreamento
            </h1>
            <Badge variant="outline" className="text-xs">
              Tenant: {tenant?.name}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie canais de aquisição, automações, Webhooks e o Meta Pixel de conversão da
            Plataforma SKIP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadIntegrations}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setMetaModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Settings2 className="h-4 w-4" />
            Configurar Meta Pixel
          </Button>
        </div>
      </div>

      {/* Meta Pixel Diagnostics & Tester Hero */}
      <MetaPixelDiagnosticsCard onOpenSettings={() => setMetaModalOpen(true)} />

      {/* Integrations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            Conexões Disponíveis
          </h2>
          <span className="text-xs text-muted-foreground">
            {integrations.length} integrações cadastradas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Meta Ads & Pixel Card (Foco Principal) */}
          <Card
            className={`border-2 transition-all ${
              isMetaConfigured
                ? 'border-blue-500/40 shadow-sm bg-gradient-to-b from-blue-500/5 to-transparent'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                  <Share2 className="h-5 w-5" />
                </div>
                {isMetaConfigured ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Não configurado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-semibold mt-3">
                Meta Ads &amp; Meta Pixel
              </CardTitle>
              <CardDescription className="text-xs">
                Injeção dinâmica de script, Conversions API, rastreamento de campanhas e PageViews.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pb-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pixel ID:</span>
                  <span className="font-mono font-medium text-foreground">
                    {pixelId || metaIntegration?.config?.pixel_id || 'Não informado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Injeção no &lt;head&gt;:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {pixelId ? 'Automática' : 'Desativada'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Eventos Mapeados:</span>
                  <span className="font-medium">PageView, Lead, Contact, Purchase</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
                onClick={() => setMetaModalOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {isMetaConfigured ? 'Gerenciar Pixel ID' : 'Configurar Pixel ID'}
              </Button>
            </CardFooter>
          </Card>

          {/* 2. WhatsApp Business API */}
          <Card className="border-border/60 hover:border-border transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">WhatsApp Cloud API</CardTitle>
              <CardDescription className="text-xs">
                Mensagens automáticas, qualificação de leads via IA e disparos de conversão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone Number ID:</span>
                  <span className="font-mono">109823912093</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auto-resposta:</span>
                  <span className="text-emerald-500 font-medium">Ativo</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Ver Configurações
              </Button>
            </CardFooter>
          </Card>

          {/* 3. Google Ads */}
          <Card className="border-border/60 hover:border-border transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                  <Zap className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Desconectado
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Google Ads Enhanced</CardTitle>
              <CardDescription className="text-xs">
                Conversões aprimoradas do Google Ads e integração com Google Analytics 4.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer ID:</span>
                  <span className="text-muted-foreground italic">Não configurado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tag ID:</span>
                  <span className="text-muted-foreground italic">Pendente</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Conectar Conta
              </Button>
            </CardFooter>
          </Card>

          {/* 4. ZapSign Contratos */}
          <Card className="border-border/60 hover:border-border transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-purple-600 text-white">
                  <FileSignature className="h-5 w-5" />
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">ZapSign Assinaturas</CardTitle>
              <CardDescription className="text-xs">
                Geração automática de propostas e contratos assinados eletronicamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auto Oportunidade:</span>
                  <span className="text-emerald-500 font-medium">Habilitado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status API:</span>
                  <span className="font-mono">Pronto</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Gerenciar Webhooks
              </Button>
            </CardFooter>
          </Card>

          {/* 5. Calendly / Agendamentos */}
          <Card className="border-border/60 hover:border-border transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-600 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Disponível
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">
                Calendly &amp; Reuniões
              </CardTitle>
              <CardDescription className="text-xs">
                Sincronize reuniões de demonstração e dispare o evento de &lsquo;Schedule&rsquo; no
                Meta Pixel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-3 text-xs">
              <p className="text-muted-foreground">
                Conecte links de agendas para SDRs e Executivos de Contas.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Configurar Agenda
              </Button>
            </CardFooter>
          </Card>

          {/* 6. Custom Webhooks */}
          <Card className="border-border/60 hover:border-border transition-all border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-zinc-700 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <Badge variant="secondary">Personalizado</Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Webhook Customizado</CardTitle>
              <CardDescription className="text-xs">
                Envie dados de leads e conversões para endpoints externos em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-3 text-xs">
              <p className="text-muted-foreground">
                Crie regras de disparo para ERPs, Make, n8n ou Zapier.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Adicionar Webhook
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Meta Pixel Config Modal */}
      <MetaPixelConfigModal open={metaModalOpen} onOpenChange={setMetaModalOpen} />
    </div>
  )
}
