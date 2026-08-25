/**
 * Cloudflare Worker: WhatsApp Webhook Proxy para PocketBase / Teixeira'sHub
 *
 * Funcionalidades:
 * 1. GET: Responde a Meta com hub.challenge na verificação do webhook.
 *    - Valida hub.verify_token contra o secret configurado (WHATSAPP_VERIFY_TOKEN ou default).
 * 2. POST: Recebe notificações da Meta WhatsApp Cloud API e encaminha para a API
 *    de registros do PocketBase (cria lead_messages e leads).
 *
 * Variáveis de Ambiente no Cloudflare Worker (wrangler.toml ou Cloudflare Dashboard):
 * - POCKETBASE_URL: Ex: "https://teixeiranascimento.goskip.app" (padrão se não informado)
 * - POCKETBASE_API_TOKEN: Token de autenticação de Superusuário ou API do PocketBase
 * - WHATSAPP_VERIFY_TOKEN: Token de verificação (padrão: "skip_hub_crm_whatsapp_verify_token")
 * - DEFAULT_TENANT_ID: ID padrão de tenant caso não consiga localizar dinamicamente
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()

    // Configurações
    const pbBaseUrl = (env.POCKETBASE_URL || 'https://teixeiranascimento.goskip.app').replace(
      /\/$/,
      '',
    )
    const verifySecret = env.WHATSAPP_VERIFY_TOKEN || 'skip_hub_crm_whatsapp_verify_token'
    const pbAuthToken = env.POCKETBASE_API_TOKEN || env.POCKETBASE_TOKEN || ''
    const defaultTenantId = env.DEFAULT_TENANT_ID || ''

    // Headers CORS padrão
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 })
    }

    // ==========================================
    // 1. GET: Meta Webhook Challenge Handshake
    // ==========================================
    if (method === 'GET') {
      const mode = url.searchParams.get('hub.mode') || url.searchParams.get('hub_mode')
      const challenge =
        url.searchParams.get('hub.challenge') || url.searchParams.get('hub_challenge')
      const token =
        url.searchParams.get('hub.verify_token') || url.searchParams.get('hub_verify_token')

      if (mode === 'subscribe' && challenge) {
        if (token === verifySecret) {
          console.log('[WhatsApp Worker GET] Verificação bem-sucedida. Challenge:', challenge)
          return new Response(challenge, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
              ...corsHeaders,
            },
          })
        }

        console.warn('[WhatsApp Worker GET] Token inválido:', token)
        return new Response('Forbidden: Invalid verify_token', {
          status: 403,
          headers: corsHeaders,
        })
      }

      return new Response('Bad Request: Missing mode or challenge', {
        status: 400,
        headers: corsHeaders,
      })
    }

    // ==========================================
    // 2. POST: Inbound Messages from Meta Cloud API
    // ==========================================
    if (method === 'POST') {
      try {
        let body
        try {
          body = await request.json()
        } catch (err) {
          return new Response(JSON.stringify({ status: 'ignored', reason: 'invalid_json' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        if (!body || typeof body !== 'object') {
          return new Response(JSON.stringify({ status: 'ignored', reason: 'empty_body' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        // Validação básica do payload da Meta
        if (body.object && body.object !== 'whatsapp_business_account') {
          return new Response(JSON.stringify({ status: 'ignored', reason: 'not_whatsapp' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        const entries = body.entry || []
        if (!Array.isArray(entries) || entries.length === 0) {
          return new Response(JSON.stringify({ status: 'ok', received: 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

        // Helper para headers PocketBase
        const pbHeaders = {
          'Content-Type': 'application/json',
        }
        if (pbAuthToken) {
          pbHeaders['Authorization'] = pbAuthToken.startsWith('Bearer ')
            ? pbAuthToken
            : `Bearer ${pbAuthToken}`
        }

        // Processar entradas e mudanças de forma assíncrona
        for (const entry of entries) {
          const changes = entry.changes || []

          for (const change of changes) {
            const val = change.value || {}
            const metadata = val.metadata || {}
            const phoneNumberId = metadata.phone_number_id || ''
            const displayPhoneNumber = metadata.display_phone_number || ''

            // 2.1 Identificar tenantId consultando integration_configs no PocketBase
            let tenantId = defaultTenantId

            try {
              if (phoneNumberId) {
                const configRes = await fetch(
                  `${pbBaseUrl}/api/collections/integration_configs/records?filter=(provider='whatsapp')&perPage=50`,
                  { headers: pbHeaders },
                )
                if (configRes.ok) {
                  const configData = await configRes.json()
                  const items = configData.items || []
                  for (const item of items) {
                    const cfgJson = item.config_json || item.config || {}
                    const itemPhoneId = (
                      cfgJson.phone_number_id ||
                      cfgJson.phoneNumberId ||
                      item.phone_number_id ||
                      ''
                    ).trim()
                    if (itemPhoneId === phoneNumberId) {
                      tenantId = item.tenant_id
                      break
                    }
                  }
                  if (!tenantId && items.length > 0) {
                    tenantId = items[0].tenant_id
                  }
                }
              }
            } catch (errFindTenant) {
              console.warn(
                '[WhatsApp Worker] Falha ao consultar tenant por integration_configs:',
                errFindTenant,
              )
            }

            // Fallback: se ainda não achou tenant, busca primeiro tenant
            if (!tenantId) {
              try {
                const tRes = await fetch(
                  `${pbBaseUrl}/api/collections/tenants/records?perPage=1&sort=created`,
                  { headers: pbHeaders },
                )
                if (tRes.ok) {
                  const tData = await tRes.json()
                  if (tData.items && tData.items.length > 0) {
                    tenantId = tData.items[0].id
                  }
                }
              } catch (_) {}
            }

            if (!tenantId) {
              console.warn('[WhatsApp Worker] Nenhum tenant encontrado para processar mensagem')
              continue
            }

            // 2.2 Processar mensagens recebidas
            const messages = val.messages || []
            const contacts = val.contacts || []

            for (const msg of messages) {
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
                messageContent = `Localização: ${msg.location.name || ''} (${msg.location.latitude}, ${msg.location.longitude})`
              } else if (msgType === 'button' && msg.button) {
                messageContent = msg.button.text || '[Botão clicado]'
              } else if (msgType === 'interactive') {
                const interactive = msg.interactive || {}
                if (interactive.button_reply) {
                  messageContent =
                    interactive.button_reply.title || interactive.button_reply.id || ''
                } else if (interactive.list_reply) {
                  messageContent = interactive.list_reply.title || interactive.list_reply.id || ''
                } else {
                  messageContent = '[Resposta Interativa]'
                }
              } else {
                messageContent = `[Mensagem recebida: ${msgType}]`
              }

              // Nome do contato a partir do array contacts
              let contactName = ''
              for (const cnt of contacts) {
                if (cnt.wa_id === fromPhone && cnt.profile?.name) {
                  contactName = cnt.profile.name
                  break
                }
              }
              if (!contactName) {
                contactName = fromPhone
              }

              // Formatar telefone
              const cleanDigits = fromPhone.replace(/\D/g, '')
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

              const nowIso = new Date().toISOString()
              const nowDbDate = nowIso.replace('T', ' ').substring(0, 19)

              // 2.3 Buscar lead existente pelo telefone / whatsapp
              let leadId = ''
              try {
                const filterQuery = encodeURIComponent(
                  `tenant_id = "${tenantId}" && (whatsapp ~ "${fromPhone}" || phone ~ "${fromPhone}" || whatsapp ~ "${cleanDigits}" || phone ~ "${cleanDigits}")`,
                )
                const searchRes = await fetch(
                  `${pbBaseUrl}/api/collections/leads/records?filter=${filterQuery}&perPage=1&sort=-created`,
                  { headers: pbHeaders },
                )
                if (searchRes.ok) {
                  const searchData = await searchRes.json()
                  if (searchData.items && searchData.items.length > 0) {
                    const existingLead = searchData.items[0]
                    leadId = existingLead.id

                    // Atualizar último contato no lead existente
                    await fetch(`${pbBaseUrl}/api/collections/leads/records/${leadId}`, {
                      method: 'PATCH',
                      headers: pbHeaders,
                      body: JSON.stringify({
                        last_contact: nowDbDate,
                        last_inbound_message_at: nowDbDate,
                        whatsapp: existingLead.whatsapp || formattedPhone,
                        whatsapp_conversation_id:
                          existingLead.whatsapp_conversation_id || fromPhone,
                      }),
                    }).catch(() => {})
                  }
                }
              } catch (leadFindErr) {
                console.warn('[WhatsApp Worker] Erro ao buscar lead existente:', leadFindErr)
              }

              // 2.4 Se não encontrou lead, cria novo lead
              if (!leadId) {
                try {
                  const createLeadRes = await fetch(`${pbBaseUrl}/api/collections/leads/records`, {
                    method: 'POST',
                    headers: pbHeaders,
                    body: JSON.stringify({
                      tenant_id: tenantId,
                      name: contactName,
                      phone: formattedPhone,
                      whatsapp: formattedPhone,
                      channel: 'whatsapp',
                      source: 'WhatsApp Inbound',
                      origem: 'WhatsApp Inbound',
                      status: 'novo',
                      temperature: 'hot',
                      team_owner: 'comercial',
                      entry_date: nowDbDate,
                      last_contact: nowDbDate,
                      last_inbound_message_at: nowDbDate,
                      whatsapp_conversation_id: fromPhone,
                      observacoes: 'Lead criado automaticamente via mensagem no WhatsApp.',
                    }),
                  })
                  if (createLeadRes.ok) {
                    const newLead = await createLeadRes.json()
                    leadId = newLead.id
                    console.log('[WhatsApp Worker] Novo lead criado:', leadId, contactName)
                  } else {
                    const errText = await createLeadRes.text()
                    console.error(
                      '[WhatsApp Worker] Falha ao criar lead:',
                      createLeadRes.status,
                      errText,
                    )
                  }
                } catch (leadCreateErr) {
                  console.error('[WhatsApp Worker] Erro ao criar lead:', leadCreateErr)
                }
              }

              // 2.5 Gravar em lead_messages
              try {
                // Verificar duplicatas por external_id se msgId estiver preenchido
                let isDuplicate = false
                if (msgId) {
                  const checkMsg = await fetch(
                    `${pbBaseUrl}/api/collections/lead_messages/records?filter=(external_id='${encodeURIComponent(msgId)}')&perPage=1`,
                    { headers: pbHeaders },
                  )
                  if (checkMsg.ok) {
                    const checkData = await checkMsg.json()
                    if (checkData.items && checkData.items.length > 0) {
                      isDuplicate = true
                    }
                  }
                }

                if (!isDuplicate) {
                  const msgPayload = {
                    tenant_id: tenantId,
                    lead_id: leadId || '',
                    channel: 'whatsapp',
                    direction: 'inbound',
                    type: 'whatsapp',
                    content: messageContent,
                    status_delivery: 'delivered',
                    external_id: msgId,
                    media_type: mediaType,
                    media_url: mediaUrl,
                    media_caption: mediaCaption,
                    metadata: {
                      from_phone: fromPhone,
                      contact_name: contactName,
                      phone_number_id: phoneNumberId,
                      display_phone_number: displayPhoneNumber,
                      received_at: nowIso,
                      timestamp: timestamp,
                      raw_message: msg,
                    },
                  }

                  const createMsgRes = await fetch(
                    `${pbBaseUrl}/api/collections/lead_messages/records`,
                    {
                      method: 'POST',
                      headers: pbHeaders,
                      body: JSON.stringify(msgPayload),
                    },
                  )

                  if (createMsgRes.ok) {
                    const savedMsg = await createMsgRes.json()
                    console.log('[WhatsApp Worker] lead_messages registrado:', savedMsg.id)
                  } else {
                    const errTxt = await createMsgRes.text()
                    console.error(
                      '[WhatsApp Worker] Erro ao gravar lead_messages:',
                      createMsgRes.status,
                      errTxt,
                    )
                  }
                }
              } catch (msgErr) {
                console.error('[WhatsApp Worker] Erro ao salvar mensagem:', msgErr)
              }
            }

            // 2.6 Atualizar statuses de entrega / leitura
            const statuses = val.statuses || []
            for (const st of statuses) {
              const statusMsgId = st.id || ''
              const statusStr = st.status || '' // 'sent' | 'delivered' | 'read' | 'failed'
              if (statusMsgId && statusStr) {
                try {
                  const filterSt = encodeURIComponent(`external_id = "${statusMsgId}"`)
                  const findSt = await fetch(
                    `${pbBaseUrl}/api/collections/lead_messages/records?filter=${filterSt}&perPage=1`,
                    { headers: pbHeaders },
                  )
                  if (findSt.ok) {
                    const stData = await findSt.json()
                    if (stData.items && stData.items.length > 0) {
                      const msgToUpdate = stData.items[0]
                      await fetch(
                        `${pbBaseUrl}/api/collections/lead_messages/records/${msgToUpdate.id}`,
                        {
                          method: 'PATCH',
                          headers: pbHeaders,
                          body: JSON.stringify({
                            status_delivery: statusStr,
                          }),
                        },
                      )
                    }
                  }
                } catch (stErr) {
                  console.warn('[WhatsApp Worker] Erro ao atualizar status de entrega:', stErr)
                }
              }
            }
          }
        }

        // Resposta HTTP 200 obrigatória para Meta
        return new Response(JSON.stringify({ success: true, status: 'processed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      } catch (err) {
        console.error('[WhatsApp Worker] Erro global no POST:', err)
        return new Response(
          JSON.stringify({
            success: false,
            error: err && err.message ? err.message : String(err),
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      }
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  },
}
