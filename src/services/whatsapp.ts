import pb from '@/lib/pocketbase/client'

export interface WhatsAppConfig {
  id?: string
  provider: 'whatsapp'
  status: 'active' | 'inactive' | 'error'
  is_active: boolean
  phone_number_id?: string
  waba_id?: string
  phone_number?: string
  verified_name?: string
  quality_rating?: string
  verify_token?: string
  created?: string
  updated?: string
  last_sync?: string
}

export interface SendWhatsAppMessageParams {
  lead_id?: string
  tenant_id?: string
  to?: string
  phone?: string
  message?: string
  content?: string
  template_name?: string
  template_language?: string
  template_components?: any[]
  media_type?: 'text' | 'image' | 'audio' | 'document' | 'video' | 'template'
  media_url?: string
  media_caption?: string
  team?: 'comercial' | 'juridico' | 'financeiro'
  force?: boolean
}

export interface SendWhatsAppResponse {
  success: boolean
  message_id?: string
  wamid?: string
  record?: any
  data?: any
  error?: string
  is_window_expired?: boolean
  hours_since_last_inbound?: number
}

export class WhatsAppService {
  /**
   * Obtém a configuração atual do WhatsApp para o Tenant (sem expor token sensível)
   */
  static async getConfig(
    tenantId: string,
  ): Promise<{ connected: boolean; config: WhatsAppConfig | null }> {
    try {
      const res = await pb.send('/api/whatsapp/config?tenant_id=' + encodeURIComponent(tenantId), {
        method: 'GET',
      })
      return res || { connected: false, config: null }
    } catch (e) {
      console.warn('Falha ao obter configuração do WhatsApp via endpoint:', e)
      // Fallback: verificar coleção integration_configs
      try {
        const list = await pb.collection('integration_configs').getList(1, 1, {
          filter: `tenant_id = "${tenantId}" && provider = "whatsapp"`,
        })
        if (list.items.length > 0 && list.items[0].is_active !== false) {
          const item = list.items[0]
          const cfg = (item.config_json || item.config || {}) as any
          return {
            connected: true,
            config: {
              id: item.id,
              provider: 'whatsapp',
              status: item.status as any,
              is_active: item.is_active !== false,
              phone_number_id: cfg.phone_number_id || '',
              waba_id: cfg.waba_id || '',
              phone_number: cfg.phone_number || '',
              verified_name: cfg.verified_name || '',
              quality_rating: cfg.quality_rating || 'UNKNOWN',
              verify_token:
                item.webhook_secret || cfg.verify_token || 'skip_hub_crm_whatsapp_verify_token',
              updated: item.updated,
              created: item.created,
            },
          }
        }
      } catch {
        /* fallback ignore */
      }
      return { connected: false, config: null }
    }
  }

  /**
   * Conecta credenciais da WhatsApp Business API de forma segura
   */
  static async connect(params: {
    tenant_id: string
    token: string
    phone_number_id: string
    waba_id?: string
    phone_number?: string
    verify_token?: string
  }): Promise<{ success: boolean; message?: string; error?: string; config?: WhatsAppConfig }> {
    return await pb.send('/api/whatsapp/connect', {
      method: 'POST',
      body: params,
    })
  }

  /**
   * Desconecta e remove credenciais salvas do WhatsApp
   */
  static async disconnect(
    tenantId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return await pb.send('/api/whatsapp/disconnect', {
      method: 'POST',
      body: { tenant_id: tenantId },
    })
  }

  /**
   * Testa a conexão com a Meta Graph API / WhatsApp Cloud API
   */
  static async testConnection(params: {
    tenant_id: string
    token?: string
    phone_number_id?: string
    test_phone?: string
  }): Promise<{
    success: boolean
    status: 'connected' | 'error'
    message: string
    data?: any
  }> {
    return await pb.send('/api/whatsapp/test-connection', {
      method: 'POST',
      body: params,
    })
  }

  /**
   * Envia mensagem de texto, template ou mídia via WhatsApp Business API
   */
  static async sendMessage(params: SendWhatsAppMessageParams): Promise<SendWhatsAppResponse> {
    return await pb.send('/api/whatsapp/send', {
      method: 'POST',
      body: params,
    })
  }

  /**
   * Calcula o status da janela de 24 horas da Meta para o Lead
   */
  static check24hWindow(lastInboundDate?: string): {
    isOpen: boolean
    hoursRemaining: number
    hoursSinceInbound: number
    isExpiringSoon: boolean // menos de 4h restantes
    label: string
  } {
    if (!lastInboundDate) {
      return {
        isOpen: false,
        hoursRemaining: 0,
        hoursSinceInbound: 999,
        isExpiringSoon: false,
        label: 'Sem mensagens recebidas (Necessário Template)',
      }
    }

    try {
      const inboundTime = new Date(lastInboundDate).getTime()
      const now = Date.now()
      const diffHours = (now - inboundTime) / (1000 * 60 * 60)
      const hoursRemaining = Math.max(0, 24 - diffHours)

      if (diffHours <= 24) {
        const isExpiringSoon = hoursRemaining <= 4
        return {
          isOpen: true,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          hoursSinceInbound: Math.round(diffHours * 10) / 10,
          isExpiringSoon,
          label: `Janela Aberta (${Math.floor(hoursRemaining)}h ${Math.round((hoursRemaining % 1) * 60)}m restantes)`,
        }
      }

      return {
        isOpen: false,
        hoursRemaining: 0,
        hoursSinceInbound: Math.round(diffHours),
        isExpiringSoon: false,
        label: `Janela Expirada há ${Math.round(diffHours - 24)}h (Use Template)`,
      }
    } catch {
      return {
        isOpen: false,
        hoursRemaining: 0,
        hoursSinceInbound: 999,
        isExpiringSoon: false,
        label: 'Janela Indeterminada',
      }
    }
  }
}

export default WhatsAppService
