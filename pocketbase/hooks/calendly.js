/**
 * PocketBase Hook: Calendly Integration
 *
 * Strategy without routerAdd (native records API + lifecycle hooks):
 * - onRecordCreate / onRecordUpdate on integration_configs:
 *   Validates Calendly token against https://api.calendly.com/users/me
 *   Extracts scheduling_url and user details.
 *   Sets status='active', is_active=true on success; status='error' on failure.
 */

// Lifecycle hook: Validação ao criar integração Calendly
onRecordCreate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'calendly') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.apiKey) token = cfg.apiKey
    if (!token && cfg.token) token = cfg.token

    if (token && !record.getString('api_token')) {
      record.set('api_token', token)
    }

    if (!token) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      record.set('error_message', '')
      return e.next()
    }

    try {
      const testRes = $http.send({
        url: 'https://api.calendly.com/users/me',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        const userResource = (testRes.json && testRes.json.resource) || {}
        const schedulingUrl = cfg.scheduling_url || userResource.scheduling_url || ''
        const nowIso = new Date().toISOString()

        record.set('status', 'active')
        record.set('is_active', true)
        record.set('error_message', '')
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'calendly',
          scheduling_url: schedulingUrl,
          user_uri: userResource.uri || '',
          user_name: userResource.name || '',
          user_email: userResource.email || '',
          last_validated: nowIso,
          error_message: '',
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        let errMessage = ''
        const resJson = testRes.json || {}
        if (resJson.message) {
          errMessage = resJson.message
        } else if (resJson.title) {
          errMessage = resJson.title
        } else {
          try {
            errMessage = testRes.raw || testRes.body || JSON.stringify(resJson)
          } catch (_) {}
        }
        const errDetail =
          'Erro na API do Calendly (HTTP ' +
          testRes.statusCode +
          '): ' +
          (errMessage || 'Token inválido')
        record.set('status', 'error')
        record.set('is_active', false)
        record.set('error_message', String(errDetail))
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'calendly',
          error_message: String(errDetail),
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      const connErr =
        'Falha de conexão com a API do Calendly: ' + (httpErr.message || String(httpErr))
      record.set('status', 'error')
      record.set('is_active', false)
      record.set('error_message', connErr)
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'calendly',
        error_message: connErr,
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[Calendly onRecordCreate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

// Lifecycle hook: Validação e re-teste ao atualizar integração Calendly
onRecordUpdate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'calendly') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.apiKey) token = cfg.apiKey
    if (!token && cfg.token) token = cfg.token

    if (token && !record.getString('api_token')) {
      record.set('api_token', token)
    }

    if (!token) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      record.set('error_message', '')
      return e.next()
    }

    try {
      const testRes = $http.send({
        url: 'https://api.calendly.com/users/me',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        const userResource = (testRes.json && testRes.json.resource) || {}
        const schedulingUrl = cfg.scheduling_url || userResource.scheduling_url || ''
        const nowIso = new Date().toISOString()

        record.set('status', 'active')
        record.set('is_active', true)
        record.set('error_message', '')
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'calendly',
          scheduling_url: schedulingUrl,
          user_uri: userResource.uri || '',
          user_name: userResource.name || '',
          user_email: userResource.email || '',
          last_validated: nowIso,
          error_message: '',
          test_requested: false,
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        let errMessage = ''
        const resJson = testRes.json || {}
        if (resJson.message) {
          errMessage = resJson.message
        } else if (resJson.title) {
          errMessage = resJson.title
        } else {
          try {
            errMessage = testRes.raw || testRes.body || JSON.stringify(resJson)
          } catch (_) {}
        }
        const errDetail =
          'Erro na API do Calendly (HTTP ' +
          testRes.statusCode +
          '): ' +
          (errMessage || 'Token inválido')
        record.set('status', 'error')
        record.set('is_active', false)
        record.set('error_message', String(errDetail))
        const updatedCfg = Object.assign({}, cfg, {
          provider: 'calendly',
          error_message: String(errDetail),
          test_requested: false,
        })
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      const connErr =
        'Falha de conexão com a API do Calendly: ' + (httpErr.message || String(httpErr))
      record.set('status', 'error')
      record.set('is_active', false)
      record.set('error_message', connErr)
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'calendly',
        error_message: connErr,
        test_requested: false,
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[Calendly onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')
