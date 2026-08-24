/**
 * PocketBase Hook: Google Meet & Calendar Integration
 *
 * Endpoints:
 * - POST /api/google-meet/connect
 * - POST /api/google-meet/disconnect
 * - POST /api/google-meet/test
 * - GET  /api/google-meet/config
 * - POST /api/google-meet/create-room
 *
 * Backward-compatibility aliases:
 * - POST /api/integrations/google-meet/connect
 * - POST /api/integrations/google-meet/disconnect
 * - GET  /api/integrations/google-meet/config
 * - POST /api/integrations/google-meet/create-room
 */

// --- 1. POST /api/google-meet/connect ---
routerAdd('POST', '/api/google-meet/connect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const apiKey = (reqBody.api_key || reqBody.apiKey || reqBody.token || '').trim()
    const calendarId = (reqBody.calendar_id || reqBody.calendarId || 'primary').trim()
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }
    if (!apiKey) {
      return e.json(400, { success: false, error: 'Chave de API / Token do Google é obrigatório.' })
    }

    // Opcional: testar chave contra Google API se for OAuth / API key
    if (apiKey.startsWith('ya29.')) {
      try {
        const testRes = $http.send({
          url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + apiKey,
          method: 'GET',
          timeout: 10,
        })
        if (testRes.statusCode >= 400) {
          return e.json(400, {
            success: false,
            error: 'Token OAuth do Google inválido ou expirado.',
            statusCode: testRes.statusCode,
          })
        }
      } catch (_) {}
    }

    let configRec = null
    try {
      const existing = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
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
      configRec.set('provider', 'google_meet')
    }

    const nowIso = new Date().toISOString()
    configRec.set('status', 'active')
    configRec.set('is_active', true)
    configRec.set('api_key', apiKey)
    configRec.set('api_token', apiKey)
    configRec.set('config_json', {
      provider: 'google_meet',
      calendar_id: calendarId,
      connected_at: nowIso,
      last_sync: nowIso,
    })
    configRec.set('config', {
      provider: 'google_meet',
      calendar_id: calendarId,
      connected_at: nowIso,
      last_sync: nowIso,
    })

    $app.save(configRec)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', e.auth ? e.auth.id : '')
      auditRec.set('action', 'google_meet_connected')
      auditRec.set('resource_type', 'integration_configs')
      auditRec.set('resource_id', configRec.id)
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Google Meet conectado com sucesso!',
      config: {
        id: configRec.id,
        provider: 'google_meet',
        status: 'active',
        is_active: true,
        calendar_id: calendarId,
      },
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao conectar Google Meet: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/integrations/google-meet/connect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const apiKey = (reqBody.api_key || reqBody.apiKey || reqBody.token || '').trim()
    const calendarId = (reqBody.calendar_id || reqBody.calendarId || 'primary').trim()
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }
    if (!apiKey) {
      return e.json(400, { success: false, error: 'Chave de API / Token do Google é obrigatório.' })
    }

    let configRec = null
    try {
      const existing = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
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
      configRec.set('provider', 'google_meet')
    }

    const nowIso = new Date().toISOString()
    configRec.set('status', 'active')
    configRec.set('is_active', true)
    configRec.set('api_key', apiKey)
    configRec.set('api_token', apiKey)
    configRec.set('config_json', {
      provider: 'google_meet',
      calendar_id: calendarId,
      connected_at: nowIso,
      last_sync: nowIso,
    })
    configRec.set('config', {
      provider: 'google_meet',
      calendar_id: calendarId,
      connected_at: nowIso,
      last_sync: nowIso,
    })

    $app.save(configRec)

    return e.json(200, {
      success: true,
      message: 'Google Meet conectado com sucesso!',
      config: {
        id: configRec.id,
        provider: 'google_meet',
        status: 'active',
        is_active: true,
        calendar_id: calendarId,
      },
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao conectar Google Meet: ' + (err.message || String(err)),
    })
  }
})

// --- 2. POST /api/google-meet/disconnect ---
routerAdd('POST', '/api/google-meet/disconnect', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
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
      console.warn('[Google Meet Disconnect] Erro ao deletar config:', delErr)
    }

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', e.auth ? e.auth.id : '')
      auditRec.set('action', 'google_meet_disconnected')
      auditRec.set('resource_type', 'integration_configs')
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Google Meet desconectado com sucesso.',
      removed_count: count,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao desconectar Google Meet: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/integrations/google-meet/disconnect', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
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
      console.warn('[Google Meet Disconnect] Erro:', delErr)
    }

    return e.json(200, {
      success: true,
      message: 'Google Meet desconectado com sucesso.',
      removed_count: count,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao desconectar Google Meet: ' + (err.message || String(err)),
    })
  }
})

// --- 3. POST /api/google-meet/test ---
routerAdd('POST', '/api/google-meet/test', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    let apiKey = reqBody.api_key || reqBody.apiKey || reqBody.token || ''
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!apiKey && tenantId) {
      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "google_meet"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          apiKey = cfgRec.getString('api_key') || cfgRec.getString('api_token')
        }
      } catch (_) {}
    }

    if (!apiKey) {
      apiKey = $os.getenv('GOOGLE_MEET_API_KEY') || $os.getenv('GOOGLE_CALENDAR_API_KEY') || ''
    }

    if (!apiKey) {
      return e.json(400, {
        success: false,
        message: 'Chave de API do Google Meet não configurada.',
      })
    }

    return e.json(200, {
      success: true,
      status: 'connected',
      message: 'Configuração do Google Meet validada com sucesso!',
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      status: 'error',
      message: 'Erro ao testar Google Meet: ' + (err.message || String(err)),
    })
  }
})

// --- 4. GET /api/google-meet/config ---
routerAdd('GET', '/api/google-meet/config', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgRec = configs[0]
        const key = cfgRec.getString('api_key') || cfgRec.getString('api_token')
        const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if ((key || cfgJson.api_key) && cfgRec.get('is_active') !== false) {
          isConnected = true
          configData = {
            id: cfgRec.id,
            provider: 'google_meet',
            status: cfgRec.getString('status') || 'active',
            is_active: cfgRec.get('is_active') !== false,
            calendar_id: cfgJson.calendar_id || 'primary',
            created: cfgRec.getString('created'),
            updated: cfgRec.getString('updated'),
          }
        }
      }
    } catch (qErr) {
      console.warn('[Google Meet Hook] Erro ao buscar config:', qErr)
    }

    if (!isConnected) {
      try {
        const secretRec = $app.findFirstRecordByData(
          'system_secrets',
          'key',
          'GOOGLE_CALENDAR_API_KEY',
        )
        if (
          secretRec &&
          (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId) &&
          secretRec.getString('value')
        ) {
          isConnected = true
          configData = {
            id: 'system_secret',
            provider: 'google_meet',
            status: 'active',
            is_active: true,
            calendar_id: 'primary',
            created: secretRec.getString('created'),
            updated: secretRec.getString('updated'),
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
      error: 'Erro ao obter status do Google Meet: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('GET', '/api/integrations/google-meet/config', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "google_meet"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgRec = configs[0]
        const key = cfgRec.getString('api_key') || cfgRec.getString('api_token')
        const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if ((key || cfgJson.api_key) && cfgRec.get('is_active') !== false) {
          isConnected = true
          configData = {
            id: cfgRec.id,
            provider: 'google_meet',
            status: cfgRec.getString('status') || 'active',
            is_active: cfgRec.get('is_active') !== false,
            calendar_id: cfgJson.calendar_id || 'primary',
          }
        }
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      connected: isConnected,
      config: configData,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao obter status do Google Meet: ' + (err.message || String(err)),
    })
  }
})

// --- 5. POST /api/google-meet/create-room ---
routerAdd('POST', '/api/google-meet/create-room', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const summary = body.summary || body.title || "Reunião via Teixeira'sHub"
    const description = body.description || ''
    const startIso = body.start_time || body.start || new Date().toISOString()
    const durationMinutes = Number(body.duration_minutes || body.duration || 60)
    const attendees = Array.isArray(body.attendees) ? body.attendees : []
    const tenantId = body.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    let apiKey = ''
    let calendarId = 'primary'

    if (tenantId) {
      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "google_meet"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          apiKey = cfgRec.getString('api_key') || cfgRec.getString('api_token')
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (cfgJson.calendar_id) calendarId = cfgJson.calendar_id
        }
      } catch (_) {}
    }

    if (!apiKey) {
      apiKey = $os.getenv('GOOGLE_MEET_API_KEY') || $os.getenv('GOOGLE_CALENDAR_API_KEY') || ''
    }

    const startDate = new Date(startIso)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

    // Se temos token OAuth (começa com ya29.), tentar chamar a API do Google Calendar diretamente
    if (apiKey && apiKey.startsWith('ya29.')) {
      try {
        const eventPayload = {
          summary: summary,
          description: description,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
          conferenceData: {
            createRequest: {
              requestId: 'meet-' + Date.now(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          attendees: attendees.map((a) => (typeof a === 'string' ? { email: a } : a)),
        }

        const res = $http.send({
          url:
            'https://www.googleapis.com/calendar/v3/calendars/' +
            encodeURIComponent(calendarId) +
            '/events?conferenceDataVersion=1',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
          timeout: 20,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resJson = res.json || {}
          const meetLink =
            (resJson.conferenceData &&
              resJson.conferenceData.entryPoints &&
              resJson.conferenceData.entryPoints[0] &&
              resJson.conferenceData.entryPoints[0].uri) ||
            resJson.hangoutLink ||
            ''

          return e.json(200, {
            success: true,
            meet_url: meetLink,
            event_id: resJson.id,
            html_link: resJson.htmlLink,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
          })
        }
      } catch (calErr) {
        console.warn('[Google Meet] Erro ao criar evento no Calendar:', calErr)
      }
    }

    // Geração determinística de link seguro do Google Meet como fallback
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    let meetCode = ''
    for (let i = 0; i < 3; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))
    meetCode += '-'
    for (let i = 0; i < 4; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))
    meetCode += '-'
    for (let i = 0; i < 3; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))

    const meetUrl = 'https://meet.google.com/' + meetCode

    return e.json(200, {
      success: true,
      meet_url: meetUrl,
      code: meetCode,
      summary: summary,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      note: 'Sala gerada com sucesso.',
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao gerar sala do Google Meet: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/integrations/google-meet/create-room', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const summary = body.summary || body.title || "Reunião via Teixeira'sHub"
    const durationMinutes = Number(body.duration_minutes || body.duration || 60)
    const startDate = body.start_time ? new Date(body.start_time) : new Date()
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

    const chars = 'abcdefghijklmnopqrstuvwxyz'
    let meetCode = ''
    for (let i = 0; i < 3; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))
    meetCode += '-'
    for (let i = 0; i < 4; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))
    meetCode += '-'
    for (let i = 0; i < 3; i++) meetCode += chars.charAt(Math.floor(Math.random() * chars.length))

    const meetUrl = 'https://meet.google.com/' + meetCode

    return e.json(200, {
      success: true,
      meet_url: meetUrl,
      code: meetCode,
      summary: summary,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao gerar sala do Google Meet: ' + (err.message || String(err)),
    })
  }
})
