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
  PhoneCall,
  Copy,
  ExternalLink,
  HelpCircle,
  Send,
  Info,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { WhatsAppService, WhatsAppConfig } from '@/services/whatsapp'

export function IntegrationsPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  // Calendly state
  const [calendlyConnected, setCalendlyConnected] = useState(false)
  const [calendlyConfig, setCalendlyConfig] = useState<any>(null)
  const [calendlySchedulingUrl, setCalendlySchedulingUrl] = useState('')
  const [calendlyTokenInput, setCalendlyTokenInput] = useState('')
  const [calendlyLoading, setCalendlyLoading] = useState(true)
  const [calendlyActionLoading, setCalendlyActionLoading] = useState(false)
  const [calendlyTestLoading, setCalendlyTestLoading] = useState(false)
  const [calendlyTestResult, setCalendlyTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Google Meet state
  const [googleMeetConnected, setGoogleMeetConnected] = useState(false)
  const [googleMeetConfig, setGoogleMeetConfig] = useState<any>(null)
  const [googleMeetTokenInput, setGoogleMeetTokenInput] = useState('')
  const [googleMeetLoading, setGoogleMeetLoading] = useState(true)
  const [googleMeetActionLoading, setGoogleMeetActionLoading] = useState(false)
  const [googleMeetTestLoading, setGoogleMeetTestLoading] = useState(false)
  const [googleMeetTestResult, setGoogleMeetTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

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

  // WhatsApp Business API state
  const [waConnected, setWaConnected] = useState(false)
  const [waConfig, setWaConfig] = useState<WhatsAppConfig | null>(null)
  const [waLoading, setWaLoading] = useState(true)
  const [waActionLoading, setWaActionLoading] = useState(false)
  const [waTestLoading, setWaTestLoading] = useState(false)
  const [waConfigModalOpen, setWaConfigModalOpen] = useState(false)
  const [waTestModalOpen, setWaTestModalOpen] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [waTestResult, setWaTestResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  // WhatsApp form inputs
  const [waForm, setWaForm] = useState({
    waba_id: '',
    phone_number_id: '',
    token: '',
    phone_number: '',
    verify_token: 'skip_hub_crm_whatsapp_verify_token',
  })

  // Backend Webhook URL
  const backendBaseUrl =
    (import.meta as any).env?.VITE_POCKETBASE_URL ||
    'https://plataforma-skip-de-inteligencia-comercial-dc86f.shrd00.internal.goskip.dev'
  const waWebhookUrl = `${backendBaseUrl.replace(/\/$/, '')}/api/whatsapp/webhook`

  const loadCalendlyState = async () => {
    if (!tenant?.id) return
    setCalendlyLoading(true)
    try {
      const res = await CrmService.getCalendlyConfig(tenant.id)
      setCalendlyConnected(!!res.connected)
      setCalendlyConfig(res.config || null)
      setCalendlySchedulingUrl(res.scheduling_url || res.config?.scheduling_url || '')
    } catch (err) {
      console.error('Erro ao consultar Calendly:', err)
      setCalendlyConnected(false)
    } finally {
      setCalendlyLoading(false)
    }
  }

  const loadGoogleMeetState = async () => {
    if (!tenant?.id) return
    setGoogleMeetLoading(true)
    try {
      const res = await CrmService.getGoogleMeetConfig(tenant.id)
      setGoogleMeetConnected(!!res.connected)
      setGoogleMeetConfig(res.config || null)
    } catch (err) {
      console.error('Erro ao consultar Google Meet:', err)
      setGoogleMeetConnected(false)
    } finally {
      setGoogleMeetLoading(false)
    }
  }

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

  const loadWhatsAppState = async () => {
    if (!tenant?.id) return
    setWaLoading(true)
    try {
      const res = await WhatsAppService.getConfig(tenant.id)
      setWaConnected(!!res.connected)
      setWaConfig(res.config)
      if (res.config) {
        setWaForm((prev) => ({
          ...prev,
          waba_id: res.config?.waba_id || '',
          phone_number_id: res.config?.phone_number_id || '',
          phone_number: res.config?.phone_number || '',
          verify_token: res.config?.verify_token || 'skip_hub_crm_whatsapp_verify_token',
        }))
      }
    } catch (err) {
      console.error('Erro ao consultar WhatsApp Business API:', err)
      setWaConnected(false)
    } finally {
      setWaLoading(false)
    }
  }

  useEffect(() => {
    loadCalendlyState()
    loadGoogleMeetState()
    loadZapSignState()
    loadWhatsAppState()
  }, [tenant?.id])

  const handleConnectCalendly = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!calendlyTokenInput.trim()) {
      toast({
        title: 'Token obrigatório',
        description: 'Informe o Token de API do Calendly para conectar.',
        variant: 'destructive',
      })
      return
    }

    setCalendlyActionLoading(true)
    setCalendlyTestResult(null)
    try {
      const res = await CrmService.connectCalendly(tenant.id, calendlyTokenInput.trim())
      if (res.success) {
        toast({
          title: 'Calendly Conectado!',
          description: 'Integração salva e validada com sucesso via API.',
        })
        setCalendlyTokenInput('')
        await loadCalendlyState()
      } else {
        toast({
          title: 'Falha ao conectar Calendly',
          description: res.error || 'Token inválido ou não autorizado.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err?.message || 'Falha ao salvar configuração do Calendly.',
        variant: 'destructive',
      })
    } finally {
      setCalendlyActionLoading(false)
    }
  }

  const handleDisconnectCalendly = async () => {
    if (!tenant?.id) return
    if (!confirm('Deseja realmente desconectar o Calendly? O token salvo será removido.')) {
      return
    }

    setCalendlyActionLoading(true)
    setCalendlyTestResult(null)
    try {
      const res = await CrmService.disconnectCalendly(tenant.id)
      if (res.success) {
        toast({
          title: 'Calendly Desconectado',
          description: 'A integração foi removida do sistema.',
        })
        setCalendlyConnected(false)
        setCalendlyConfig(null)
        setCalendlySchedulingUrl('')
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
      setCalendlyActionLoading(false)
    }
  }

  const handleTestCalendlyConnection = async () => {
    if (!tenant?.id) return
    setCalendlyTestLoading(true)
    setCalendlyTestResult(null)
    try {
      const res = await CrmService.testCalendlyConnection(tenant.id)
      if (res.success) {
        setCalendlyTestResult({
          success: true,
          message: res.message || 'Comunicação com a API do Calendly testada com sucesso!',
        })
        if (res.scheduling_url) {
          setCalendlySchedulingUrl(res.scheduling_url)
        }
        toast({
          title: 'Conexão Calendly OK',
          description: res.message || 'API respondeu com sucesso!',
        })
      } else {
        setCalendlyTestResult({
          success: false,
          message: res.message || res.error || 'Falha ao validar credenciais no Calendly.',
        })
        toast({
          title: 'Teste de Conexão falhou',
          description: res.message || res.error,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao realizar teste de conexão.'
      setCalendlyTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro no teste',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setCalendlyTestLoading(false)
    }
  }

  const handleConnectGoogleMeet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!googleMeetTokenInput.trim()) {
      toast({
        title: 'API Key obrigatória',
        description: 'Informe a Google API Key / Token para conectar.',
        variant: 'destructive',
      })
      return
    }

    setGoogleMeetActionLoading(true)
    setGoogleMeetTestResult(null)
    try {
      const res = await CrmService.connectGoogleMeet(tenant.id, googleMeetTokenInput.trim())
      if (res.success) {
        toast({
          title: 'Google Meet Conectado!',
          description: 'Integração salva e validada com sucesso via API.',
        })
        setGoogleMeetTokenInput('')
        await loadGoogleMeetState()
      } else {
        toast({
          title: 'Falha ao conectar Google Meet',
          description: res.error || 'Credencial inválida ou não autorizada.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err?.message || 'Falha ao salvar configuração do Google Meet.',
        variant: 'destructive',
      })
    } finally {
      setGoogleMeetActionLoading(false)
    }
  }

  const handleDisconnectGoogleMeet = async () => {
    if (!tenant?.id) return
    if (!confirm('Deseja realmente desconectar o Google Meet? A chave salva será removida.')) {
      return
    }

    setGoogleMeetActionLoading(true)
    setGoogleMeetTestResult(null)
    try {
      const res = await CrmService.disconnectGoogleMeet(tenant.id)
      if (res.success) {
        toast({
          title: 'Google Meet Desconectado',
          description: 'A integração foi removida do sistema.',
        })
        setGoogleMeetConnected(false)
        setGoogleMeetConfig(null)
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
      setGoogleMeetActionLoading(false)
    }
  }

  const handleTestGoogleMeetConnection = async () => {
    if (!tenant?.id) return
    setGoogleMeetTestLoading(true)
    setGoogleMeetTestResult(null)
    try {
      const res = await CrmService.testGoogleMeetConnection(tenant.id)
      if (res.success) {
        setGoogleMeetTestResult({
          success: true,
          message: res.message || 'Comunicação com Google Meet testada com sucesso!',
        })
        toast({
          title: 'Conexão Google Meet OK',
          description: res.message || 'API respondeu com sucesso!',
        })
      } else {
        setGoogleMeetTestResult({
          success: false,
          message: res.message || res.error || 'Falha ao validar credenciais do Google Meet.',
        })
        toast({
          title: 'Teste de Conexão falhou',
          description: res.message || res.error,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao realizar teste de conexão.'
      setGoogleMeetTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro no teste',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setGoogleMeetTestLoading(false)
    }
  }

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

  // WhatsApp Handlers
  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return

    if (!waForm.phone_number_id.trim() || !waForm.token.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Phone Number ID e Access Token são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setWaActionLoading(true)
    setWaTestResult(null)
    try {
      const res = await WhatsAppService.connect({
        tenant_id: tenant.id,
        token: waForm.token.trim(),
        phone_number_id: waForm.phone_number_id.trim(),
        waba_id: waForm.waba_id.trim(),
        phone_number: waForm.phone_number.trim(),
        verify_token: waForm.verify_token.trim() || 'skip_hub_crm_whatsapp_verify_token',
      })

      if (res.success) {
        toast({
          title: 'WhatsApp Business API Conectado!',
          description: 'Credenciais validadas na Meta e salvas com segurança no backend.',
        })
        setWaConfigModalOpen(false)
        setWaForm((prev) => ({ ...prev, token: '' })) // limpa o token do state de formulário
        await loadWhatsAppState()
      } else {
        toast({
          title: 'Falha ao conectar WhatsApp',
          description: res.error || 'Credenciais recusadas pela Meta Graph API.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err?.message || 'Falha ao conectar com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setWaActionLoading(false)
    }
  }

  const handleDisconnectWhatsApp = async () => {
    if (!tenant?.id) return
    if (
      !confirm(
        'Deseja realmente desconectar o WhatsApp Business API? As credenciais serão removidas.',
      )
    ) {
      return
    }

    setWaActionLoading(true)
    setWaTestResult(null)
    try {
      const res = await WhatsAppService.disconnect(tenant.id)
      if (res.success) {
        toast({
          title: 'WhatsApp Desconectado',
          description: 'A integração foi removida.',
        })
        setWaConnected(false)
        setWaConfig(null)
      } else {
        toast({
          title: 'Erro ao desconectar',
          description: res.error || 'Não foi possível desconectar.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao desconectar',
        description: err?.message || 'Falha na comunicação.',
        variant: 'destructive',
      })
    } finally {
      setWaActionLoading(false)
    }
  }

  const handleTestWhatsAppConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!tenant?.id) return

    setWaTestLoading(true)
    setWaTestResult(null)
    try {
      const res = await WhatsAppService.testConnection({
        tenant_id: tenant.id,
        test_phone: testPhoneNumber.trim() || undefined,
      })

      if (res.success) {
        setWaTestResult({
          success: true,
          message: res.message || 'Comunicação com Meta Graph API validada com sucesso!',
          details: res.data,
        })
        toast({
          title: 'Conexão WhatsApp OK',
          description: res.message,
        })
      } else {
        setWaTestResult({
          success: false,
          message: res.message || 'Falha ao validar Phone Number ID ou Token.',
        })
        toast({
          title: 'Teste de Conexão WhatsApp falhou',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao realizar teste de conexão.'
      setWaTestResult({
        success: false,
        message: msg,
      })
      toast({
        title: 'Erro no teste',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setWaTestLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado para área de transferência!',
      description: `${label} copiado.`,
    })
  }

  const otherIntegrations = [
    {
      id: 'meta_ads',
      name: 'Meta Ads & Conversions API (CAPI)',
      desc: 'Sincronização de leads do Instagram e Facebook Ads + disparo automático do evento Purchase na conversão de contratos.',
      icon: Share2,
      status: 'development',
      details: `Pixel ID: ${tenant?.meta_pixel_id || '948271038592014'}`,
    },
    {
      id: 'google_ads',
      name: 'Google Ads & Enhanced Conversions',
      desc: 'Rastreamento de conversões offline de pesquisas jurídicas fundo de funil e métricas de campanhas.',
      icon: Search,
      status: 'development',
      details: null,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">Central de Integrações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conectores ativos com WhatsApp Cloud API, plataformas de assinatura digital, tráfego e
            mensageria.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD REAL DO WHATSAPP BUSINESS API (META CLOUD API) */}
        <div
          className={`bg-card border-2 ${
            waConnected ? 'border-emerald-500/30' : 'border-primary/20'
          } rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="h-5 w-5" />
              </div>
              {waLoading ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                </Badge>
              ) : waConnected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado (Meta Cloud API)
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
                <h3 className="font-bold text-sm">WhatsApp Business API</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono font-medium">
                  Meta Oficial
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Inbox centralizado para receber e enviar mensagens em tempo real, disparar templates
                e sincronizar status de entrega.
              </p>
            </div>

            {/* SE JÁ HOUVER CONFIGURAÇÃO DO WHATSAPP */}
            {waConnected && waConfig ? (
              <div className="bg-muted/40 border rounded-lg p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <PhoneCall className="h-3 w-3 text-emerald-600" /> Número Conectado
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-foreground">
                    {waConfig.phone_number || waConfig.verified_name || 'Conectado via Meta'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Phone Number ID
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {waConfig.phone_number_id
                      ? `${waConfig.phone_number_id.slice(0, 6)}...${waConfig.phone_number_id.slice(-4)}`
                      : '••••••••'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Qualidade da Conta:</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 text-emerald-600 border-emerald-500/30"
                  >
                    {waConfig.quality_rating || 'GREEN (Excelente)'}
                  </Badge>
                </div>

                {waTestResult && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                      waTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {waTestResult.success ? (
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-tight">{waTestResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Requer conta Meta Business Developer</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Insira o WABA ID, Phone Number ID e Token permanente para receber mensagens no
                  Inbox do CRM.
                </p>
                <Button
                  size="sm"
                  onClick={() => setWaConfigModalOpen(true)}
                  className="w-full h-8 text-xs bg-[#25D366] hover:bg-[#22bf5b] text-white font-semibold gap-1.5 mt-1"
                >
                  <Key className="h-3.5 w-3.5" /> Configurar WhatsApp API
                </Button>
              </div>
            )}
          </div>

          {/* RODAPÉ DO CARD WHATSAPP */}
          {waConnected && (
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWaTestModalOpen(true)}
                disabled={waTestLoading || waActionLoading}
                className="h-7 text-xs gap-1 flex-1"
              >
                {waTestLoading ? (
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
                variant="outline"
                size="sm"
                onClick={() => setWaConfigModalOpen(true)}
                className="h-7 text-xs gap-1"
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectWhatsApp}
                disabled={waActionLoading}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
              >
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          )}
        </div>

        {/* CARD REAL DO CALENDLY */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-[#006BFF] text-white flex items-center justify-center shadow-xs">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              {calendlyLoading ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                </Badge>
              ) : calendlyConnected ? (
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
                <h3 className="font-bold text-sm">Calendly</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono font-medium">
                  Agendamento Real
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Agendamento de reuniões jurídicas e sincronização automática do link de agendamento
                na criação de tarefas do Lead.
              </p>
            </div>

            {/* SE JÁ HOUVER CONFIGURAÇÃO DO CALENDLY */}
            {calendlyConnected ? (
              <div className="bg-muted/40 border rounded-lg p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Token Seguro
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    •••••••• (Protegido no backend)
                  </span>
                </div>

                {calendlySchedulingUrl && (
                  <div className="space-y-1 pt-1 border-t">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Link de Agendamento Oficial:
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        readOnly
                        value={calendlySchedulingUrl}
                        className="h-7 text-[11px] font-mono bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(calendlySchedulingUrl, 'Link do Calendly')}
                        className="h-7 px-2 shrink-0"
                        title="Copiar link"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a
                        href={calendlySchedulingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-input bg-background hover:bg-accent text-xs shrink-0"
                        title="Abrir página do Calendly"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {calendlyConfig?.user_name && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <span>Conta Vinculada:</span>
                    <span className="font-medium text-foreground">
                      {calendlyConfig.user_name}{' '}
                      {calendlyConfig.user_email ? `(${calendlyConfig.user_email})` : ''}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Última sincronização:</span>
                  <span className="font-medium text-foreground">
                    {formatSyncDate(calendlyConfig?.last_sync || calendlyConfig?.updated)}
                  </span>
                </div>

                {calendlyTestResult && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                      calendlyTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {calendlyTestResult.success ? (
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-tight">{calendlyTestResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              /* SE NÃO HOUVER TOKEN SALVO */
              <form onSubmit={handleConnectCalendly} className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-primary" /> Token de API Calendly
                    </span>
                    <a
                      href="https://calendly.com/integrations/api_webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      Obter token →
                    </a>
                  </Label>
                  <Input
                    type="password"
                    value={calendlyTokenInput}
                    onChange={(e) => setCalendlyTokenInput(e.target.value)}
                    placeholder="Cole seu Personal Access Token do Calendly..."
                    className="h-8 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    O token é validado na API oficial do Calendly e salvo com segurança.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={calendlyActionLoading}
                  size="sm"
                  className="w-full h-8 text-xs bg-[#006BFF] hover:bg-[#0052cc] text-white font-semibold gap-1.5"
                >
                  {calendlyActionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Conectar Calendly
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* RODAPÉ DO CARD CALENDLY */}
          {calendlyConnected && (
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestCalendlyConnection}
                disabled={calendlyTestLoading || calendlyActionLoading}
                className="h-7 text-xs gap-1 flex-1"
              >
                {calendlyTestLoading ? (
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
                onClick={handleDisconnectCalendly}
                disabled={calendlyActionLoading}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
              >
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          )}
        </div>

        {/* CARD REAL DO GOOGLE MEET */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#4285F4]/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-[#4285F4] text-white flex items-center justify-center shadow-xs">
                <Video className="h-5 w-5 text-white" />
              </div>
              {googleMeetLoading ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                </Badge>
              ) : googleMeetConnected ? (
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
                <h3 className="font-bold text-sm">Google Meet</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono font-medium">
                  Videoconferência
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Geração automática de links e salas de reuniões no Google Meet diretamente no
                agendamento de tarefas e compromissos com leads.
              </p>
            </div>

            {/* SE JÁ HOUVER CONFIGURAÇÃO DO GOOGLE MEET */}
            {googleMeetConnected ? (
              <div className="bg-muted/40 border rounded-lg p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Token / API Key
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    •••••••• (Protegido no backend)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Última sincronização:</span>
                  <span className="font-medium text-foreground">
                    {formatSyncDate(googleMeetConfig?.last_sync || googleMeetConfig?.updated)}
                  </span>
                </div>

                {googleMeetTestResult && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                      googleMeetTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {googleMeetTestResult.success ? (
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-tight">{googleMeetTestResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              /* SE NÃO HOUVER TOKEN SALVO */
              <form onSubmit={handleConnectGoogleMeet} className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-primary" /> API Key / Credencial Google
                    </span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      Google Cloud Console →
                    </a>
                  </Label>
                  <Input
                    type="password"
                    value={googleMeetTokenInput}
                    onChange={(e) => setGoogleMeetTokenInput(e.target.value)}
                    placeholder="Cole sua API Key ou OAuth Token do Google..."
                    className="h-8 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Credencial utilizada para criar salas virtuais do Google Meet com segurança.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={googleMeetActionLoading}
                  size="sm"
                  className="w-full h-8 text-xs bg-[#4285F4] hover:bg-[#3367d6] text-white font-semibold gap-1.5"
                >
                  {googleMeetActionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Conectar Google Meet
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* RODAPÉ DO CARD GOOGLE MEET */}
          {googleMeetConnected && (
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestGoogleMeetConnection}
                disabled={googleMeetTestLoading || googleMeetActionLoading}
                className="h-7 text-xs gap-1 flex-1"
              >
                {googleMeetTestLoading ? (
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
                onClick={handleDisconnectGoogleMeet}
                disabled={googleMeetActionLoading}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
              >
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          )}
        </div>

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
          const isDevelopment = item.status === 'development'
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
                  {isDevelopment ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 border-amber-500/30 gap-1"
                    >
                      <AlertCircle className="h-3 w-3" /> Não conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Conectado
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>

              {isDevelopment ? (
                <div className="pt-3 border-t space-y-1.5">
                  {item.details && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Identificador</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {item.details}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    <Info className="h-3 w-3" />
                    <span>Integração em desenvolvimento</span>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {item.details}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast({ title: 'Integração sincronizada com sucesso!' })}
                    className="h-7 text-xs"
                  >
                    Sincronizar
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* MODAL DE CONFIGURAÇÃO WHATSAPP BUSINESS API */}
      <Dialog open={waConfigModalOpen} onOpenChange={setWaConfigModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-legal-serif">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              Configurar WhatsApp Business API (Meta Cloud)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conecte o seu número oficial da Meta Cloud API para habilitar o Inbox de WhatsApp no
              CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnectWhatsApp} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number ID *</Label>
                <Input
                  required
                  placeholder="Ex: 104829104859182"
                  value={waForm.phone_number_id}
                  onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">ID do número no Meta Developers</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">WABA ID (Account ID)</Label>
                <Input
                  placeholder="Ex: 382910482910394"
                  value={waForm.waba_id}
                  onChange={(e) => setWaForm({ ...waForm, waba_id: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">WhatsApp Business Account ID</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Access Token Permanente (Meta Cloud API) *</span>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Meta Developers <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </Label>
              <Input
                type="password"
                required
                placeholder={
                  waConnected
                    ? '•••••••• (Token já salvo no backend)'
                    : 'EAAB... (Cole seu token permanente)'
                }
                value={waForm.token}
                onChange={(e) => setWaForm({ ...waForm, token: e.target.value })}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Armazenado com segurança no banco de dados. Nunca é exposto ao navegador.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Número do WhatsApp</Label>
                <Input
                  placeholder="Ex: +55 (11) 98765-4321"
                  value={waForm.phone_number}
                  onChange={(e) => setWaForm({ ...waForm, phone_number: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Token de Verificação do Webhook</Label>
                <Input
                  value={waForm.verify_token}
                  onChange={(e) => setWaForm({ ...waForm, verify_token: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* CAIXA COM INSTRUÇÕES DE WEBHOOK DA META */}
            <div className="bg-muted/50 border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1 font-semibold text-foreground text-[11px]">
                <HelpCircle className="h-3.5 w-3.5 text-primary" /> Configuração do Webhook no Meta
                Developers
              </div>
              <p className="text-[11px] text-muted-foreground">
                No painel da Meta, adicione o Webhook do WhatsApp com a seguinte URL de retorno e
                Token de Verificação:
              </p>

              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    Callback URL (Webhook):
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Input
                      readOnly
                      value={waWebhookUrl}
                      className="h-7 text-[11px] font-mono bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(waWebhookUrl, 'URL do Webhook')}
                      className="h-7 px-2 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block">Verify Token:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Input
                      readOnly
                      value={waForm.verify_token}
                      className="h-7 text-[11px] font-mono bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(waForm.verify_token, 'Token de Verificação')}
                      className="h-7 px-2 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWaConfigModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={waActionLoading}
                className="h-8 text-xs bg-[#25D366] hover:bg-[#22bf5b] text-white font-semibold gap-1.5"
              >
                {waActionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando na Meta...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Salvar e Conectar
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE TESTE DE CONEXÃO WHATSAPP */}
      <Dialog open={waTestModalOpen} onOpenChange={setWaTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-600" /> Testar Conexão WhatsApp API
            </DialogTitle>
            <DialogDescription className="text-xs">
              Valida se o Phone Number ID e o Access Token estão ativos na Meta e aptos a enviar
              mensagens.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTestWhatsAppConnection} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Número de Teste (Opcional)</Label>
              <Input
                placeholder="Ex: 5511999998888"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Se preenchido com seu WhatsApp, tentará enviar um template de teste oficial
                (hello_world).
              </p>
            </div>

            {waTestResult && (
              <div
                className={`p-3 rounded-lg text-xs space-y-1.5 ${
                  waTestResult.success
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {waTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  )}
                  {waTestResult.message}
                </div>
                {waTestResult.details && (
                  <div className="text-[11px] opacity-90 space-y-0.5 pt-1 border-t border-emerald-500/20 font-mono">
                    <div>Nome Verificado: {waTestResult.details.verified_name || 'N/A'}</div>
                    <div>Número: {waTestResult.details.display_phone_number || 'N/A'}</div>
                    <div>Qualidade: {waTestResult.details.quality_rating || 'GREEN'}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWaTestModalOpen(false)}
                className="h-8 text-xs"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={waTestLoading}
                className="h-8 text-xs bg-primary gap-1.5 font-semibold"
              >
                {waTestLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Executar Diagnóstico
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default IntegrationsPage
