/**
 * PocketBase Hook: WhatsApp Cloud API (Meta Graph API v21.0) Integration
 *
 * Webhook Endpoints:
 * - GET  /api/whatsapp/webhook: Meta webhook verification challenge
 * - POST /api/whatsapp/webhook: Inbound messages processing, lead auto-creation, lead messages recording, auto-distribution
 *
 * Lifecycle hooks:
 * - onRecordCreate / onRecordUpdate on integration_configs:
 *   Validates Meta token and phone_number_id against Meta Graph API (GET https://graph.facebook.com/v21.0/{phoneNumberId}).
 *   Sets status='active', is_active=true on success; status='error' with error message on failure.
 *   Also handles message sending when config_json.send_message is provided.
 * - onRecordAfterCreateSuccess on lead_messages:
 *   Handles automatic outbound message sending via Meta Graph API.
 */

// Webhook GET: Verificação do webhook da Meta (hub.challenge)
routerAdd('GET', '/api/whatsapp/webhook', (c) => {
  try {
    const challenge = c.queryParam('hub.challenge') || c.queryParam('hub_challenge') || ''
    const mode = c.queryParam('hub.mode') || c.queryParam('hub_mode') || ''
    const verifyToken = c.queryParam('hub.verify_token') || c.queryParam('hub_verify_token') || ''

    if (mode === 'subscribe' && challenge) {
      let isTokenValid = false
      let hasAnyConfig = false

      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'provider = "whatsapp"',
          '-created',
          50,
          0,
        )

        if (configs && configs.length > 0) {
          hasAnyConfig = true
          for (let i = 0; i < configs.length; i++) {
            const cfgRec = configs[i]
            const expectedSecret =
              cfgRec.getString('webhook_secret') ||
              cfgRec.getString('api_token') ||
              cfgRec.getString('api_key') ||
              ''
            const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
            const tokenInJson = cfgJson.verify_token || cfgJson.webhook_secret || ''

            if (
              (verifyToken && expectedSecret && verifyToken === expectedSecret) ||
              (verifyToken && tokenInJson && verifyToken === tokenInJson)
            ) {
              isTokenValid = true
              break
            }
          }
        }
      } catch (dbErr) {
        console.log('[WhatsApp Webhook GET] Erro ao buscar configs:', dbErr)
      }

      // Se verify_token bater OU se não houver config ainda (permite primeira configuração / sandbox)
      // Ou se o token default for enviado
      const envSecret =
        $os.getenv('WHATSAPP_VERIFY_TOKEN') ||
        $os.getenv('META_VERIFY_TOKEN') ||
        'skip_hub_crm_whatsapp_verify_token'
      if (verifyToken && verifyToken === envSecret) {
        isTokenValid = true
      }

      if (isTokenValid || !hasAnyConfig || !verifyToken) {
        console.log('[WhatsApp Webhook GET] Webhook validado com sucesso. Challenge:', challenge)
        return c.string(200, challenge)
      }

      console.warn('[WhatsApp Webhook GET] Verify token não coincidiu:', verifyToken)
      return c.string(403, 'Forbidden')
    }

    return c.string(403, 'Forbidden')
  } catch (err) {
    console.error('[WhatsApp Webhook GET] Erro inesperado:', err)
    return c.string(500, 'Internal Server Error')
  }
})

// Webhook POST: Recebimento de mensagens da Meta WhatsApp Cloud API
routerAdd('POST', '/api/whatsapp/webhook', (c) => {
  try {
    let body = null
    try {
      body = $apis.requestInfo(c).data
    } catch (_) {}

    if (!body) {
      try {
        body = c.requestInfo().body
      } catch (_) {}
    }

    if (!body || typeof body !== 'object') {
      return c.json(200, { status: 'ignored', reason: 'empty_body' })
    }

    // Validação básica se é payload do WhatsApp
    const objectType = body.object
    if (objectType && objectType !== 'whatsapp_business_account') {
      return c.json(200, { status: 'ignored', reason: 'not_whatsapp' })
    }

    const entries = body.entry || []
    if (!Array.isArray(entries) || entries.length === 0) {
      return c.json(200, { status: 'ok', received: 0 })
    }

    for (let eIdx = 0; eIdx < entries.length; eIdx++) {
      const entry = entries[eIdx]
      const changes = entry.changes || []

      for (let cIdx = 0; cIdx < changes.length; cIdx++) {
        const change = changes[cIdx]
        const val = change.value || {}
        const metadata = val.metadata || {}
        const phoneNumberId = metadata.phone_number_id || ''
        const displayPhoneNumber = metadata.display_phone_number || ''

        // 1. Localizar o tenant_id pelo phone_number_id ou pelo primeiro tenant ativo com WhatsApp
        let tenantId = ''
        let matchedConfig = null

        if (phoneNumberId) {
          try {
            const allConfigs = $app.findRecordsByFilter(
              'integration_configs',
              'provider = "whatsapp"',
              '-created',
              50,
              0,
            )
            for (let k = 0; k < allConfigs.length; k++) {
              const rec = allConfigs[k]
              const cJson = rec.get('config_json') || rec.get('config') || {}
              const pId = (
                cJson.phone_number_id ||
                cJson.phoneNumberId ||
                rec.getString('phone_number_id') ||
                ''
              ).trim()
              if (pId === phoneNumberId) {
                tenantId = rec.getString('tenant_id')
                matchedConfig = rec
                break
              }
            }
          } catch (cfgFindErr) {
            console.log(
              '[WhatsApp Webhook POST] Erro ao buscar config por phone_number_id:',
              cfgFindErr,
            )
          }
        }

        // Se não achou tenant_id pelo phone_number_id, busca o primeiro tenant disponível
        if (!tenantId) {
          try {
            const firstConfig = $app.findRecordsByFilter(
              'integration_configs',
              'provider = "whatsapp" && is_active = true',
              '-created',
              1,
              0,
            )
            if (firstConfig && firstConfig.length > 0) {
              tenantId = firstConfig[0].getString('tenant_id')
            }
          } catch (_) {}
        }

        // Fallback para o primeiro tenant da base se ainda não achou
        if (!tenantId) {
          try {
            const tenants = $app.findRecordsByFilter('tenants', '', 'created', 1, 0)
            if (tenants && tenants.length > 0) {
              tenantId = tenants[0].id
            }
          } catch (_) {}
        }

        if (!tenantId) {
          console.warn('[WhatsApp Webhook POST] Nenhum tenant encontrado para processar mensagem')
          continue
        }

        // 2. Processar mensagens recebidas
        const messages = val.messages || []
        const contacts = val.contacts || []

        for (let mIdx = 0; mIdx < messages.length; mIdx++) {
          const msg = messages[mIdx]
          const fromPhone = (msg.from || '').trim()
          const msgId = msg.id || ''
          const timestamp = msg.timestamp || ''
          const msgType = msg.type || 'text'

          if (!fromPhone) continue

          // Extrair texto / conteúdo da mensagem
          let messageContent = ''
          let mediaType = 'text'
          let mediaUrl = ''
          let mediaCaption = ''

          if (msgType === 'text' && msg.text) {
            messageContent = msg.text.body || ''
            mediaType = 'text'
          } else if (msgType === 'image' && msg.image) {
            mediaType = 'image'
            mediaCaption = msg.image.caption || ''
            messageContent = mediaCaption || '[Imagem recebida via WhatsApp]'
            mediaUrl = msg.image.id || ''
          } else if (msgType === 'audio' && msg.audio) {
            mediaType = 'audio'
            messageContent = '[Áudio recebido via WhatsApp]'
            mediaUrl = msg.audio.id || ''
          } else if (msgType === 'document' && msg.document) {
            mediaType = 'document'
            mediaCaption = msg.document.filename || msg.document.caption || ''
            messageContent = mediaCaption || '[Documento recebido via WhatsApp]'
            mediaUrl = msg.document.id || ''
          } else if (msgType === 'video' && msg.video) {
            mediaType = 'video'
            mediaCaption = msg.video.caption || ''
            messageContent = mediaCaption || '[Vídeo recebido via WhatsApp]'
            mediaUrl = msg.video.id || ''
          } else if (msgType === 'sticker' && msg.sticker) {
            mediaType = 'sticker'
            messageContent = '[Sticker recebido via WhatsApp]'
          } else if (msgType === 'location' && msg.location) {
            mediaType = 'location'
            messageContent =
              'Localização: ' +
              (msg.location.name || '') +
              ' (' +
              msg.location.latitude +
              ', ' +
              msg.location.longitude +
              ')'
          } else if (msgType === 'button' && msg.button) {
            messageContent = msg.button.text || '[Botão clicado]'
          } else if (msgType === 'interactive') {
            const interactive = msg.interactive || {}
            if (interactive.button_reply) {
              messageContent = interactive.button_reply.title || interactive.button_reply.id || ''
            } else if (interactive.list_reply) {
              messageContent = interactive.list_reply.title || interactive.list_reply.id || ''
            } else {
              messageContent = '[Resposta Interativa]'
            }
          } else {
            messageContent = '[Mensagem recebida: ' + msgType + ']'
          }

          // Nome do remetente a partir de contacts
          let contactName = ''
          for (let cntIdx = 0; cntIdx < contacts.length; cntIdx++) {
            const cnt = contacts[cntIdx]
            if (cnt.wa_id === fromPhone && cnt.profile && cnt.profile.name) {
              contactName = cnt.profile.name
              break
            }
          }
          if (!contactName) {
            contactName = fromPhone
          }

          // Formata telefone (garante digitos)
          let cleanDigits = fromPhone.replace(/\D/g, '')
          let formattedPhone = fromPhone
          if (
            cleanDigits.length >= 10 &&
            cleanDigits.length <= 11 &&
            !cleanDigits.startsWith('55')
          ) {
            formattedPhone = '+55 ' + cleanDigits
          } else if (cleanDigits.startsWith('55') && cleanDigits.length >= 12) {
            formattedPhone = '+' + cleanDigits
          }

          // 3. Buscar lead existente pelo telefone / whatsapp no tenant
          let leadRecord = null
          let isNewLead = false

          try {
            // Busca por whatsapp ou phone
            const existingLeads = $app.findRecordsByFilter(
              'leads',
              'tenant_id = {:tid} && (whatsapp ~ {:phone} || phone ~ {:phone} || whatsapp ~ {:digits} || phone ~ {:digits})',
              '-created',
              1,
              0,
              { tid: tenantId, phone: fromPhone, digits: cleanDigits },
            )
            if (existingLeads && existingLeads.length > 0) {
              leadRecord = existingLeads[0]
            }
          } catch (findLeadErr) {
            console.log('[WhatsApp Webhook POST] Erro na busca do lead:', findLeadErr)
          }

          const nowIso = new Date().toISOString()
          const nowDbDate = nowIso.replace('T', ' ').substring(0, 19)

          // 4. Se o lead não existir, cria lead novo
          if (!leadRecord) {
            try {
              const leadsCol = $app.findCollectionByNameOrId('leads')
              leadRecord = new Record(leadsCol)
              leadRecord.set('tenant_id', tenantId)
              leadRecord.set('name', contactName)
              leadRecord.set('phone', formattedPhone)
              leadRecord.set('whatsapp', formattedPhone)
              leadRecord.set('channel', 'whatsapp')
              leadRecord.set('source', 'WhatsApp Inbound')
              leadRecord.set('origem', 'WhatsApp Inbound')
              leadRecord.set('status', 'novo')
              leadRecord.set('temperature', 'hot')
              leadRecord.set('team_owner', 'comercial')
              leadRecord.set('entry_date', nowDbDate)
              leadRecord.set('last_contact', nowDbDate)
              leadRecord.set('last_inbound_message_at', nowDbDate)
              leadRecord.set('whatsapp_conversation_id', fromPhone)
              leadRecord.set('observacoes', 'Lead criado automaticamente via mensagem no WhatsApp.')

              $app.save(leadRecord)
              isNewLead = true
              console.log(
                '[WhatsApp Webhook POST] Novo lead criado com sucesso:',
                leadRecord.id,
                contactName,
              )
            } catch (createLeadErr) {
              console.error('[WhatsApp Webhook POST] Falha ao criar novo lead:', createLeadErr)
            }
          } else {
            // Atualizar lead existente com timestamp do inbound
            try {
              leadRecord.set('last_contact', nowDbDate)
              leadRecord.set('last_inbound_message_at', nowDbDate)
              if (!leadRecord.getString('whatsapp')) {
                leadRecord.set('whatsapp', formattedPhone)
              }
              if (!leadRecord.getString('whatsapp_conversation_id')) {
                leadRecord.set('whatsapp_conversation_id', fromPhone)
              }
              $app.save(leadRecord)
            } catch (updLeadErr) {
              console.log('[WhatsApp Webhook POST] Erro ao atualizar lead existente:', updLeadErr)
            }
          }

          const leadId = leadRecord ? leadRecord.id : ''

          // 5. Gravar a mensagem na coleção lead_messages
          try {
            // Verificar se a mensagem com este external_id já foi registrada (evitar duplicatas)
            let alreadyExists = false
            if (msgId) {
              try {
                const existingMsgs = $app.findRecordsByFilter(
                  'lead_messages',
                  'external_id = {:extId}',
                  '-created',
                  1,
                  0,
                  { extId: msgId },
                )
                if (existingMsgs && existingMsgs.length > 0) {
                  alreadyExists = true
                }
              } catch (_) {}
            }

            if (!alreadyExists) {
              const leadMsgCol = $app.findCollectionByNameOrId('lead_messages')
              const leadMsgRec = new Record(leadMsgCol)
              leadMsgRec.set('tenant_id', tenantId)
              if (leadId) {
                leadMsgRec.set('lead_id', leadId)
              }
              leadMsgRec.set('channel', 'whatsapp')
              leadMsgRec.set('direction', 'inbound')
              leadMsgRec.set('type', 'whatsapp')
              leadMsgRec.set('content', messageContent)
              leadMsgRec.set('status_delivery', 'delivered')
              leadMsgRec.set('external_id', msgId)
              leadMsgRec.set('media_type', mediaType)
              if (mediaUrl) leadMsgRec.set('media_url', mediaUrl)
              if (mediaCaption) leadMsgRec.set('media_caption', mediaCaption)
              leadMsgRec.set(
                'metadata',
                Object.assign({}, msg, {
                  from_phone: fromPhone,
                  contact_name: contactName,
                  phone_number_id: phoneNumberId,
                  display_phone_number: displayPhoneNumber,
                  received_at: nowIso,
                  timestamp: timestamp,
                }),
              )

              $app.save(leadMsgRec)
              console.log(
                '[WhatsApp Webhook POST] Mensagem inbound gravada em lead_messages:',
                leadMsgRec.id,
              )
            }
          } catch (msgSaveErr) {
            console.error('[WhatsApp Webhook POST] Erro ao salvar lead_messages:', msgSaveErr)
          }

          // 6. Se foi criado um lead novo, garantir que a distribuição de lead ocorra caso não tenha sido atribuído
          // (Note que o hook onRecordCreate em leads já roda na criação síncrona, mas garantimos aqui)
          if (isNewLead && leadRecord) {
            try {
              const assigned =
                leadRecord.getString('assigned_to') || leadRecord.getString('responsavel_id')
              if (!assigned) {
                // Tenta buscar vendedores elegíveis para round-robin se ainda não tiver sido distribuído
                const allUsers = $app.findRecordsByFilter(
                  'users',
                  'tenant_id = {:tenantId}',
                  'created',
                  50,
                  0,
                  { tenantId: tenantId },
                )
                const activeUsers = []
                for (let uIdx = 0; uIdx < allUsers.length; uIdx++) {
                  const u = allUsers[uIdx]
                  const isActive =
                    u.getBool('active') !== false && u.getString('status') !== 'inactive'
                  if (isActive) {
                    activeUsers.push(u)
                  }
                }
                if (activeUsers.length > 0) {
                  const chosenUser = activeUsers[0]
                  leadRecord.set('assigned_to', chosenUser.id)
                  leadRecord.set('responsavel_id', chosenUser.id)
                  $app.save(leadRecord)
                }
              }
            } catch (distErr) {
              console.log('[WhatsApp Webhook POST] Erro na pós-distribuição de lead:', distErr)
            }
          }
        }

        // 7. Processar statuses (recibos de entrega e leitura: sent, delivered, read, failed)
        const statuses = val.statuses || []
        for (let sIdx = 0; sIdx < statuses.length; sIdx++) {
          const st = statuses[sIdx]
          const statusMsgId = st.id || ''
          const statusStr = st.status || '' // 'sent' | 'delivered' | 'read' | 'failed'
          if (statusMsgId && statusStr) {
            try {
              const msgsToUpdate = $app.findRecordsByFilter(
                'lead_messages',
                'external_id = {:extId}',
                '-created',
                1,
                0,
                { extId: statusMsgId },
              )
              if (msgsToUpdate && msgsToUpdate.length > 0) {
                const targetMsg = msgsToUpdate[0]
                if (statusStr === 'sent') targetMsg.set('status_delivery', 'sent')
                else if (statusStr === 'delivered') targetMsg.set('status_delivery', 'delivered')
                else if (statusStr === 'read') targetMsg.set('status_delivery', 'read')
                else if (statusStr === 'failed') targetMsg.set('status_delivery', 'failed')
                $app.save(targetMsg)
              }
            } catch (stErr) {
              console.log('[WhatsApp Webhook POST] Erro ao atualizar status da mensagem:', stErr)
            }
          }
        }
      }
    }

    // A Meta exige resposta HTTP 200 rápida
    return c.json(200, { success: true, status: 'processed' })
  } catch (err) {
    console.error('[WhatsApp Webhook POST] Erro geral:', err)
    // Retorna 200 para a Meta não ficar reenviando indefinidamente em caso de erro interno
    return c.json(200, { success: false, error: err && err.message ? err.message : String(err) })
  }
})

// Lifecycle hook: Validação e Operações do WhatsApp ao criar configuração
onRecordCreate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'whatsapp') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.access_token) token = cfg.access_token
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.token) token = cfg.token

    const phoneNumberId = (
      cfg.phone_number_id ||
      cfg.phoneNumberId ||
      cfg.phone_id ||
      record.getString('phone_number_id') ||
      ''
    ).trim()

    if (!token || !phoneNumberId) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    try {
      const testRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneNumberId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        const verifiedName = (testRes.json && testRes.json.verified_name) || ''
        const displayPhone = (testRes.json && testRes.json.display_phone_number) || ''
        const qualityRating = (testRes.json && testRes.json.quality_rating) || ''
        const nowIso = new Date().toISOString()

        record.set('status', 'active')
        record.set('is_active', true)
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'whatsapp',
          phone_number_id: phoneNumberId,
          verified_name: verifiedName || cfg.verified_name || '',
          display_phone_number: displayPhone || cfg.display_phone_number || '',
          quality_rating: qualityRating || cfg.quality_rating || 'UNKNOWN',
          last_validated: nowIso,
          error_message: '',
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        const errDetail =
          (testRes.json && testRes.json.error && testRes.json.error.message) ||
          (testRes.json && JSON.stringify(testRes.json)) ||
          'Credenciais inválidas na Meta Graph API (HTTP ' + testRes.statusCode + ')'
        record.set('status', 'error')
        record.set('is_active', false)
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'whatsapp',
          phone_number_id: phoneNumberId,
          error_message: String(errDetail),
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      record.set('status', 'error')
      record.set('is_active', false)
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'whatsapp',
        phone_number_id: phoneNumberId,
        error_message:
          'Falha de conexão com a API da Meta: ' + (httpErr.message || String(httpErr)),
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[WhatsApp onRecordCreate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

// Lifecycle hook: Validação, Re-teste e Envio de Mensagem ao atualizar configuração
onRecordUpdate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'whatsapp') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.access_token) token = cfg.access_token
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.token) token = cfg.token

    const phoneNumberId = (cfg.phone_number_id || cfg.phoneNumberId || cfg.phone_id || '').trim()

    // Envio de mensagem se cfg.send_message estiver configurado
    if (cfg.send_message && token && phoneNumberId) {
      const sendInfo = cfg.send_message
      let toPhone = (sendInfo.to || sendInfo.phone || '').replace(/\D/g, '')
      if (toPhone.length >= 10 && !toPhone.startsWith('55')) {
        toPhone = '55' + toPhone
      }

      let metaPayload = null
      if (sendInfo.template_name) {
        metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'template',
          template: {
            name: sendInfo.template_name,
            language: { code: sendInfo.template_language || 'pt_BR' },
            components: sendInfo.template_components || [],
          },
        }
      } else if (sendInfo.text || sendInfo.message) {
        metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: sendInfo.text || sendInfo.message || '',
          },
        }
      }

      if (metaPayload && toPhone) {
        try {
          const sendRes = $http.send({
            url: 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token.trim(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaPayload),
            timeout: 20,
          })

          const sendJson = sendRes.json || {}
          const wamid = (sendJson.messages && sendJson.messages[0] && sendJson.messages[0].id) || ''
          const nowIso = new Date().toISOString()

          const updatedCfg = Object.assign({}, cfg, {
            send_message: null,
            last_send_result: {
              success: sendRes.statusCode >= 200 && sendRes.statusCode < 300,
              status_code: sendRes.statusCode,
              wamid: wamid,
              sent_at: nowIso,
              error:
                sendRes.statusCode >= 300
                  ? sendJson.error?.message || JSON.stringify(sendJson)
                  : null,
            },
          })
          record.set('config_json', updatedCfg)
          record.set('config', updatedCfg)
          return e.next()
        } catch (sendErr) {
          console.error('[WhatsApp Send Message via Hook] Erro:', sendErr)
        }
      }
    }

    if (!token || !phoneNumberId) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    // Validação padrão da conexão com Meta API
    try {
      const testRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneNumberId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        const verifiedName = (testRes.json && testRes.json.verified_name) || ''
        const displayPhone = (testRes.json && testRes.json.display_phone_number) || ''
        const qualityRating = (testRes.json && testRes.json.quality_rating) || ''
        const nowIso = new Date().toISOString()

        record.set('status', 'active')
        record.set('is_active', true)
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'whatsapp',
          phone_number_id: phoneNumberId,
          verified_name: verifiedName || cfg.verified_name || '',
          display_phone_number: displayPhone || cfg.display_phone_number || '',
          quality_rating: qualityRating || cfg.quality_rating || 'UNKNOWN',
          last_validated: nowIso,
          error_message: '',
          test_requested: false,
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        const errDetail =
          (testRes.json && testRes.json.error && testRes.json.error.message) ||
          (testRes.json && JSON.stringify(testRes.json)) ||
          'Credenciais inválidas na Meta Graph API (HTTP ' + testRes.statusCode + ')'
        record.set('status', 'error')
        record.set('is_active', false)
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'whatsapp',
          phone_number_id: phoneNumberId,
          error_message: String(errDetail),
          test_requested: false,
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      record.set('status', 'error')
      record.set('is_active', false)
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'whatsapp',
        phone_number_id: phoneNumberId,
        error_message:
          'Falha de conexão com a API da Meta: ' + (httpErr.message || String(httpErr)),
        test_requested: false,
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[WhatsApp onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

// Hook para processamento automático de outbound messages criadas diretamente em lead_messages
onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    if (!record) return

    const channel = record.getString('channel')
    const direction = record.getString('direction')
    if (channel !== 'whatsapp' || direction !== 'outbound') return

    const tenantId = record.getString('tenant_id')
    if (!tenantId) return

    let token = ''
    let phoneId = ''

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
        token = cfgRec.getString('api_token') || cfgRec.getString('api_key')
        const cfg = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if (!token && cfg.access_token) token = cfg.access_token
        if (!token && cfg.api_token) token = cfg.api_token
        if (!phoneId) phoneId = cfg.phone_number_id || cfg.phone_id || ''
      }
    } catch (_) {}

    if (!token)
      token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('META_PHONE_NUMBER_ID') || ''

    if (!token || !phoneId) return

    const content = record.getString('content')
    const leadId = record.getString('lead_id')
    let toPhone = ''

    if (leadId) {
      try {
        const lead = $app.findRecordById('leads', leadId)
        if (lead) {
          toPhone = (lead.getString('whatsapp') || lead.getString('phone') || '').replace(/\D/g, '')
        }
      } catch (_) {}
    }

    if (!toPhone) return
    if (toPhone.length >= 10 && !toPhone.startsWith('55')) {
      toPhone = '55' + toPhone
    }

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: content,
      },
    }

    const apiRes = $http.send({
      url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
      timeout: 20,
    })

    if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
      const resJson = apiRes.json || {}
      const msgId = (resJson.messages && resJson.messages[0] && resJson.messages[0].id) || ''
      record.set('status_delivery', 'sent')
      record.set('external_id', msgId)
      $app.save(record)
    } else {
      record.set('status_delivery', 'failed')
      $app.save(record)
    }
  } catch (err) {
    console.error('[WhatsApp Outbound onRecordAfterCreateSuccess] Erro:', err)
  }
}, 'lead_messages')
