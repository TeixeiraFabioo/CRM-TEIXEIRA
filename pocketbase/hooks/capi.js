// Meta Conversions API (CAPI) hook
// Envia eventos server-side para o Meta Pixel via Conversions API.
//
// Fluxo:
//  1. Um registro é criado na coleção `capi_events` (pelo endpoint
//     /api/capi/send, pelo gatilho de criação de lead, ou por qualquer
//     outra fonte server-side).
//  2. O hook `onRecordAfterCreateSuccess` dispara o envio para a Meta.
//  3. O status do registro é atualizado para "sent", "pending" (retry) ou
//     "failed" conforme o resultado.
//
// Funciona mesmo sem token configurado: apenas marca o evento como "failed"
// e segue, sem interromper quem criou o registro.

// Hook: ao criar (e commitar) um evento CAPI, processa o envio para a Meta.
onRecordAfterCreateSuccess((e) => {
  try {
    const event = e.record
    if (!event) return

    const tenantId = event.getString('tenant_id')
    const eventName = event.getString('event_name')
    const eventData = event.get('event_data') || {}
    const userData = event.get('user_data') || {}
    const attempts = event.getInt('attempts') || 0

    // --- Busca o token CAPI configurado para o tenant ---
    // Lê de `integration_configs` (provider='meta_ads', is_active=true).
    // O access token vive em `api_token` / `config_json.access_token`, e o
    // pixel id em `config_json.meta_pixel_id` ou em `tenants.meta_pixel_id`.
    let creds = null
    try {
      const configs = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = {:tid} && provider = "meta_ads" && is_active = true',
        '-created',
        1,
        0,
        { tid: tenantId },
      )
      if (configs && configs.length > 0) {
        const config = configs[0]
        const cfgJson = config.get('config_json') || config.get('config') || {}
        const accessToken =
          config.getString('api_token') || cfgJson.access_token || cfgJson.api_token || ''

        let pixelId = cfgJson.meta_pixel_id || cfgJson.pixel_id || ''
        if (!pixelId && tenantId) {
          try {
            const tenant = $app.findRecordById('tenants', tenantId)
            if (tenant) pixelId = tenant.getString('meta_pixel_id') || ''
          } catch (_) {}
        }
        if (!pixelId) pixelId = '1932282154107778'

        if (accessToken) {
          creds = { token: accessToken, pixelId: pixelId }
        }
      }
    } catch (err) {
      console.log('[CAPI] Erro ao buscar token:', err && err.message ? err.message : String(err))
    }

    if (!creds) {
      event.set('status', 'failed')
      event.set('error_message', 'Token CAPI não configurado para este tenant')
      $app.save(event)
      console.log('[CAPI] Token não configurado para tenant', tenantId)
      return
    }

    if (attempts >= 5) {
      event.set('status', 'failed')
      event.set('error_message', 'Máximo de tentativas excedido (5)')
      $app.save(event)
      return
    }

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: (eventData && eventData.event_source_url) || '',
          action_source: 'website',
          event_id: event.id,
          user_data: {
            em: userData.em || undefined,
            ph: userData.ph || undefined,
            fbc: userData.fbc || undefined,
            fbp: userData.fbp || undefined,
            client_ip_address: userData.client_ip_address || undefined,
            client_user_agent: userData.client_user_agent || undefined,
          },
          custom_data: (eventData && eventData.custom_data) || {},
        },
      ],
      test_event_code: 'TEST42049',
    }

    try {
      const url =
        'https://graph.facebook.com/v21.0/' + creds.pixelId + '/events?access_token=' + creds.token
      const response = $http.send({
        url: url,
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        timeout: 120,
      })

      if (response.statusCode >= 200 && response.statusCode < 300) {
        event.set('status', 'sent')
        event.set('error_message', '')
        $app.save(event)
        console.log('[CAPI] Evento enviado:', eventName, 'para tenant', tenantId)
      } else {
        let respBody = ''
        try {
          respBody = response.raw || response.body || JSON.stringify(response.json || {}) || ''
        } catch (_) {}
        const errMsg = 'Meta API retornou ' + response.statusCode + ': ' + respBody
        event.set('status', 'pending')
        event.set('attempts', attempts + 1)
        event.set('error_message', errMsg.substring(0, 500))
        $app.save(event)
        console.error('[CAPI] Falha ao enviar evento:', eventName, errMsg)
      }
    } catch (err) {
      const msg = (err && err.message ? err.message : String(err)) || 'Erro desconhecido'
      event.set('status', 'pending')
      event.set('attempts', attempts + 1)
      event.set('error_message', msg.substring(0, 500))
      $app.save(event)
      console.error('[CAPI] Falha ao enviar evento:', eventName, msg)
    }
  } catch (globalErr) {
    console.error('[CAPI] Erro no processamento do evento:', globalErr)
  }
}, 'capi_events')

// Endpoint para envio manual de evento CAPI.
// Cria o registro em `capi_events`; o hook acima processa o envio para a Meta.
routerAdd('POST', '/api/capi/send', (e) => {
  try {
    const data = e.requestInfo().body || {}
    const tenantId = data.tenant_id || ''
    const eventName = data.event_name || ''
    const eventData = data.event_data || {}
    const userData = data.user_data || {}

    if (!tenantId || !eventName) {
      return e.json(400, { error: 'tenant_id e event_name são obrigatórios' })
    }

    const collection = $app.findCollectionByNameOrId('capi_events')
    const record = new Record(collection)
    record.set('tenant_id', tenantId)
    record.set('event_name', eventName)
    record.set('event_data', eventData)
    record.set('user_data', userData)
    record.set('status', 'pending')
    record.set('attempts', 0)
    $app.save(record)
    // O hook onRecordAfterCreateSuccess já processa o envio

    return e.json(200, { id: record.id, status: 'pending' })
  } catch (err) {
    return e.json(500, {
      error: 'Erro ao criar evento CAPI: ' + (err && err.message ? err.message : String(err)),
    })
  }
})

// Endpoint para testar a conexão com a Meta CAPI (valida pixel + token).
routerAdd('POST', '/api/capi/test', (e) => {
  try {
    const data = e.requestInfo().body || {}
    const pixelId = data.pixel_id || ''
    const accessToken = data.access_token || ''

    if (!pixelId || !accessToken) {
      return e.json(400, { error: 'pixel_id e access_token são obrigatórios' })
    }

    const url =
      'https://graph.facebook.com/v21.0/' +
      pixelId +
      '?access_token=' +
      accessToken +
      '&fields=id,name'
    const response = $http.send({
      url: url,
      method: 'GET',
      timeout: 30,
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      let parsed = null
      try {
        parsed = response.json
      } catch (_) {}
      return e.json(200, { connected: true, data: parsed })
    } else {
      return e.json(400, { connected: false, error: 'Status ' + response.statusCode })
    }
  } catch (err) {
    return e.json(400, {
      connected: false,
      error: err && err.message ? err.message : String(err),
    })
  }
})
