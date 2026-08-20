import React, { useState } from 'react'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Code2,
  Copy,
  ExternalLink,
  Info,
  Sparkles,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMetaPixel } from '@/hooks/useMetaPixel'
import { useTenant } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'

export const MetaPixelDiagnosticsCard: React.FC<{
  onOpenSettings?: () => void
}> = ({ onOpenSettings }) => {
  const {
    pixelId,
    isReady,
    hasConsent,
    setConsent,
    testPixel,
    logs,
    clearLogs,
    trackLead,
    trackPurchase,
    trackContact,
    trackSubmitApplication,
  } = useMetaPixel()
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [testCodeInput, setTestCodeInput] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean
    testCode: string
    pixelId: string | null
    timestamp: string
  } | null>(null)

  const handleTestPixel = () => {
    if (!pixelId) {
      toast({
        title: 'Pixel não configurado',
        description: 'Configure um Pixel ID válido antes de realizar o teste.',
        variant: 'destructive',
      })
      return
    }

    setIsTesting(true)
    const testCode =
      testCodeInput.trim() || `SKIP_TEST_${Math.floor(100000 + Math.random() * 900000)}`

    setTimeout(() => {
      const result = testPixel(testCode)
      setLastTestResult(result)
      setIsTesting(false)

      if (result.success) {
        toast({
          title: 'Evento de Teste Disparado!',
          description: `Evento test_event (${result.testCode}) enviado com sucesso para o Pixel ID ${pixelId}.`,
        })
      } else {
        toast({
          title: 'Falha no disparo do Pixel',
          description: !hasConsent
            ? 'Bloqueado por consentimento LGPD.'
            : 'Script do Pixel ainda não carregado.',
          variant: 'destructive',
        })
      }
    }, 400)
  }

  const handleTriggerCrmEvent = (type: 'Lead' | 'Contact' | 'SubmitApplication' | 'Purchase') => {
    if (!pixelId) {
      toast({
        title: 'Pixel não configurado',
        description: 'Cadastre o Pixel ID para disparar eventos.',
        variant: 'destructive',
      })
      return
    }

    let success = false
    switch (type) {
      case 'Lead':
        success = trackLead({
          lead_id: 'lead_sim_' + Math.floor(Math.random() * 1000),
          value: 48000,
          currency: 'BRL',
          content_name: 'Lead Qualificado - Simulação Manual',
          source: 'Meta Ads Campaign',
        })
        break
      case 'Contact':
        success = trackContact({
          content_name: 'Contato via WhatsApp Comercial',
          channel: 'WhatsApp Business',
        })
        break
      case 'SubmitApplication':
        success = trackSubmitApplication({
          content_name: 'Proposta Comercial Enviada',
          value: 96000,
          currency: 'BRL',
        })
        break
      case 'Purchase':
        success = trackPurchase(96000, 'BRL', {
          opportunity_id: 'opp_won_' + Math.floor(Math.random() * 1000),
          content_name: 'Oportunidade Fechada / Venda Ganha',
        })
        break
    }

    if (success) {
      toast({
        title: `Evento fbq('${type}') enviado!`,
        description: `Evento de conversão registrado no Meta Pixel (${pixelId}).`,
      })
    } else {
      toast({
        title: 'Evento não disparado',
        description: !hasConsent
          ? 'LGPD: Consentimento desativado'
          : 'Pixel inativo ou não carregado.',
        variant: 'destructive',
      })
    }
  }

  const copyScriptSnippet = () => {
    const snippet = `<!-- Meta Pixel Code Oficial SKIP -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId || 'SEU_PIXEL_ID'}');
fbq('track', 'PageView');
</script>`
    navigator.clipboard.writeText(snippet)
    toast({
      title: 'Código Copiado!',
      description: 'Snippet oficial do Meta Pixel copiado para a área de transferência.',
    })
  }

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-card/50 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                Meta Pixel Status & Verificação
                {pixelId ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-normal"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ativo ({pixelId})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-normal"
                  >
                    Não configurado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Diagnóstico em tempo real, injeção no cabeçalho e disparador de eventos do CRM
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="h-8 gap-1 text-xs"
              >
                Editar Pixel ID
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status badges & LGPD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border bg-background/50 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">Tenant Atual</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-sm truncate">
                {tenant?.name || 'SKIP Enterprise'}
              </span>
              <Badge variant="secondary" className="text-[10px] uppercase">
                {tenant?.plan || 'Enterprise'}
              </Badge>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-background/50 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Script no &lt;head&gt;
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              {isReady ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Injetado & Pronto
                  </span>
                </>
              ) : pixelId ? (
                <>
                  <Activity className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Carregando script
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Aguardando ID</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-background/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Consentimento LGPD</span>
              {hasConsent ? (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">
                {hasConsent ? 'Consentimento Aceito' : 'Bloqueio LGPD Ativo'}
              </span>
              <Switch
                checked={hasConsent}
                onCheckedChange={(val) => setConsent(val)}
                aria-label="Consentimento LGPD"
              />
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
                Testar Disparo do Pixel (Meta Events Manager)
              </h4>
              <p className="text-xs text-muted-foreground">
                Dispara um evento de teste oficial{' '}
                <code className="bg-background px-1 py-0.5 rounded text-[11px]">
                  test_event
                </code>{' '}
                com código de rastreio para validar no Gerenciador de Eventos da Meta.
              </p>
            </div>

            <Button
              onClick={handleTestPixel}
              disabled={isTesting || !pixelId}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 h-9"
            >
              {isTesting ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Testar Pixel Agora
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground">
                Código de Teste do Gerenciador da Meta (Opcional)
              </Label>
              <Input
                placeholder="Ex: TEST12345 (opcional)"
                value={testCodeInput}
                onChange={(e) => setTestCodeInput(e.target.value)}
                className="h-8 text-xs mt-1 bg-background"
              />
            </div>
            <div className="flex flex-col justify-end">
              {lastTestResult ? (
                <div className="flex items-center gap-2 p-1.5 px-2.5 rounded border bg-background text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Sucesso:
                    </span>{' '}
                    <span>{lastTestResult.testCode}</span>
                    <span className="text-muted-foreground ml-1">
                      ({new Date(lastTestResult.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic flex items-center gap-1 h-8">
                  <Info className="h-3.5 w-3.5" />
                  Nenhum teste executado nesta sessão.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CRM Quick Event Dispatcher & Live Log Inspector */}
        <Tabs defaultValue="events" className="w-full">
          <div className="flex items-center justify-between pb-2 border-b">
            <TabsList className="h-8">
              <TabsTrigger value="events" className="text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Eventos Padrão CRM
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs gap-1.5">
                <Terminal className="h-3.5 w-3.5" /> Log de Execução ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs gap-1.5">
                <Code2 className="h-3.5 w-3.5" /> Código Injetado
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar Logs
              </Button>
            </div>
          </div>

          <TabsContent value="events" className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Dispare manualmente os eventos padrões mapeados no fluxo comercial da Plataforma SKIP
              para testar o envio para o Meta Pixel:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerCrmEvent('Lead')}
                disabled={!pixelId}
                className="justify-start h-10 border-dashed"
              >
                <div className="text-left">
                  <div className="text-xs font-semibold">Lead</div>
                  <div className="text-[10px] text-muted-foreground">
                    fbq(&apos;track&apos;, &apos;Lead&apos;)
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerCrmEvent('Contact')}
                disabled={!pixelId}
                className="justify-start h-10 border-dashed"
              >
                <div className="text-left">
                  <div className="text-xs font-semibold">Contact</div>
                  <div className="text-[10px] text-muted-foreground">
                    fbq(&apos;track&apos;, &apos;Contact&apos;)
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerCrmEvent('SubmitApplication')}
                disabled={!pixelId}
                className="justify-start h-10 border-dashed"
              >
                <div className="text-left">
                  <div className="text-xs font-semibold">SubmitApplication</div>
                  <div className="text-[10px] text-muted-foreground">
                    fbq(&apos;track&apos;, &apos;SubmitApp&apos;)
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerCrmEvent('Purchase')}
                disabled={!pixelId}
                className="justify-start h-10 border-dashed"
              >
                <div className="text-left">
                  <div className="text-xs font-semibold">Purchase</div>
                  <div className="text-[10px] text-muted-foreground">
                    fbq(&apos;track&apos;, &apos;Purchase&apos;)
                  </div>
                </div>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="pt-3">
            <div className="rounded-lg bg-zinc-950 text-zinc-100 p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-2 border border-zinc-800">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic py-4 text-center">
                  Nenhum evento registrado ainda. Navegue entre as abas ou dispare um teste acima.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="border-b border-zinc-800/80 pb-1.5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            log.status === 'sent'
                              ? 'bg-emerald-400'
                              : log.status === 'blocked_by_consent'
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                          }`}
                        />
                        <strong className="text-zinc-200 uppercase">{log.type}</strong> &rarr;{' '}
                        {log.eventName}
                      </span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>
                        Pixel ID: <code className="text-blue-300">{log.pixelId || 'N/A'}</code>
                      </span>
                      <span>•</span>
                      <span
                        className={
                          log.status === 'sent'
                            ? 'text-emerald-400'
                            : log.status === 'blocked_by_consent'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {log.status === 'sent'
                          ? 'Enviado para fbq'
                          : log.status === 'blocked_by_consent'
                            ? 'Bloqueado (LGPD)'
                            : 'Pixel ID não definido'}
                      </span>
                    </div>

                    {log.params && Object.keys(log.params).length > 0 && (
                      <pre className="mt-1 text-[10px] text-zinc-400 bg-zinc-900/80 p-1.5 rounded overflow-x-auto">
                        {JSON.stringify(log.params, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="pt-3 space-y-2">
            <div className="relative">
              <div className="rounded-lg bg-zinc-950 text-zinc-200 p-3 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                <p className="text-zinc-500">
                  // Script injetado dinamicamente no &lt;head&gt; da Plataforma SKIP:
                </p>
                <p className="text-blue-400">
                  &lt;script async
                  src=&quot;https://connect.facebook.net/en_US/fbevents.js&quot;&gt;&lt;/script&gt;
                </p>
                <p className="text-emerald-400">
                  fbq(&apos;init&apos;, &apos;{pixelId || 'SEU_PIXEL_ID'}&apos;);
                </p>
                <p className="text-purple-400">fbq(&apos;track&apos;, &apos;PageView&apos;);</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={copyScriptSnippet}
                className="absolute top-2 right-2 h-7 text-xs gap-1"
              >
                <Copy className="h-3 w-3" /> Copiar Snippet
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              O script segue estritamente as especificações oficiais da documentação da Meta
              Developers (Meta Business SDK 2.0).
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-muted/20 border-t py-2.5 px-6 flex justify-between items-center text-xs text-muted-foreground">
        <span>Meta Ads Conversions API &amp; Web Pixel</span>
        <span className="font-mono">v2.0 • SKIP Commercial Intelligence</span>
      </CardFooter>
    </Card>
  )
}
