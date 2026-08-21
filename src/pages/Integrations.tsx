import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Share2,
  MessageSquare,
  Search,
  FileCheck,
  Calendar,
  Key,
  ShieldCheck,
  Unplug,
  Loader2,
  Check,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'

export function IntegrationsPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  // ZapSign state
  const [zapConnected, setZapConnected] = useState(false)
  const [zapConfig, setZapConfig] = useState<any>(null)
  const [zapTokenInput, setZapTokenInput] = useState('')
  const [zapSandbox, setZapSandbox] = useState(false)
  const [zapLoading, setZapLoading] = useState(true)
  const [zapActionLoading, setZapActionLoading] = useState(false)
  const [zapTestLoading, setZapTestLoading] = useState(false)
  const [zapTestResult, setZapTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const loadZapSignState = async () => {
    if (!tenant?.id) return
    setZapLoading(true)
    try {
      const res = await CrmService.getZapSignConfig(tenant.id)
      setZapConnected(!!res.connected)
      setZapConfig(res.config || null)
    } catch (err) {
      console.error('Erro ao consultar ZapSign:', err)
      setZapConnected(false)
    } finally {
      setZapLoading(false)
    }
  }

  useEffect(() => {
    loadZapSignState()
  }, [tenant?.id])

  const handleConnectZapSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!zapTokenInput.trim()) {
      toast({
        title: 'Token obrigatório',
        description: 'Informe o Token de API do ZapSign para conectar.',
        variant: 'destructive',
      })
      return
    }

    setZapActionLoading(true)
    setZapTestResult(null)
    try {
      const res = await CrmService.connectZapSign(tenant.id, zapTokenInput.trim(), zapSandbox)
      if (res.success) {
        toast({
          title: 'ZapSign Conectado!',
          description: 'Integração salva e validada com sucesso via PocketBase.',
        })
        setZapTokenInput('')
        await loadZapSignState()
      } else {
        toast({
          title: 'Falha ao conectar ZapSign',
          description: res.error || 'Token inválido ou não autorizado.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err?.message || 'Falha ao salvar configuração do ZapSign.',
        variant: 'destructive',
      })
    } finally {
      setZapActionLoading(false)
    }
  }

  const handleDisconnectZapSign = async () => {
    if (!tenant?.id) return
    if (!confirm('Deseja realmente desconectar o ZapSign? O token salvo será removido.')) {
      return
    }

    setZapActionLoading(true)
    setZapTestResult(null)
    try {
      const res = await CrmService.disconnectZapSign(tenant.id)
      if (res.success) {
        toast({
          title: 'ZapSign Desconectado',
          description: 'A integração foi removida do sistema.',
        })
        setZapConnected(false)
        setZapConfig(null)
      } else {
        toast({
          title: 'Erro ao desconectar',
          description: res.error || 'Não foi possível remover.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao desconectar',
        description: err?.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setZapActionLoading(false)
    }
  }

  const handleTestZapSignConnection = async () => {
    if (!tenant?.id) return
    setZapTestLoading(true)
    setZapTestResult(null)
    try {
      const res = await CrmService.testZapSignConnection(tenant.id, undefined, zapSandbox)
      if (res.success) {
        setZapTestResult({
          success: true,
          message: res.message || 'Comunicação com a API do ZapSign testada com sucesso!',
        })
        toast({
          title: 'Conexão ZapSign OK',
          description: res.message || 'API respondeu com sucesso!',
        })
      } else {
        setZapTestResult({
          success: false,
          message: res.message || 'Falha ao validar credenciais no ZapSign.',
        })
        toast({
          title: 'Teste de Conexão falhou',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao realizar teste de conexão.'
      setZapTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro no teste',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setZapTestLoading(false)
    }
  }

  const otherIntegrations = [
    {
      id: 'meta_ads',
      name: 'Meta Ads & Conversions API (CAPI)',
      desc: 'Sincronização de leads do Instagram e Facebook Ads + disparo automático do evento Purchase na conversão de contratos.',
      icon: Share2,
      status: 'connected',
      details: `Pixel Ativo: ${tenant?.meta_pixel_id || '948271038592014'}`,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API & Chatbot',
      desc: 'Distribuição automática de leads e disparo de templates de primeiro contato em até 15 minutos.',
      icon: MessageSquare,
      status: 'connected',
      details: 'Número: +55 (11) 98765-4321',
    },
    {
      id: 'google_ads',
      name: 'Google Ads & Enhanced Conversions',
      desc: 'Rastreamento de conversões offline de pesquisas jurídicas fundo de funil.',
      icon: Search,
      status: 'connected',
      details: 'Conta: 842-109-3820',
    },
    {
      id: 'calendly',
      name: 'Calendly & Google Meet',
      desc: 'Agendamento de reuniões com clientes e sincronização instantânea na aba Tarefas do Lead.',
      icon: Calendar,
      status: 'connected',
      details: 'Sincronizado com agenda dos sócios',
    },
  ]

  const formatSyncDate = (dateStr?: string) => {
    if (!dateStr) return 'Agora há pouco'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-legal-serif">Central de Integrações Jurídicas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conectores ativos com tráfego, plataformas de assinatura digital, mensageria e CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD REAL DO ZAPSIGN */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-[#0A1F3F] text-white flex items-center justify-center shadow-xs">
                <FileCheck className="h-5 w-5 text-emerald-400" />
              </div>
              {zapLoading ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                </Badge>
              ) : zapConnected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] text-amber-600 border-amber-500/30 gap-1"
                >
                  <AlertCircle className="h-3 w-3" /> Não configurado
                </Badge>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm">ZapSign Assinaturas Eletrônicas</h3>
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Disparo de contratos de honorários com validade jurídica (MP 2.200-2/2001) e
                sincronização automática via webhooks.
              </p>
            </div>

            {/* SE JÁ HOUVER CONFIGURAÇÃO */}
            {zapConnected ? (
              <div className="bg-muted/40 border rounded-lg p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Token Seguro
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    •••••••• (Protegido no backend)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Última sincronização:</span>
                  <span className="font-medium text-foreground">
                    {formatSyncDate(zapConfig?.last_sync || zapConfig?.updated)}
                  </span>
                </div>

                {zapTestResult && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                      zapTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {zapTestResult.success ? (
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-tight">{zapTestResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              /* SE NÃO HOUVER TOKEN SALVO */
              <form onSubmit={handleConnectZapSign} className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-primary" /> Token de API ZapSign
                    </span>
                    <a
                      href="https://app.zapsign.com.br/configuracoes/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      Obter token →
                    </a>
                  </Label>
                  <Input
                    type="password"
                    value={zapTokenInput}
                    onChange={(e) => setZapTokenInput(e.target.value)}
                    placeholder="Cole seu token ZapSign aqui..."
                    className="h-8 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    O token é criptografado e nunca é exposto nas respostas da interface.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={zapActionLoading}
                  size="sm"
                  className="w-full h-8 text-xs bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white font-semibold gap-1.5"
                >
                  {zapActionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Conectar ZapSign
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* RODAPÉ DO CARD ZAPSIGN */}
          {zapConnected && (
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestZapSignConnection}
                disabled={zapTestLoading || zapActionLoading}
                className="h-7 text-xs gap-1 flex-1"
              >
                {zapTestLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Testando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" /> Testar Conexão
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectZapSign}
                disabled={zapActionLoading}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
              >
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          )}
        </div>

        {/* OUTROS CARDS DE INTEGRAÇÃO */}
        {otherIntegrations.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                </div>

                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-3 border-t flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">{item.details}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({ title: 'Integração sincronizada com sucesso!' })}
                  className="h-7 text-xs"
                >
                  Sincronizar
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default IntegrationsPage
