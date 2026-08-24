/**
 * PocketBase Hook: Calendly Integration
 *
 * Endpoints:
 * - POST /api/calendly/connect
 * - POST /api/calendly/disconnect
 * - POST /api/calendly/test
 * - GET  /api/calendly/config
 * - GET  /api/calendly/scheduling-link
 * - POST /api/calendly/webhook
 *
 * Backward-compatibility aliases:
 * - POST /api/integrations/calendly/connect
 * - POST /api/integrations/calendly/disconnect
 * - GET  /api/integrations/calendly/config
 * - GET  /api/integrations/calendly/scheduling-link
 * - POST /api/webhooks/calendly
 */

// --- 1. POST /api/calendly/connect ---
routerAdd('POST', '/api/calendly/connect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const token = (reqBody.token || reqBody.api_token || reqBody.apiKey || '').trim()
    const schedulingUrl = (reqBody.scheduling_url || reqBody.schedulingUrl || '').trim()
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }
    if (!token) {
      return e.json(400, { success: false, error: 'Token do Calendly é obrigatório.' })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://api.calendly.com/users/me',
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
        error: 'Falha de conexão com a API do Calendly: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
      const errDetail =
        (testRes.json &&
          (testRes.json.message || testRes.json.title || JSON.stringify(testRes.json))) ||
        'Token inválido ou recusado pela API do Calendly.'
      return e.json(400, {
        success: false,
        error: errDetail,
        statusCode: testRes.statusCode,
      })
    }

    const userResource = (testRes.json && testRes.json.resource) || {}
    const finalSchedulingUrl = schedulingUrl || userResource.scheduling_url || ''

    let configRec = null
    try {
      const existing = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
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
      configRec.set('provider', 'calendly')
    }

    const nowIso = new Date().toISOString()
    configRec.set('status', 'active')
    configRec.set('is_active', true)
    configRec.set('api_token', token)
    configRec.set('api_key', token)
    configRec.set('config_json', {
      provider: 'calendly',
      scheduling_url: finalSchedulingUrl,
      user_uri: userResource.uri || '',
      user_name: userResource.name || '',
      user_email: userResource.email || '',
      connected_at: nowIso,
      last_sync: nowIso,
    })
    configRec.set('config', {
      provider: 'calendly',
      scheduling_url: finalSchedulingUrl,
      user_uri: userResource.uri || '',
      user_name: userResource.name || '',
      user_email: userResource.email || '',
      connected_at: nowIso,
      last_sync: nowIso,
    })

    $app.save(configRec)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', e.auth ? e.auth.id : '')
      auditRec.set('action', 'calendly_connected')
      auditRec.set('resource_type', 'integration_configs')
      auditRec.set('resource_id', configRec.id)
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Calendly conectado com sucesso!',
      config: {
        id: configRec.id,
        provider: 'calendly',
        status: 'active',
        is_active: true,
        scheduling_url: finalSchedulingUrl,
        user_name: userResource.name || '',
        user_email: userResource.email || '',
      },
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao conectar Calendly: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/integrations/calendly/connect', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    const token = (reqBody.token || reqBody.api_token || reqBody.apiKey || '').trim()
    const schedulingUrl = (reqBody.scheduling_url || reqBody.schedulingUrl || '').trim()
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }
    if (!token) {
      return e.json(400, { success: false, error: 'Token do Calendly é obrigatório.' })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://api.calendly.com/users/me',
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
        error: 'Falha de conexão com a API do Calendly: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
      const errDetail =
        (testRes.json &&
          (testRes.json.message || testRes.json.title || JSON.stringify(testRes.json))) ||
        'Token inválido ou recusado pela API do Calendly.'
      return e.json(400, {
        success: false,
        error: errDetail,
        statusCode: testRes.statusCode,
      })
    }

    const userResource = (testRes.json && testRes.json.resource) || {}
    const finalSchedulingUrl = schedulingUrl || userResource.scheduling_url || ''

    let configRec = null
    try {
      const existing = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
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
      configRec.set('provider', 'calendly')
    }

    const nowIso = new Date().toISOString()
    configRec.set('status', 'active')
    configRec.set('is_active', true)
    configRec.set('api_token', token)
    configRec.set('api_key', token)
    configRec.set('config_json', {
      provider: 'calendly',
      scheduling_url: finalSchedulingUrl,
      user_uri: userResource.uri || '',
      user_name: userResource.name || '',
      user_email: userResource.email || '',
      connected_at: nowIso,
      last_sync: nowIso,
    })
    configRec.set('config', {
      provider: 'calendly',
      scheduling_url: finalSchedulingUrl,
      user_uri: userResource.uri || '',
      user_name: userResource.name || '',
      user_email: userResource.email || '',
      connected_at: nowIso,
      last_sync: nowIso,
    })

    $app.save(configRec)

    return e.json(200, {
      success: true,
      message: 'Calendly conectado com sucesso!',
      config: {
        id: configRec.id,
        provider: 'calendly',
        status: 'active',
        is_active: true,
        scheduling_url: finalSchedulingUrl,
      },
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao conectar Calendly: ' + (err.message || String(err)),
    })
  }
})

// --- 2. POST /api/calendly/disconnect ---
routerAdd('POST', '/api/calendly/disconnect', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
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
      console.warn('[Calendly Disconnect] Erro ao deletar config:', delErr)
    }

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', e.auth ? e.auth.id : '')
      auditRec.set('action', 'calendly_disconnected')
      auditRec.set('resource_type', 'integration_configs')
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Calendly desconectado com sucesso.',
      removed_count: count,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao desconectar Calendly: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/integrations/calendly/disconnect', (e) => {
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
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
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
      console.warn('[Calendly Disconnect] Erro:', delErr)
    }

    return e.json(200, {
      success: true,
      message: 'Calendly desconectado com sucesso.',
      removed_count: count,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao desconectar Calendly: ' + (err.message || String(err)),
    })
  }
})

// --- 3. POST /api/calendly/test ---
routerAdd('POST', '/api/calendly/test', (e) => {
  try {
    const reqBody = e.requestInfo().body || {}
    let token = reqBody.token || reqBody.api_token || reqBody.apiKey || ''
    const tenantId = reqBody.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!token && tenantId) {
      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "calendly"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          token = cfgRec.getString('api_token') || cfgRec.getString('api_key')
          const cfg = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (!token && cfg.api_token) token = cfg.api_token
        }
      } catch (_) {}

      if (!token) {
        try {
          const secretRec = $app.findFirstRecordByData('system_secrets', 'key', 'CALENDLY_API_KEY')
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            token = secretRec.getString('value')
          }
        } catch (_) {}
      }
    }

    if (!token) {
      token = $os.getenv('CALENDLY_API_KEY') || ''
    }

    if (!token) {
      return e.json(400, {
        success: false,
        message: 'Token do Calendly não informado nem configurado.',
      })
    }

    let testRes
    try {
      testRes = $http.send({
        url: 'https://api.calendly.com/users/me',
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
        error: 'Falha de conexão com a API do Calendly: ' + (httpErr.message || String(httpErr)),
      })
    }

    if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
      return e.json(200, {
        success: true,
        status: 'connected',
        message: 'Conexão com Calendly validada com sucesso!',
        data: testRes.json,
      })
    } else {
      return e.json(testRes.statusCode, {
        success: false,
        status: 'error',
        statusCode: testRes.statusCode,
        message:
          (testRes.json &&
            (testRes.json.message || testRes.json.title || JSON.stringify(testRes.json))) ||
          'Falha de autenticação com a API do Calendly.',
      })
    }
  } catch (err) {
    return e.json(500, {
      success: false,
      status: 'error',
      message: 'Erro ao comunicar com a API do Calendly: ' + (err.message || String(err)),
    })
  }
})

// --- 4. GET /api/calendly/config: Retorna status e scheduling_url (NUNCA api_token) ---
routerAdd('GET', '/api/calendly/config', (e) => {
  try {
    const tenantId =
      e.requestInfo().query.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    let isConnected = false
    let schedulingUrl = ''
    let configData = null

    try {
      const configs = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgRec = configs[0]
        const token = cfgRec.getString('api_token') || cfgRec.getString('api_key')
        const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if ((token || cfgJson.api_token) && cfgRec.get('is_active') !== false) {
          isConnected = true
          schedulingUrl = cfgJson.scheduling_url || ''
          configData = {
            id: cfgRec.id,
            provider: 'calendly',
            status: cfgRec.getString('status') || 'active',
            is_active: cfgRec.get('is_active') !== false,
            scheduling_url: schedulingUrl,
            user_name: cfgJson.user_name || '',
            user_email: cfgJson.user_email || '',
            created: cfgRec.getString('created'),
            updated: cfgRec.getString('updated'),
          }
        }
      }
    } catch (qErr) {
      console.warn('[Calendly Hook] Erro ao buscar config:', qErr)
    }

    if (!isConnected) {
      try {
        const secretRec = $app.findFirstRecordByData('system_secrets', 'key', 'CALENDLY_API_KEY')
        if (
          secretRec &&
          (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId) &&
          secretRec.getString('value')
        ) {
          isConnected = true
          configData = {
            id: 'system_secret',
            provider: 'calendly',
            status: 'active',
            is_active: true,
            scheduling_url: '',
            created: secretRec.getString('created'),
            updated: secretRec.getString('updated'),
          }
        }
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      connected: isConnected,
      scheduling_url: schedulingUrl,
      config: configData,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao obter status do Calendly: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('GET', '/api/integrations/calendly/config', (e) => {
  try {
    const tenantId =
      e.requestInfo().query.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    let isConnected = false
    let schedulingUrl = ''
    let configData = null

    try {
      const configs = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgRec = configs[0]
        const token = cfgRec.getString('api_token') || cfgRec.getString('api_key')
        const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
        if ((token || cfgJson.api_token) && cfgRec.get('is_active') !== false) {
          isConnected = true
          schedulingUrl = cfgJson.scheduling_url || ''
          configData = {
            id: cfgRec.id,
            provider: 'calendly',
            status: cfgRec.getString('status') || 'active',
            is_active: cfgRec.get('is_active') !== false,
            scheduling_url: schedulingUrl,
          }
        }
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      connected: isConnected,
      scheduling_url: schedulingUrl,
      config: configData,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao obter status do Calendly: ' + (err.message || String(err)),
    })
  }
})

// --- 5. GET /api/calendly/scheduling-link: Retorna scheduling_url para o tenant ---
routerAdd('GET', '/api/calendly/scheduling-link', (e) => {
  try {
    const tenantId =
      e.requestInfo().query.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    let schedulingUrl = ''
    try {
      const configs = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgJson = configs[0].get('config_json') || configs[0].get('config') || {}
        schedulingUrl = cfgJson.scheduling_url || ''
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      scheduling_url: schedulingUrl,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao obter link de agendamento: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('GET', '/api/integrations/calendly/scheduling-link', (e) => {
  try {
    const tenantId =
      e.requestInfo().query.tenant_id || (e.auth ? e.auth.get('tenant_id') : '') || ''

    if (!tenantId) {
      return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    let schedulingUrl = ''
    try {
      const configs = $app.findRecordsByFilter(
        'integration_configs',
        'tenant_id = "' + tenantId + '" && provider = "calendly"',
        '-created',
        1,
        0,
      )
      if (configs && configs.length > 0) {
        const cfgJson = configs[0].get('config_json') || configs[0].get('config') || {}
        schedulingUrl = cfgJson.scheduling_url || ''
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      scheduling_url: schedulingUrl,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao obter link de agendamento: ' + (err.message || String(err)),
    })
  }
})

// --- 6. POST /api/calendly/webhook: Recebimento de agendamentos ---
routerAdd('POST', '/api/calendly/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const event = body.event || ''
    const payload = body.payload || {}

    console.log('[Calendly Webhook] Evento recebido:', event)

    if (event === 'invitee.created') {
      const inviteeName = payload.name || ''
      const inviteeEmail = payload.email || ''
      const eventStartTime = (payload.scheduled_event && payload.scheduled_event.start_time) || ''
      const eventEndTime = (payload.scheduled_event && payload.scheduled_event.end_time) || ''
      const eventName =
        (payload.scheduled_event && payload.scheduled_event.name) || 'Reunião Calendly'

      try {
        const taskCol = $app.findCollectionByNameOrId('tasks')
        const taskRec = new Record(taskCol)
        taskRec.set('title', eventName + ' - ' + inviteeName)
        taskRec.set('type', 'meeting')
        taskRec.set('status', 'pending')
        taskRec.set('priority', 'medium')
        taskRec.set(
          'notes',
          'Agendado via Calendly. Participante: ' + inviteeName + ' (' + inviteeEmail + ')',
        )
        if (eventStartTime) {
          taskRec.set('due_date', eventStartTime.replace('T', ' ').substring(0, 19))
        }
        $app.save(taskRec)
      } catch (taskErr) {
        console.warn('[Calendly Webhook] Erro ao criar tarefa:', taskErr)
      }
    }

    return e.json(200, {
      success: true,
      received: true,
      event: event,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao processar webhook Calendly: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade
routerAdd('POST', '/api/webhooks/calendly', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const event = body.event || ''
    return e.json(200, { success: true, received: true, event: event })
  } catch (err) {
    return e.json(500, { success: false, error: err.message || String(err) })
  }
})
