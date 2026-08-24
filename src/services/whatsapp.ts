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
   * Conecta credenciais da WhatsApp Business API de forma nativa via integration_configs
   */
  static async connect(params: {
    tenant_id: string
    token: string
    phone_number_id: string
    waba_id?: string
    phone_number?: string
    verify_token?: string
  }): Promise<{ success: boolean; message?: string; error?: string; config?: WhatsAppConfig }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${params.tenant_id}" && provider = "whatsapp"`,
      })

      const payload = {
        tenant_id: params.tenant_id,
        provider: 'whatsapp',
        api_token: params.token.trim(),
        api_key: params.token.trim(),
        is_active: true,
        webhook_secret: params.verify_token || 'skip_hub_crm_whatsapp_verify_token',
        config_json: {
          provider: 'whatsapp',
          phone_number_id: params.phone_number_id.trim(),
          waba_id: params.waba_id?.trim() || '',
          phone_number: params.phone_number?.trim() || '',
          verify_token: params.verify_token || 'skip_hub_crm_whatsapp_verify_token',
          connected_at: new Date().toISOString(),
        },
      }

      let record: any
      if (list.items.length > 0) {
        record = await pb.collection('integration_configs').update(list.items[0].id, payload)
      } else {
        record = await pb.collection('integration_configs').create(payload)
      }

      const cfg = record.config_json || record.config || {}
      if (record.status === 'error') {
        return {
          success: false,
          error: cfg.error_message || 'Credenciais da Meta inválidas ou rejeitadas pela Graph API.',
        }
      }

      return {
        success: true,
        message: 'WhatsApp Business API conectado e validado com sucesso!',
        config: {
          id: record.id,
          provider: 'whatsapp',
          status: record.status,
          is_active: record.is_active !== false,
          phone_number_id: cfg.phone_number_id,
          waba_id: cfg.waba_id,
          phone_number: cfg.display_phone_number || cfg.phone_number,
          verified_name: cfg.verified_name,
          quality_rating: cfg.quality_rating,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao salvar configuração do WhatsApp.',
      }
    }
  }

  /**
   * Desconecta e remove credenciais salvas do WhatsApp
   */
  static async disconnect(
    tenantId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getFullList({
        filter: `tenant_id = "${tenantId}" && provider = "whatsapp"`,
      })
      for (const item of list) {
        await pb.collection('integration_configs').delete(item.id)
      }
      return { success: true, message: 'WhatsApp desconectado com sucesso.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao desconectar WhatsApp.' }
    }
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
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${params.tenant_id}" && provider = "whatsapp"`,
      })

      if (list.items.length === 0 && (!params.token || !params.phone_number_id)) {
        return {
          success: false,
          status: 'error',
          message: 'WhatsApp não configurado no tenant.',
        }
      }

      if (list.items.length > 0) {
        const item = list.items[0]
        const currentCfg = item.config_json || item.config || {}
        const phoneId = params.phone_number_id || currentCfg.phone_number_id
        const token = params.token || item.api_token || item.api_key

        const updated = await pb.collection('integration_configs').update(item.id, {
          api_token: token,
          api_key: token,
          config_json: {
            ...currentCfg,
            phone_number_id: phoneId,
            test_requested: true,
            tested_at: new Date().toISOString(),
          },
        })

        const cfg = updated.config_json || updated.config || {}
        if (updated.status === 'active') {
          return {
            success: true,
            status: 'connected',
            message: `Conexão válida com WhatsApp Cloud API! Conta: ${cfg.verified_name || cfg.display_phone_number || 'Verificada'}`,
            data: cfg,
          }
        } else {
          return {
            success: false,
            status: 'error',
            message: cfg.error_message || 'Falha na validação com Meta Graph API.',
            data: cfg,
          }
        }
      }

      // Se passou dados avulsos para teste
      const tempRec = await pb.collection('integration_configs').create({
        tenant_id: params.tenant_id,
        provider: 'whatsapp',
        api_token: params.token,
        api_key: params.token,
        config_json: {
          phone_number_id: params.phone_number_id,
        },
      })
      const cfg = tempRec.config_json || tempRec.config || {}
      const success = tempRec.status === 'active'
      return {
        success,
        status: success ? 'connected' : 'error',
        message: success
          ? `Conexão válida com WhatsApp Cloud API! (${cfg.verified_name || 'OK'})`
          : cfg.error_message || 'Falha de validação.',
        data: cfg,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        message: err?.message || 'Erro ao testar conexão do WhatsApp.',
      }
    }
  }

  /**
   * Envia mensagem de texto, template ou mídia via WhatsApp Business API
   */
  static async sendMessage(params: SendWhatsAppMessageParams): Promise<SendWhatsAppResponse> {
    try {
      const tenantId = params.tenant_id
      if (!tenantId) {
        return { success: false, error: 'tenant_id é obrigatório para envio de WhatsApp' }
      }

      // 1. Grava no histórico de lead_messages
      let messageRec: any = null
      try {
        messageRec = await pb.collection('lead_messages').create({
          tenant_id: tenantId,
          lead_id: params.lead_id || '',
          channel: 'whatsapp',
          direction: 'outbound',
          sender_type: 'agent',
          content: params.message || params.content || '',
          status_delivery: 'sending',
          metadata: {
            to: params.to || params.phone,
            template_name: params.template_name,
            team: params.team,
          },
        })
      } catch (e) {
        console.warn('Não foi possível gravar lead_messages pré-envio', e)
      }

      // 2. Aciona o envio via update no integration_configs
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "whatsapp"`,
      })

      if (list.items.length === 0) {
        return { success: false, error: 'WhatsApp não está configurado para este tenant.' }
      }

      const item = list.items[0]
      const currentCfg = item.config_json || item.config || {}
      const updated = await pb.collection('integration_configs').update(item.id, {
        config_json: {
          ...currentCfg,
          send_message: {
            to: params.to || params.phone,
            text: params.message || params.content,
            template_name: params.template_name,
            template_language: params.template_language || 'pt_BR',
            template_components: params.template_components,
          },
        },
      })

      const resCfg = updated.config_json || updated.config || {}
      const lastSend = resCfg.last_send_result

      if (lastSend && !lastSend.success) {
        if (messageRec) {
          await pb
            .collection('lead_messages')
            .update(messageRec.id, {
              status_delivery: 'failed',
            })
            .catch(() => {})
        }
        return {
          success: false,
          error: lastSend.error || 'Falha ao enviar mensagem pela Meta API.',
        }
      }

      if (messageRec && lastSend?.wamid) {
        await pb
          .collection('lead_messages')
          .update(messageRec.id, {
            status_delivery: 'sent',
            external_id: lastSend.wamid,
          })
          .catch(() => {})
      }

      return {
        success: true,
        wamid: lastSend?.wamid,
        message_id: messageRec?.id || lastSend?.wamid,
        record: messageRec,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Erro ao processar envio de WhatsApp.',
      }
    }
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
