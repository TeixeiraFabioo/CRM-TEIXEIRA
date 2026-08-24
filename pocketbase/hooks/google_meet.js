/**
 * PocketBase Hook: Google Meet & Calendar Integration
 *
 * Strategy without routerAdd (native records API + lifecycle hooks):
 * - onRecordCreate / onRecordUpdate on integration_configs:
 *   Validates Google API Key / OAuth Token (if ya29. token format).
 *   Sets status='active', is_active=true on success.
 */

// Lifecycle hook: Validação ao criar integração Google Meet
onRecordCreate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'google_meet') return e.next()

    let apiKey = record.getString('api_key') || record.getString('api_token') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!apiKey && cfg.api_key) apiKey = cfg.api_key
    if (!apiKey && cfg.apiKey) apiKey = cfg.apiKey
    if (!apiKey && cfg.token) apiKey = cfg.token

    if (!apiKey) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').trim()

    // Validação opcional se for token OAuth (começa com ya29.)
    if (apiKey.startsWith('ya29.')) {
      try {
        const testRes = $http.send({
          url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + apiKey,
          method: 'GET',
          timeout: 10,
        })
        if (testRes.statusCode >= 400) {
          record.set('status', 'error')
          record.set('is_active', false)
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            error_message:
              'Token OAuth do Google inválido ou expirado (HTTP ' + testRes.statusCode + ')',
          })
          record.set('config_json', updatedCfg)
          record.set('config', updatedCfg)
          return e.next()
        }
      } catch (httpErr) {
        console.warn('[Google Meet Hook] Falha ao verificar OAuth:', httpErr)
      }
    }

    const nowIso = new Date().toISOString()
    record.set('status', 'active')
    record.set('is_active', true)
    const updatedCfg = Object.assign({}, cfg, {
      provider: 'google_meet',
      calendar_id: calendarId,
      last_validated: nowIso,
      error_message: '',
    })
    record.set('config_json', updatedCfg)
    record.set('config', updatedCfg)

    return e.next()
  } catch (err) {
    console.error('[Google Meet onRecordCreate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

// Lifecycle hook: Validação e re-teste ao atualizar integração Google Meet
onRecordUpdate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'google_meet') return e.next()

    let apiKey = record.getString('api_key') || record.getString('api_token') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!apiKey && cfg.api_key) apiKey = cfg.api_key
    if (!apiKey && cfg.apiKey) apiKey = cfg.apiKey
    if (!apiKey && cfg.token) apiKey = cfg.token

    if (!apiKey) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').trim()

    if (apiKey.startsWith('ya29.')) {
      try {
        const testRes = $http.send({
          url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + apiKey,
          method: 'GET',
          timeout: 10,
        })
        if (testRes.statusCode >= 400) {
          record.set('status', 'error')
          record.set('is_active', false)
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            error_message:
              'Token OAuth do Google inválido ou expirado (HTTP ' + testRes.statusCode + ')',
            test_requested: false,
          })
          record.set('config_json', updatedCfg)
          record.set('config', updatedCfg)
          return e.next()
        }
      } catch (httpErr) {
        console.warn('[Google Meet Hook] Falha ao verificar OAuth:', httpErr)
      }
    }

    const nowIso = new Date().toISOString()
    record.set('status', 'active')
    record.set('is_active', true)
    const updatedCfg = Object.assign({}, cfg, {
      provider: 'google_meet',
      calendar_id: calendarId,
      last_validated: nowIso,
      error_message: '',
      test_requested: false,
    })
    record.set('config_json', updatedCfg)
    record.set('config', updatedCfg)

    return e.next()
  } catch (err) {
    console.error('[Google Meet onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')
