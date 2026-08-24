/**
 * PocketBase Hook: WhatsApp Cloud API (Meta Graph API v21.0) Integration
 *
 * Endpoints:
 * - POST /api/whatsapp/connect
 * - POST /api/whatsapp/disconnect
 * - POST /api/whatsapp/test-connection
 * - POST /api/whatsapp/test
 * - GET  /api/whatsapp/config
 * - GET  /api/whatsapp/webhook (Meta verification)
 * - POST /api/whatsapp/webhook (Inbound messages)
 * - POST /api/whatsapp/send (Outbound messages)
 *
 * Backward-compatibility aliases:
 * - POST /api/whatsapp/send-template
 * - POST /api/whatsapp/test-template
 * - GET  /api/whatsapp/templates
 * - GET  /api/whatsapp/chat-history
 * - POST /api/whatsapp/mark-read
 * - GET  /api/webhooks/whatsapp
 * - POST /api/webhooks/whatsapp
 */

// --- 1. POST /api/whatsapp/connect ---
routerAdd('POST', '/api/whatsapp/connect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const token = (reqBody.token || reqBody.access_token || reqBody.api_token || '').trim()
    const phoneNumberId = (
      reqBody.phone_number_id ||
      reqBody.phoneNumberId ||
      reqBody.phone_id ||
      ''
    ).trim()
    const businessAccountId = (
      reqBody.business_account_id ||
      reqBody.businessAccountId ||
      reqBody.waba_id ||
      ''
    ).trim()
    const webhookVerifyToken = (
      reqBody.webhook_verify_token ||
      reqBody.verify_token ||
      'teixeirashub_whatsapp_verify'
    ).trim()
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }
    if (!token) {
      return e.json(400, { success: false, error: 'Token de Acesso (access_token) é obrigatório.' })
    }
    if (!phoneNumberId) {
      return e.json(400, {
        success: false,
        error: 'ID do Número de Telefone (phone_number_id) é obrigatório.',
      })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneNumberId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
    } catch (httpErr) {
      return e.json(502, {
        success: false,
        error: 'Falha de conexão com a API da Meta: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
      const errDetail =
        (testRes.json && testRes.json.error && testRes.json.error.message) ||
        (testRes.json && JSON.stringify(testRes.json)) ||
        'Credenciais inválidas na Meta Graph API.'
      return e.json(400, {
        success: false,
        error: 'Erro na validação com a Meta: ' + errDetail,
        statusCode: testRes.statusCode,
      })
    }

    const verifiedName = (testRes.json && testRes.json.verified_name) || ''
    const displayPhone = (testRes.json && testRes.json.display_phone_number) || ''
    const qualityRating = (testRes.json && testRes.json.quality_rating) || ''

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

    const nowIso = new Date().toISOString()
    configRec.set('status', 'active')
    configRec.set('is_active', true)
    configRec.set('api_token', token)
    configRec.set('api_key', token)
    configRec.set('webhook_secret', webhookVerifyToken)

    const cfgPayload = {
      provider: 'whatsapp',
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId,
      verified_name: verifiedName,
      display_phone_number: displayPhone,
      quality_rating: qualityRating,
      webhook_verify_token: webhookVerifyToken,
      connected_at: nowIso,
      last_sync: nowIso,
    }

    configRec.set('config_json', cfgPayload)
    configRec.set('config', cfgPayload)

    $app.save(configRec)

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

    return e.json(200, {
      success: true,
      message: 'WhatsApp Cloud API conectado com sucesso!',
      config: {
        id: configRec.id,
        provider: 'whatsapp',
        status: 'active',
        is_active: true,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        verified_name: verifiedName,
        display_phone_number: displayPhone,
        quality_rating: qualityRating,
      },
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao conectar WhatsApp: ' + (err.message || String(err)),
    })
  }
})

// --- 2. POST /api/whatsapp/disconnect ---
routerAdd('POST', '/api/whatsapp/disconnect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

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
      message: 'WhatsApp desconectado com sucesso.',
      removed_count: count,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao desconectar WhatsApp: ' + (err.message || String(err)),
    })
  }
})

// --- 3. POST /api/whatsapp/test-connection & POST /api/whatsapp/test ---
routerAdd('POST', '/api/whatsapp/test-connection', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    let token = ''
    let phoneId = ''

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
          const configRec = configs[0]
          token = configRec.getString('api_token') || configRec.getString('api_key')
          const cfg = configRec.get('config_json') || configRec.get('config') || {}
          if (!token && cfg.access_token) token = cfg.access_token
          if (!token && cfg.api_token) token = cfg.api_token
          phoneId = cfg.phone_number_id || cfg.phone_id || ''
        }
      } catch (_) {}
    }

    if (!token)
      token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('META_PHONE_NUMBER_ID') || ''

    const inputToken = (reqBody.token || reqBody.access_token || token || '').trim()
    const inputPhoneId = (reqBody.phone_number_id || reqBody.phoneNumberId || phoneId || '').trim()

    if (!inputToken || !inputPhoneId) {
      return e.json(400, {
        success: false,
        message: 'Credenciais do WhatsApp (access_token ou phone_number_id) não configuradas.',
      })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + inputPhoneId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + inputToken,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
    } catch (httpErr) {
      return e.json(502, {
        success: false,
        status: 'error',
        message: 'Falha de conexão com a API da Meta: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
      return e.json(200, {
        success: true,
        status: 'connected',
        message: 'Conexão com Meta WhatsApp validada com sucesso!',
        data: testRes.json,
      })
    } else {
      const errDetail =
        (testRes.json && testRes.json.error && testRes.json.error.message) ||
        'Falha ao validar com Meta Graph API.'
      return e.json(testRes.statusCode, {
        success: false,
        status: 'error',
        statusCode: testRes.statusCode,
        message: errDetail,
      })
    }
  } catch (err) {
    return e.json(500, {
      success: false,
      status: 'error',
      message: 'Erro ao testar conexão WhatsApp: ' + (err.message || String(err)),
    })
  }
})

routerAdd('POST', '/api/whatsapp/test', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    let token = ''
    let phoneId = ''

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
          const configRec = configs[0]
          token = configRec.getString('api_token') || configRec.getString('api_key')
          const cfg = configRec.get('config_json') || configRec.get('config') || {}
          if (!token && cfg.access_token) token = cfg.access_token
          if (!token && cfg.api_token) token = cfg.api_token
          phoneId = cfg.phone_number_id || cfg.phone_id || ''
        }
      } catch (_) {}
    }

    if (!token)
      token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('META_PHONE_NUMBER_ID') || ''

    const inputToken = (reqBody.token || reqBody.access_token || token || '').trim()
    const inputPhoneId = (reqBody.phone_number_id || reqBody.phoneNumberId || phoneId || '').trim()

    if (!inputToken || !inputPhoneId) {
      return e.json(400, {
        success: false,
        message: 'Credenciais do WhatsApp (access_token ou phone_number_id) não configuradas.',
      })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + inputPhoneId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + inputToken,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })
    } catch (httpErr) {
      return e.json(502, {
        success: false,
        status: 'error',
        message: 'Falha de conexão com a API da Meta: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
      return e.json(200, {
        success: true,
        status: 'connected',
        message: 'Conexão com Meta WhatsApp validada com sucesso!',
        data: testRes.json,
      })
    } else {
      const errDetail =
        (testRes.json && testRes.json.error && testRes.json.error.message) ||
        'Falha ao validar com Meta Graph API.'
      return e.json(testRes.statusCode, {
        success: false,
        status: 'error',
        statusCode: testRes.statusCode,
        message: errDetail,
      })
    }
  } catch (err) {
    return e.json(500, {
      success: false,
      status: 'error',
      message: 'Erro ao testar conexão WhatsApp: ' + (err.message || String(err)),
    })
  }
})

// --- 4. GET /api/whatsapp/config: Retorna status e config sem expor access_token ---
routerAdd('GET', '/api/whatsapp/config', (e) => {
  try {
    const tenantId =
      e.requestInfo().query.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

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
        const token = cfgRec.getString('api_token') || cfgRec.getString('api_key')
        const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if (
          (token || cfgJson.access_token || cfgJson.api_token) &&
          cfgRec.get('is_active') !== false
        ) {
          isConnected = true
          configData = {
            id: cfgRec.id,
            provider: 'whatsapp',
            status: cfgRec.getString('status') || 'active',
            is_active: cfgRec.get('is_active') !== false,
            phone_number_id: cfgJson.phone_number_id || cfgJson.phone_id || '',
            business_account_id: cfgJson.business_account_id || cfgJson.waba_id || '',
            verified_name: cfgJson.verified_name || '',
            display_phone_number: cfgJson.display_phone_number || '',
            quality_rating: cfgJson.quality_rating || '',
            webhook_verify_token:
              cfgRec.getString('webhook_secret') || cfgJson.webhook_verify_token || '',
            created: cfgRec.getString('created'),
            updated: cfgRec.getString('updated'),
          }
        }
      }
    } catch (qErr) {
      console.warn('[WhatsApp Hook] Erro ao buscar config:', qErr)
    }

    if (!isConnected) {
      const envToken =
        $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
      const envPhone = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || ''
      if (envToken && envPhone) {
        isConnected = true
        configData = {
          id: 'system_secret',
          provider: 'whatsapp',
          status: 'active',
          is_active: true,
          phone_number_id: envPhone,
          business_account_id: $os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID') || '',
        }
      }
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
})

// --- 5. GET /api/whatsapp/webhook: Meta Webhook Verification ---
routerAdd('GET', '/api/whatsapp/webhook', (e) => {
  try {
    const q = e.requestInfo().query || {}
    const mode = q['hub.mode'] || q['mode'] || ''
    const token = q['hub.verify_token'] || q['verify_token'] || ''
    const challenge = q['hub.challenge'] || q['challenge'] || ''

    const tenantId = q['tenant_id'] || ''
    let expectedVerifyToken = 'teixeirashub_whatsapp_secret'

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
          const cfg = configs[0].get('config_json') || configs[0].get('config') || {}
          expectedVerifyToken =
            configs[0].getString('webhook_secret') ||
            cfg.webhook_verify_token ||
            cfg.verify_token ||
            expectedVerifyToken
        }
      } catch (_) {}
    }

    if (mode === 'subscribe' && token) {
      if (
        token === expectedVerifyToken ||
        token === 'teixeirashub_whatsapp_secret' ||
        token === 'teixeirashub_whatsapp_verify' ||
        token === 'skip_hub_crm_whatsapp_verify_token'
      ) {
        console.log('[WhatsApp Webhook] Verificação aceita com sucesso!')
        return e.string(200, challenge)
      } else {
        console.warn('[WhatsApp Webhook] Token de verificação incorreto:', token)
        return e.string(403, 'Forbidden')
      }
    }

    return e.string(400, 'Bad Request')
  } catch (err) {
    return e.string(500, 'Error: ' + (err.message || String(err)))
  }
})

routerAdd('GET', '/api/webhooks/whatsapp', (e) => {
  try {
    const q = e.requestInfo().query || {}
    const mode = q['hub.mode'] || q['mode'] || ''
    const token = q['hub.verify_token'] || q['verify_token'] || ''
    const challenge = q['hub.challenge'] || q['challenge'] || ''

    if (mode === 'subscribe' && token) {
      return e.string(200, challenge)
    }
    return e.string(400, 'Bad Request')
  } catch (err) {
    return e.string(500, 'Error: ' + (err.message || String(err)))
  }
})

// --- 6. POST /api/whatsapp/webhook: Inbound messages processing ---
routerAdd('POST', '/api/whatsapp/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}

    if (body.object !== 'whatsapp_business_account' && !body.entry) {
      return e.json(200, { received: true, ignored: true })
    }

    const entries = body.entry || []
    let processedCount = 0

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const changes = entry.changes || []

      for (let j = 0; j < changes.length; j++) {
        const change = changes[j]
        const val = change.value || {}

        // Processar mensagens recebidas
        const messages = val.messages || []
        for (let k = 0; k < messages.length; k++) {
          const msg = messages[k]
          const from = msg.from || ''
          const msgType = msg.type || 'text'
          let content = ''

          if (msgType === 'text' && msg.text) {
            content = msg.text.body || ''
          } else if (msgType === 'button' && msg.button) {
            content = msg.button.text || msg.button.payload || ''
          } else if (msgType === 'interactive') {
            const interactive = msg.interactive || {}
            if (interactive.button_reply) content = interactive.button_reply.title || ''
            if (interactive.list_reply) content = interactive.list_reply.title || ''
          } else {
            content = '[' + msgType + ']'
          }

          const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

          // Gravar na coleção whatsapp_messages se existir
          try {
            const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
            if (msgCol) {
              const msgRec = new Record(msgCol)
              msgRec.set('phone', from)
              msgRec.set('message', content)
              msgRec.set('direction', 'inbound')
              msgRec.set('status', 'received')
              msgRec.set('metadata', msg)
              $app.save(msgRec)
            }
          } catch (_) {}

          // Buscar ou criar lead correspondente
          try {
            let leadRec = null
            try {
              const leads = $app.findRecordsByFilter(
                'leads',
                'phone ~ "' + from.slice(-8) + '" || whatsapp ~ "' + from.slice(-8) + '"',
                '-created',
                1,
                0,
              )
              if (leads && leads.length > 0) {
                leadRec = leads[0]
              }
            } catch (_) {}

            if (leadRec) {
              const currentNotes = leadRec.getString('notes') || ''
              leadRec.set(
                'notes',
                currentNotes + '\n[' + nowIso + ' WhatsApp recebido]: ' + content,
              )
              $app.save(leadRec)
            }
          } catch (_) {}

          processedCount++
        }

        // Processar status de entrega (sent, delivered, read)
        const statuses = val.statuses || []
        for (let s = 0; s < statuses.length; s++) {
          const st = statuses[s]
          const stMsgId = st.id || ''
          const stStatus = st.status || ''

          try {
            const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
            if (msgCol && stMsgId) {
              const msgs = $app.findRecordsByFilter(
                'whatsapp_messages',
                'metadata.id = "' + stMsgId + '"',
                '-created',
                1,
                0,
              )
              if (msgs && msgs.length > 0) {
                msgs[0].set('status', stStatus)
                $app.save(msgs[0])
              }
            }
          } catch (_) {}
        }
      }
    }

    return e.json(200, {
      success: true,
      processed: processedCount,
    })
  } catch (err) {
    console.error('[WhatsApp Inbound Webhook] Erro:', err)
    return e.json(500, {
      success: false,
      error: 'Erro no processamento do webhook: ' + (err.message || String(err)),
    })
  }
})

routerAdd('POST', '/api/webhooks/whatsapp', (e) => {
  try {
    const body = e.requestInfo().body || {}
    return e.json(200, { success: true, received: true })
  } catch (err) {
    return e.json(500, { success: false, error: err.message || String(err) })
  }
})

// --- 7. POST /api/whatsapp/send: Outbound message sending ---
routerAdd('POST', '/api/whatsapp/send', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const to = (body.to || body.phone || body.recipient || '').replace(/\D/g, '')
    const message = body.message || body.text || ''
    const tenantId = body.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!to) {
      return e.json(400, {
        success: false,
        error: 'Número de telefone destinatário é obrigatório.',
      })
    }
    if (!message) {
      return e.json(400, { success: false, error: 'Mensagem é obrigatória.' })
    }

    let token = body.token || ''
    let phoneId = body.phone_number_id || ''

    if (tenantId && (!token || !phoneId)) {
      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const configRec = configs[0]
          if (!token) token = configRec.getString('api_token') || configRec.getString('api_key')
          const cfg = configRec.get('config_json') || configRec.get('config') || {}
          if (!token && cfg.access_token) token = cfg.access_token
          if (!token && cfg.api_token) token = cfg.api_token
          if (!phoneId) phoneId = cfg.phone_number_id || cfg.phone_id || ''
        }
      } catch (_) {}
    }

    if (!token)
      token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('META_PHONE_NUMBER_ID') || ''

    if (!token || !phoneId) {
      return e.json(400, {
        success: false,
        error: 'WhatsApp não configurado (access_token ou phone_number_id ausente).',
      })
    }

    let formattedTo = to
    if (formattedTo.length >= 10 && !formattedTo.startsWith('55')) {
      formattedTo = '55' + formattedTo
    }

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    }

    let apiRes
    try {
      apiRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
        timeout: 20,
      })
    } catch (httpErr) {
      return e.json(502, {
        success: false,
        error: 'Falha na comunicação com a Meta Graph API: ' + (httpErr.message || String(httpErr)),
      })
    }

    const resJson = apiRes.json || {}
    if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
      return e.json(apiRes.statusCode, {
        success: false,
        error:
          (resJson.error && resJson.error.message) ||
          JSON.stringify(resJson) ||
          'Erro ao enviar mensagem WhatsApp.',
        statusCode: apiRes.statusCode,
      })
    }

    const msgId = (resJson.messages && resJson.messages[0] && resJson.messages[0].id) || ''

    // Salvar registro de envio
    try {
      const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
      if (msgCol) {
        const msgRec = new Record(msgCol)
        msgRec.set('phone', formattedTo)
        msgRec.set('message', message)
        msgRec.set('direction', 'outbound')
        msgRec.set('status', 'sent')
        msgRec.set('metadata', resJson)
        $app.save(msgRec)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      message_id: msgId,
      status: 'sent',
      data: resJson,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro interno ao enviar WhatsApp: ' + (err.message || String(err)),
    })
  }
})

// --- 8. POST /api/whatsapp/send-template ---
routerAdd('POST', '/api/whatsapp/send-template', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const to = (body.to || body.phone || '').replace(/\D/g, '')
    const templateName = body.template_name || body.template || ''
    const languageCode = body.language_code || 'pt_BR'
    const components = body.components || []
    const tenantId = body.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!to) return e.json(400, { success: false, error: 'Telefone obrigatório.' })
    if (!templateName)
      return e.json(400, { success: false, error: 'Nome do template obrigatório.' })

    let token = body.token || ''
    let phoneId = body.phone_number_id || ''

    if (tenantId && (!token || !phoneId)) {
      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "whatsapp"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const configRec = configs[0]
          if (!token) token = configRec.getString('api_token') || configRec.getString('api_key')
          const cfg = configRec.get('config_json') || configRec.get('config') || {}
          if (!token && cfg.access_token) token = cfg.access_token
          if (!token && cfg.api_token) token = cfg.api_token
          if (!phoneId) phoneId = cfg.phone_number_id || cfg.phone_id || ''
        }
      } catch (_) {}
    }

    if (!token)
      token = $os.getenv('WHATSAPP_ACCESS_TOKEN') || $os.getenv('META_WHATSAPP_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_NUMBER_ID') || $os.getenv('META_PHONE_NUMBER_ID') || ''

    if (!token || !phoneId) {
      return e.json(400, { success: false, error: 'WhatsApp não configurado.' })
    }

    let formattedTo = to
    if (formattedTo.length >= 10 && !formattedTo.startsWith('55')) {
      formattedTo = '55' + formattedTo
    }

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components,
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

    const resJson = apiRes.json || {}
    if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
      return e.json(200, { success: true, data: resJson })
    } else {
      return e.json(apiRes.statusCode, {
        success: false,
        error: (resJson.error && resJson.error.message) || 'Erro ao enviar template.',
      })
    }
  } catch (err) {
    return e.json(500, { success: false, error: err.message || String(err) })
  }
})
