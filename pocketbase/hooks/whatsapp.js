/**
 * PocketBase Hook: WhatsApp Business API (Meta Cloud API) Integration
 *
 * Funcionalidades:
 * 1. Webhook Verification (GET /api/whatsapp/webhook)
 *    - Processa o desafio do Meta Developer Dashboard (hub.mode, hub.verify_token, hub.challenge)
 *
 * 2. Webhook Inbound Events (POST /api/whatsapp/webhook)
 *    - Processa mensagens recebidas (texto, áudio, imagem, documento, sticker, localização)
 *    - Processa atualizações de status de entrega da Meta (sent, delivered, read, failed)
 *    - Se o número remetente não existir como lead, cria automaticamente novo lead
 *    - Registra a mensagem na thread (coleção `lead_messages`) com type='mensagem', team='comercial', channel='whatsapp'
 *
 * 3. Outbound Message API (POST /api/whatsapp/send)
 *    - Envio autenticado de texto, templates oficiais e mídias via WhatsApp Cloud API
 *    - Respeita regra de 24h ou envio via Template aprovado
 *    - Persiste mensagem na thread em `lead_messages`
 *
 * 4. Config & Status Endpoints
 *    - GET /api/whatsapp/config (Consulta credenciais seguras sem expor token)
 *    - POST /api/whatsapp/connect (Salva credenciais de forma segura em `integration_configs`)
 *    - POST /api/whatsapp/disconnect (Remove credenciais)
 *    - POST /api/whatsapp/test-connection (Testa credenciais enviando mensagem ou verificando Phone Number ID)
 */

// --- 1. GET /api/whatsapp/webhook: Verificação do Webhook da Meta ---
routerAdd('GET', '/api/whatsapp/webhook', (e) => {
  try {
    const query = e.requestInfo().query || {}
    const mode = query['hub.mode'] || ''
    const token = query['hub.verify_token'] || ''
    const challenge = query['hub.challenge'] || ''

    console.log('[WhatsApp Webhook Verify] Request:', { mode, token })

    if (mode === 'subscribe') {
      // Verificar se bate com env ou com verify_token em integration_configs ou system_secrets
      const envVerifyToken =
        $os.getenv('WHATSAPP_VERIFY_TOKEN') || 'skip_hub_crm_whatsapp_verify_token'
      let isTokenValid = token === envVerifyToken || token === 'skip_hub_crm_whatsapp_verify_token'

      if (!isTokenValid) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'provider = "whatsapp" && is_active = true',
            '-created',
            5,
            0,
          )
          if (configs && configs.length > 0) {
            for (let i = 0; i < configs.length; i++) {
              const cfgRec = configs[i]
              const secret = cfgRec.getString('webhook_secret')
              const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
              const jsonSecret = cfgJson.verify_token || cfgJson.webhook_secret || ''
              if (token === secret || token === jsonSecret) {
                isTokenValid = true
                break
              }
            }
          }
        } catch (_) {}
      }

      if (isTokenValid || !envVerifyToken) {
        console.log('[WhatsApp Webhook Verify] Subscrição aceita com sucesso. Challenge retornado.')
        return e.string(200, challenge)
      } else {
        console.warn('[WhatsApp Webhook Verify] Token de verificação inválido:', token)
        return e.string(403, 'Forbidden: Invalid verify token')
      }
    }

    return e.string(400, 'Bad Request')
  } catch (err) {
    console.error('[WhatsApp Webhook Verify] Erro:', err)
    return e.string(500, 'Internal Server Error')
  }
})

// --- 2. POST /api/whatsapp/webhook: Processamento de Mensagens & Status da Meta ---
routerAdd('POST', '/api/whatsapp/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}
    console.log('[WhatsApp Webhook Inbound] Payload:', JSON.stringify(body))

    if (body.object !== 'whatsapp_business_account' && !body.entry) {
      return e.json(200, { status: 'ignored', message: 'Not a whatsapp business event' })
    }

    const entries = body.entry || []
    let processedMessages = 0
    let processedStatuses = 0

    // Buscar tenant padrão para atribuir novos leads caso não especificado
    let defaultTenantId = ''
    try {
      const tenants = $app.findRecordsByFilter('tenants', 'status = "active"', '-created', 1, 0)
      if (tenants && tenants.length > 0) {
        defaultTenantId = tenants[0].id
      }
    } catch (_) {}

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const changes = entry.changes || []

      for (let j = 0; j < changes.length; j++) {
        const change = changes[j]
        const value = change.value || {}
        const metadata = value.metadata || {}
        const phoneNumberId = metadata.phone_number_id || ''
        const displayPhoneNumber = metadata.display_phone_number || ''

        // Identificar tenant dono deste phone_number_id se houver
        let matchedTenantId = defaultTenantId
        let integrationRec = null
        if (phoneNumberId) {
          try {
            const configs = $app.findRecordsByFilter(
              'integration_configs',
              'provider = "whatsapp" && is_active = true',
              '-created',
              10,
              0,
            )
            for (let k = 0; k < configs.length; k++) {
              const cfg = configs[k]
              const jsonCfg = cfg.get('config_json') || cfg.get('config') || {}
              if (
                jsonCfg.phone_number_id === phoneNumberId ||
                jsonCfg.phone_number === displayPhoneNumber ||
                cfg.getString('webhook_secret') === phoneNumberId
              ) {
                matchedTenantId = cfg.getString('tenant_id') || defaultTenantId
                integrationRec = cfg
                break
              }
            }
          } catch (_) {}
        }

        // 2.1 Processar Status de Mensagens (sent, delivered, read, failed)
        const statuses = value.statuses || []
        for (let s = 0; s < statuses.length; s++) {
          const statusObj = statuses[s]
          const wamid = statusObj.id || ''
          const statusName = statusObj.status || '' // sent, delivered, read, failed

          if (wamid && statusName) {
            try {
              const msgRec = $app.findFirstRecordByData('lead_messages', 'external_id', wamid)
              if (msgRec) {
                msgRec.set('status_delivery', statusName)
                const currentMeta = msgRec.get('metadata') || {}
                currentMeta.last_status = statusName
                currentMeta.status_updated_at = new Date().toISOString()
                if (statusObj.errors) {
                  currentMeta.delivery_errors = statusObj.errors
                }
                msgRec.set('metadata', currentMeta)
                $app.save(msgRec)
                processedStatuses++
              }
            } catch (_) {}
          }
        }

        // 2.2 Processar Mensagens Recebidas (inbound)
        const contacts = value.contacts || []
        const messages = value.messages || []

        for (let m = 0; m < messages.length; m++) {
          const msg = messages[m]
          const msgId = msg.id || '' // wamid
          const fromRaw = msg.from || '' // número do remetente
          const timestamp = msg.timestamp
            ? new Date(Number(msg.timestamp) * 1000).toISOString()
            : new Date().toISOString()
          const msgType = msg.type || 'text'

          // Extrair nome do contato
          let contactName = ''
          for (let c = 0; c < contacts.length; c++) {
            if (contacts[c].wa_id === fromRaw && contacts[c].profile) {
              contactName = contacts[c].profile.name || ''
              break
            }
          }
          if (!contactName) {
            contactName = 'WhatsApp: ' + fromRaw
          }

          // Extrair conteúdo e mídia da mensagem
          let content = ''
          let mediaType = 'text'
          let mediaUrl = ''
          let mediaCaption = ''

          if (msgType === 'text' && msg.text) {
            content = msg.text.body || ''
            mediaType = 'text'
          } else if (msgType === 'image' && msg.image) {
            mediaType = 'image'
            mediaCaption = msg.image.caption || ''
            content = mediaCaption ? `📷 [Imagem] ${mediaCaption}` : '📷 [Imagem]'
            mediaUrl = msg.image.id || '' // Media ID da Meta
          } else if (msgType === 'audio' && msg.audio) {
            mediaType = 'audio'
            content = '🎵 [Áudio / Mensagem de Voz]'
            mediaUrl = msg.audio.id || ''
          } else if (msgType === 'document' && msg.document) {
            mediaType = 'document'
            mediaCaption = msg.document.filename || msg.document.caption || ''
            content = mediaCaption ? `📄 [Documento: ${mediaCaption}]` : '📄 [Documento]'
            mediaUrl = msg.document.id || ''
          } else if (msgType === 'video' && msg.video) {
            mediaType = 'video'
            mediaCaption = msg.video.caption || ''
            content = mediaCaption ? `🎥 [Vídeo] ${mediaCaption}` : '🎥 [Vídeo]'
            mediaUrl = msg.video.id || ''
          } else if (msgType === 'sticker' && msg.sticker) {
            mediaType = 'sticker'
            content = '🏷️ [Figurinha]'
            mediaUrl = msg.sticker.id || ''
          } else if (msgType === 'location' && msg.location) {
            mediaType = 'location'
            content = `📍 [Localização: ${msg.location.latitude}, ${msg.location.longitude}] ${msg.location.name || ''}`
          } else if (msgType === 'button' && msg.button) {
            content = `🔘 [Botão Clicado: ${msg.button.text || msg.button.payload}]`
          } else if (msgType === 'interactive' && msg.interactive) {
            const intObj = msg.interactive
            if (intObj.button_reply) {
              content = `🔘 [Opção: ${intObj.button_reply.title}]`
            } else if (intObj.list_reply) {
              content = `📋 [Lista: ${intObj.list_reply.title}]`
            } else {
              content = '📱 [Resposta Interativa]'
            }
          } else {
            content = `💬 [Mensagem: ${msgType}]`
          }

          // Formatar número para busca/criação de lead
          let cleanPhone = fromRaw.replace(/\D/g, '')
          let formattedPhone = cleanPhone
          if (cleanPhone.length >= 10 && !cleanPhone.startsWith('+')) {
            formattedPhone = '+' + cleanPhone
          }

          // Buscar se já existe lead pelo número de telefone ou whatsapp
          let leadRec = null
          try {
            const possibleLeads = $app.findRecordsByFilter(
              'leads',
              'phone ~ "' + cleanPhone + '" || whatsapp ~ "' + cleanPhone + '"',
              '-created',
              1,
              0,
            )
            if (possibleLeads && possibleLeads.length > 0) {
              leadRec = possibleLeads[0]
            }
          } catch (_) {}

          // Se não encontrou pelo número exato, tentar sem o 55
          if (!leadRec && cleanPhone.startsWith('55') && cleanPhone.length > 10) {
            const localPhone = cleanPhone.substring(2)
            try {
              const possibleLeads = $app.findRecordsByFilter(
                'leads',
                'phone ~ "' + localPhone + '" || whatsapp ~ "' + localPhone + '"',
                '-created',
                1,
                0,
              )
              if (possibleLeads && possibleLeads.length > 0) {
                leadRec = possibleLeads[0]
              }
            } catch (_) {}
          }

          // Se o lead não existir, criar automaticamente
          if (!leadRec) {
            try {
              const leadsCol = $app.findCollectionByNameOrId('leads')
              leadRec = new Record(leadsCol)
              leadRec.set('name', contactName)
              leadRec.set('phone', formattedPhone)
              leadRec.set('whatsapp', formattedPhone)
              leadRec.set('tenant_id', matchedTenantId)
              leadRec.set('source', 'WhatsApp')
              leadRec.set('origem', 'WhatsApp')
              leadRec.set('channel', 'WhatsApp Business API')
              leadRec.set('team_owner', 'comercial')
              leadRec.set('team', 'comercial')
              leadRec.set('status', 'Novo Lead')
              leadRec.set('temperature', 'hot')
              leadRec.set('score', 80)
              leadRec.set('observacoes', 'Lead criado automaticamente via WhatsApp Business API.')
              leadRec.set('last_inbound_message_at', timestamp)
              leadRec.set('whatsapp_conversation_id', fromRaw)
              $app.save(leadRec)
              console.log(
                '[WhatsApp Webhook] Novo lead criado automaticamente:',
                leadRec.id,
                contactName,
              )
            } catch (createLeadErr) {
              console.error('[WhatsApp Webhook] Erro ao criar lead:', createLeadErr)
            }
          } else {
            // Atualizar timestamp da última mensagem inbound no lead
            try {
              leadRec.set('last_inbound_message_at', timestamp)
              if (!leadRec.getString('whatsapp')) {
                leadRec.set('whatsapp', formattedPhone)
              }
              $app.save(leadRec)
            } catch (_) {}
          }

          // Registrar mensagem na coleção `lead_messages`
          if (leadRec) {
            try {
              // Evitar duplicidade por external_id (wamid)
              let existingMsg = null
              if (msgId) {
                try {
                  existingMsg = $app.findFirstRecordByData('lead_messages', 'external_id', msgId)
                } catch (_) {}
              }

              if (!existingMsg) {
                const leadMessagesCol = $app.findCollectionByNameOrId('lead_messages')
                const msgRecord = new Record(leadMessagesCol)
                msgRecord.set('tenant_id', leadRec.getString('tenant_id') || matchedTenantId)
                msgRecord.set('lead_id', leadRec.id)
                msgRecord.set('team', 'comercial')
                msgRecord.set('type', 'mensagem')
                msgRecord.set('channel', 'whatsapp')
                msgRecord.set('direction', 'inbound')
                msgRecord.set('status_delivery', 'delivered')
                msgRecord.set('external_id', msgId)
                msgRecord.set('content', content)
                msgRecord.set('media_type', mediaType)
                msgRecord.set('media_url', mediaUrl)
                msgRecord.set('media_caption', mediaCaption)
                msgRecord.set('metadata', {
                  raw_from: fromRaw,
                  contact_name: contactName,
                  phone_number_id: phoneNumberId,
                  meta_timestamp: timestamp,
                  raw_message: msg,
                })

                $app.save(msgRecord)
                processedMessages++
                console.log(
                  '[WhatsApp Webhook] Mensagem salva na thread:',
                  msgRecord.id,
                  'lead:',
                  leadRec.id,
                )
              }
            } catch (saveMsgErr) {
              console.error('[WhatsApp Webhook] Erro ao salvar mensagem:', saveMsgErr)
            }
          }
        }
      }
    }

    return e.json(200, {
      success: true,
      processed_messages: processedMessages,
      processed_statuses: processedStatuses,
    })
  } catch (err) {
    console.error('[WhatsApp Webhook] Erro:', err)
    return e.json(500, {
      success: false,
      error: 'Erro no processamento do webhook WhatsApp: ' + (err.message || String(err)),
    })
  }
})

// --- 3. POST /api/whatsapp/send: Envio de Mensagens via WhatsApp Cloud API ---
routerAdd(
  'POST',
  '/api/whatsapp/send',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const leadId = body.lead_id || ''
      const tenantId = body.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''
      let toPhone = (body.to || body.phone || '').trim()
      const messageText = (body.message || body.content || body.text || '').trim()
      const templateName = body.template_name || ''
      const templateLanguage = body.template_language || 'pt_BR'
      const templateComponents = body.template_components || []
      const mediaType = body.media_type || 'text'
      const mediaUrl = body.media_url || ''
      const mediaCaption = body.media_caption || ''
      const authorId = (e.auth && e.auth.id) || body.author_id || ''
      const team = body.team || 'comercial'
      const forceSend = !!body.force // bypass 24h warning se for template ou confirmação do usuário

      if (!leadId && !toPhone) {
        return e.json(400, {
          success: false,
          error: 'lead_id ou número de telefone é obrigatório.',
        })
      }

      let leadRec = null
      if (leadId) {
        try {
          leadRec = $app.findRecordById('leads', leadId)
          if (!toPhone && leadRec) {
            toPhone = leadRec.getString('whatsapp') || leadRec.getString('phone') || ''
          }
        } catch (_) {}
      }

      if (!toPhone) {
        return e.json(400, {
          success: false,
          error: 'Nenhum número de WhatsApp encontrado para o lead.',
        })
      }

      // Limpar número (remover caracteres não numéricos, garantir DDI 55)
      let cleanPhone = toPhone.replace(/\D/g, '')
      if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone
      }

      // 1. Obter credenciais do WhatsApp na coleção integration_configs
      let accessToken = ''
      let phoneNumberId = ''
      let wabaId = ''

      if (tenantId) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
            '-created',
            1,
            0,
          )
          if (configs && configs.length > 0) {
            const cfg = configs[0]
            accessToken = cfg.getString('api_token')
            const jsonCfg = cfg.get('config_json') || cfg.get('config') || {}
            if (!accessToken && jsonCfg.access_token) accessToken = jsonCfg.access_token
            if (!accessToken && jsonCfg.token) accessToken = jsonCfg.token
            phoneNumberId = jsonCfg.phone_number_id || cfg.getString('webhook_secret') || ''
            wabaId = jsonCfg.waba_id || jsonCfg.business_account_id || ''
          }
        } catch (_) {}
      }

      // Fallbacks para secrets do sistema ou env
      if (!accessToken) {
        try {
          const secretRec = $app.findFirstRecordByData(
            'system_secrets',
            'key',
            'WHATSAPP_ACCESS_TOKEN',
          )
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            accessToken = secretRec.getString('value')
          }
        } catch (_) {}
      }

      if (!phoneNumberId) {
        try {
          const secretRec = $app.findFirstRecordByData(
            'system_secrets',
            'key',
            'WHATSAPP_PHONE_NUMBER_ID',
          )
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            phoneNumberId = secretRec.getString('value')
          }
        } catch (_) {}
      }

      if (!accessToken) accessToken = $os.getenv('WHATSAPP_ACCESS_TOKEN') || ''
      if (!phoneNumberId) phoneNumberId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || ''
      if (!wabaId) wabaId = $os.getenv('WHATSAPP_WABA_ID') || ''

      if (!accessToken || !phoneNumberId) {
        return e.json(400, {
          success: false,
          error:
            'WhatsApp Business API não está configurado. Insira o Access Token e Phone Number ID em Configurações > Integrações.',
        })
      }

      // 2. Verificar Janela de 24 horas (Políticas da Meta)
      let isWithin24h = false
      let hoursSinceLastInbound = 999
      if (leadRec) {
        const lastInbound = leadRec.getString('last_inbound_message_at')
        if (lastInbound) {
          const lastDate = new Date(lastInbound)
          const diffMs = Date.now() - lastDate.getTime()
          hoursSinceLastInbound = diffMs / (1000 * 60 * 60)
          isWithin24h = hoursSinceLastInbound <= 24
        }
      }

      // Se passou da janela de 24h e não é template oficial, alertar ou exigir template
      if (!isWithin24h && !templateName && !forceSend) {
        return e.json(403, {
          success: false,
          is_window_expired: true,
          hours_since_last_inbound: Math.round(hoursSinceLastInbound),
          error:
            'A janela de 24 horas da Meta para mensagens livres expirou. Para reabrir a conversa, envie um Template de Mensagem aprovado.',
        })
      }

      // 3. Montar payload para a Meta Cloud API (v21.0)
      const metaUrl =
        'https://graph.facebook.com/v21.0/' + encodeURIComponent(phoneNumberId.trim()) + '/messages'
      let payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
      }

      if (templateName) {
        // Envio de Template
        payload.type = 'template'
        payload.template = {
          name: templateName,
          language: {
            code: templateLanguage,
          },
        }
        if (templateComponents && templateComponents.length > 0) {
          payload.template.components = templateComponents
        }
      } else if (mediaType === 'image' && mediaUrl) {
        payload.type = 'image'
        payload.image = {
          link: mediaUrl,
          caption: mediaCaption || messageText || undefined,
        }
      } else if (mediaType === 'audio' && mediaUrl) {
        payload.type = 'audio'
        payload.audio = {
          link: mediaUrl,
        }
      } else if (mediaType === 'document' && mediaUrl) {
        payload.type = 'document'
        payload.document = {
          link: mediaUrl,
          caption: mediaCaption || undefined,
          filename: mediaCaption || 'documento.pdf',
        }
      } else {
        // Texto simples
        payload.type = 'text'
        payload.text = {
          preview_url: true,
          body: messageText,
        }
      }

      // 4. Executar chamada HTTP para a API da Meta
      let apiRes
      try {
        apiRes = $http.send({
          url: metaUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + accessToken.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 25,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error:
            'Falha de comunicação com a Meta Cloud API: ' + (httpErr.message || String(httpErr)),
        })
      }

      const resData = apiRes.json || {}
      if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
        const errorMsg =
          (resData.error && resData.error.message) ||
          JSON.stringify(resData) ||
          'Erro retornado pela WhatsApp Business API.'
        return e.json(apiRes.statusCode, {
          success: false,
          error: errorMsg,
          details: resData,
        })
      }

      const wamid =
        resData.messages && resData.messages[0] && resData.messages[0].id
          ? resData.messages[0].id
          : ''

      // 5. Persistir mensagem enviada na thread (lead_messages)
      let savedMsg = null
      if (leadRec) {
        try {
          const leadMessagesCol = $app.findCollectionByNameOrId('lead_messages')
          savedMsg = new Record(leadMessagesCol)
          savedMsg.set('tenant_id', leadRec.getString('tenant_id') || tenantId)
          savedMsg.set('lead_id', leadRec.id)
          if (authorId) savedMsg.set('author_id', authorId)
          savedMsg.set('team', team)
          savedMsg.set('type', 'mensagem')
          savedMsg.set('channel', 'whatsapp')
          savedMsg.set('direction', 'outbound')
          savedMsg.set('status_delivery', 'sent')
          savedMsg.set('external_id', wamid)
          savedMsg.set(
            'content',
            templateName
              ? `📋 [Template: ${templateName}] ${messageText}`
              : messageText || mediaCaption,
          )
          savedMsg.set('media_type', templateName ? 'template' : mediaType)
          savedMsg.set('media_url', mediaUrl)
          savedMsg.set('media_caption', mediaCaption)
          savedMsg.set('metadata', {
            to_phone: cleanPhone,
            wamid: wamid,
            response: resData,
          })

          $app.save(savedMsg)

          // Atualizar lead com timestamp de outbound
          leadRec.set('last_outbound_message_at', new Date().toISOString())
          $app.save(leadRec)
        } catch (saveErr) {
          console.warn('[WhatsApp Send] Erro ao persistir lead_message:', saveErr)
        }
      }

      return e.json(200, {
        success: true,
        message_id: wamid,
        wamid: wamid,
        record: savedMsg
          ? { id: savedMsg.id, status: 'sent', created: savedMsg.getString('created') }
          : null,
        data: resData,
      })
    } catch (err) {
      console.error('[WhatsApp Send] Erro:', err)
      return e.json(500, {
        success: false,
        error: 'Erro interno ao enviar mensagem WhatsApp: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 4. POST /api/whatsapp/connect: Salvar Credenciais com Segurança ---
routerAdd(
  'POST',
  '/api/whatsapp/connect',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''
      const token = (reqBody.token || reqBody.access_token || '').trim()
      const phoneNumberId = (reqBody.phone_number_id || '').trim()
      const wabaId = (reqBody.waba_id || reqBody.business_account_id || '').trim()
      const phoneNumber = (reqBody.phone_number || '').trim()
      const verifyToken = (reqBody.verify_token || 'skip_hub_crm_whatsapp_verify_token').trim()

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }
      if (!token) {
        return e.json(400, { success: false, error: 'Access Token do WhatsApp é obrigatório.' })
      }
      if (!phoneNumberId) {
        return e.json(400, { success: false, error: 'Phone Number ID é obrigatório.' })
      }

      // Validar o Phone Number ID e o token consultando a Meta Graph API
      let metaValidationRes
      try {
        metaValidationRes = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + encodeURIComponent(phoneNumberId),
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error: 'Falha ao conectar com a Meta Graph API: ' + (httpErr.message || String(httpErr)),
        })
      }

      if (metaValidationRes.statusCode < 200 || metaValidationRes.statusCode >= 300) {
        const errJson = metaValidationRes.json || {}
        return e.json(400, {
          success: false,
          error:
            (errJson.error && errJson.error.message) ||
            'Credenciais inválidas: Não foi possível autenticar o Phone Number ID na Meta.',
        })
      }

      const verifiedData = metaValidationRes.json || {}
      const displayPhone = verifiedData.display_phone_number || phoneNumber || ''
      const verifiedName = verifiedData.verified_name || ''
      const qualityRating = verifiedData.quality_rating || 'UNKNOWN'

      // Upsert na coleção integration_configs
      let configRec = null
      try {
        const existing = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
          '-created',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          configRec = existing[0]
        }
      } catch (_) {}

      const col = $app.findCollectionByNameOrId('integration_configs')
      if (!configRec) {
        configRec = new Record(col)
        configRec.set('tenant_id', tenantId)
        configRec.set('provider', 'whatsapp')
      }

      configRec.set('status', 'active')
      configRec.set('is_active', true)
      configRec.set('api_token', token)
      configRec.set('webhook_secret', verifyToken)
      configRec.set('config_json', {
        provider: 'whatsapp',
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        phone_number: displayPhone,
        verified_name: verifiedName,
        quality_rating: qualityRating,
        verify_token: verifyToken,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      })
      configRec.set('config', {
        provider: 'whatsapp',
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        phone_number: displayPhone,
        verified_name: verifiedName,
        quality_rating: qualityRating,
        verify_token: verifyToken,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      })

      $app.save(configRec)

      // Registrar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('tenant_id', tenantId)
        auditRec.set('user_id', e.auth ? e.auth.id : '')
        auditRec.set('action', 'whatsapp_connected')
        auditRec.set('resource_type', 'integration_configs')
        auditRec.set('resource_id', configRec.id)
        $app.save(auditRec)
      } catch (_) {}

      // Retornar SEM expor o token na resposta
      return e.json(200, {
        success: true,
        message: 'WhatsApp Business API conectado com sucesso!',
        config: {
          id: configRec.id,
          provider: 'whatsapp',
          status: 'active',
          is_active: true,
          phone_number_id: phoneNumberId,
          phone_number: displayPhone,
          verified_name: verifiedName,
          quality_rating: qualityRating,
          verify_token: verifyToken,
          updated: configRec.getString('updated') || new Date().toISOString(),
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao conectar WhatsApp Business API: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 5. POST /api/whatsapp/disconnect: Remover Credenciais ---
routerAdd(
  'POST',
  '/api/whatsapp/disconnect',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }

      let count = 0
      try {
        const existing = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
          '-created',
          10,
          0,
        )
        if (existing && existing.length > 0) {
          for (let i = 0; i < existing.length; i++) {
            $app.delete(existing[i])
            count++
          }
        }
      } catch (delErr) {
        console.warn('[WhatsApp Disconnect] Erro ao deletar config:', delErr)
      }

      // Registrar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('tenant_id', tenantId)
        auditRec.set('user_id', e.auth ? e.auth.id : '')
        auditRec.set('action', 'whatsapp_disconnected')
        auditRec.set('resource_type', 'integration_configs')
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'WhatsApp Business API desconectado com sucesso.',
        removed_count: count,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao desconectar WhatsApp: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 6. GET /api/whatsapp/config: Obter Configuração (sem expor token) ---
routerAdd(
  'GET',
  '/api/whatsapp/config',
  (e) => {
    try {
      const tenantId = e.requestInfo().query.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }

      let isConnected = false
      let configData = null

      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          const token = cfgRec.getString('api_token')
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (token || cfgJson.access_token || cfgJson.token) {
            isConnected = true
            configData = {
              id: cfgRec.id,
              provider: 'whatsapp',
              status: cfgRec.getString('status') || 'active',
              is_active: cfgRec.get('is_active') !== false,
              phone_number_id: cfgJson.phone_number_id || '',
              waba_id: cfgJson.waba_id || '',
              phone_number: cfgJson.phone_number || '',
              verified_name: cfgJson.verified_name || '',
              quality_rating: cfgJson.quality_rating || 'UNKNOWN',
              verify_token:
                cfgRec.getString('webhook_secret') ||
                cfgJson.verify_token ||
                'skip_hub_crm_whatsapp_verify_token',
              created: cfgRec.getString('created'),
              updated: cfgRec.getString('updated'),
              last_sync: cfgJson.last_sync || cfgRec.getString('updated'),
            }
          }
        }
      } catch (qErr) {
        console.warn('[WhatsApp Config] Erro ao buscar:', qErr)
      }

      // Fallback para secrets do sistema
      if (!isConnected) {
        try {
          const secretToken = $app.findFirstRecordByData(
            'system_secrets',
            'key',
            'WHATSAPP_ACCESS_TOKEN',
          )
          if (
            secretToken &&
            (!secretToken.getString('tenant_id') ||
              secretToken.getString('tenant_id') === tenantId) &&
            secretToken.getString('value')
          ) {
            let phoneId = ''
            try {
              const phoneRec = $app.findFirstRecordByData(
                'system_secrets',
                'key',
                'WHATSAPP_PHONE_NUMBER_ID',
              )
              if (phoneRec) phoneId = phoneRec.getString('value')
            } catch (_) {}

            isConnected = true
            configData = {
              id: 'system_secret',
              provider: 'whatsapp',
              status: 'active',
              is_active: true,
              phone_number_id: phoneId,
              phone_number: '',
              verify_token: 'skip_hub_crm_whatsapp_verify_token',
              created: secretToken.getString('created'),
              updated: secretToken.getString('updated'),
              last_sync: secretToken.getString('updated'),
            }
          }
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        connected: isConnected,
        config: configData,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao obter status do WhatsApp: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 7. POST /api/whatsapp/test-connection: Testar Conexão com a Meta API ---
routerAdd(
  'POST',
  '/api/whatsapp/test-connection',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''
      let token = (reqBody.token || reqBody.access_token || '').trim()
      let phoneNumberId = (reqBody.phone_number_id || '').trim()
      const testPhone = (reqBody.test_phone || '').trim()

      if (!token && tenantId) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
            '-created',
            1,
            0,
          )
          if (configs && configs.length > 0) {
            const cfg = configs[0]
            token = cfg.getString('api_token')
            const cfgJson = cfg.get('config_json') || cfg.get('config') || {}
            if (!token && cfgJson.access_token) token = cfgJson.access_token
            if (!phoneNumberId) phoneNumberId = cfgJson.phone_number_id || ''
          }
        } catch (_) {}
      }

      if (!token) token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || ''
      if (!phoneNumberId) phoneNumberId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || ''

      if (!token || !phoneNumberId) {
        return e.json(400, {
          success: false,
          status: 'error',
          message: 'Access Token e Phone Number ID não configurados.',
        })
      }

      // Teste 1: Consultar status do Phone Number ID na Meta Graph API
      let metaRes
      try {
        metaRes = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + encodeURIComponent(phoneNumberId),
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          status: 'error',
          message:
            'Falha ao comunicar com a Meta Graph API: ' + (httpErr.message || String(httpErr)),
        })
      }

      if (metaRes.statusCode < 200 || metaRes.statusCode >= 300) {
        const errJson = metaRes.json || {}
        return e.json(metaRes.statusCode, {
          success: false,
          status: 'error',
          message:
            (errJson.error && errJson.error.message) ||
            'Falha de autenticação com a WhatsApp Business API (Meta).',
        })
      }

      const verifiedData = metaRes.json || {}

      // Teste 2 (opcional): Se foi passado um número de teste, enviar mensagem de teste (ou "hello_world" template)
      let sendTestResult = null
      if (testPhone) {
        let cleanTest = testPhone.replace(/\D/g, '')
        if (cleanTest.length >= 10 && !cleanTest.startsWith('55')) {
          cleanTest = '55' + cleanTest
        }

        try {
          const sendRes = $http.send({
            url:
              'https://graph.facebook.com/v21.0/' + encodeURIComponent(phoneNumberId) + '/messages',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanTest,
              type: 'template',
              template: {
                name: 'hello_world',
                language: { code: 'en_US' },
              },
            }),
            timeout: 15,
          })
          sendTestResult = {
            statusCode: sendRes.statusCode,
            data: sendRes.json,
          }
        } catch (sendErr) {
          sendTestResult = { error: String(sendErr) }
        }
      }

      return e.json(200, {
        success: true,
        status: 'connected',
        message: 'Conexão com WhatsApp Business API (Meta Cloud API) testada com sucesso!',
        data: {
          verified_name: verifiedData.verified_name,
          display_phone_number: verifiedData.display_phone_number,
          quality_rating: verifiedData.quality_rating,
          phone_number_id: phoneNumberId,
          send_test_result: sendTestResult,
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        status: 'error',
        message: 'Erro interno no teste de conexão: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
