/**
 * PocketBase Hook: WhatsApp Cloud API (Meta Graph API v21.0) Integration
 *
 * Strategy without routerAdd (native records API + lifecycle hooks):
 * - onRecordCreate / onRecordUpdate on integration_configs:
 *   Validates Meta token and phone_number_id against Meta Graph API (GET https://graph.facebook.com/v21.0/{phoneNumberId}).
 *   Sets status='active', is_active=true on success; status='error' with error message on failure.
 *   Also handles message sending when config_json.send_message is provided.
 * - onRecordAfterCreateSuccess on webhook_events (or lead_messages):
 *   If any webhook event is recorded, processes incoming WhatsApp messages.
 */

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
