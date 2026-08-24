/**
 * Calendly Integration Hooks
 * Teixeira'sHub CRM
 *
 * Endpoints for connecting, testing, disconnecting, and retrieving configuration
 * for Calendly scheduling.
 */

routerAdd('POST', '/api/calendly/connect', (c) => {
  try {
    const data = $apis.requestInfo(c).data || {}
    const tenantId = data.tenant_id
    const token = data.token

    if (!tenantId || !token) {
      return c.json(400, {
        success: false,
        error: 'tenant_id e token (API Key) são obrigatórios.',
      })
    }

    // Validate token by calling GET https://api.calendly.com/users/me
    const res = $http.send({
      url: 'https://api.calendly.com/users/me',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      let errorMsg = 'Token Calendly inválido ou não autorizado.'
      try {
        const errJson = JSON.parse(res.raw)
        if (errJson.message) errorMsg = errJson.message
      } catch (_) {}
      return c.json(400, {
        success: false,
        error: errorMsg,
        statusCode: res.statusCode,
      })
    }

    const meData = JSON.parse(res.raw)
    const resource = meData.resource || {}
    const schedulingUrl = resource.scheduling_url || resource.uri || ''
    const userName = resource.name || ''
    const userEmail = resource.email || ''

    // Upsert into integration_configs
    let existing = null
    try {
      existing = $app.findFirstRecordByFilter(
        'integration_configs',
        'tenant_id = {:tenant_id} && provider = "calendly"',
        { tenant_id: tenantId },
      )
    } catch (_) {}

    const collection = $app.findCollectionByNameOrId('integration_configs')
    const record = existing || new Record(collection)

    record.set('tenant_id', tenantId)
    record.set('provider', 'calendly')
    record.set('api_key', token)
    record.set('is_active', true)
    record.set('config', {
      user_uri: resource.uri || '',
      scheduling_url: schedulingUrl,
      user_name: userName,
      user_email: userEmail,
      slug: resource.slug || '',
      connected_at: new Date().toISOString(),
    })

    $app.save(record)

    return c.json(200, {
      success: true,
      message: 'Calendly conectado com sucesso!',
      scheduling_url: schedulingUrl,
      config: {
        user_name: userName,
        user_email: userEmail,
        scheduling_url: schedulingUrl,
      },
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message || 'Erro interno ao conectar Calendly.',
    })
  }
})

routerAdd('POST', '/api/calendly/disconnect', (c) => {
  try {
    const data = $apis.requestInfo(c).data || {}
    const tenantId = data.tenant_id

    if (!tenantId) {
      return c.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    try {
      const record = $app.findFirstRecordByFilter(
        'integration_configs',
        'tenant_id = {:tenant_id} && provider = "calendly"',
        { tenant_id: tenantId },
      )
      if (record) {
        $app.delete(record)
      }
    } catch (_) {}

    return c.json(200, {
      success: true,
      message: 'Calendly desconectado com sucesso.',
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message || 'Erro ao desconectar Calendly.',
    })
  }
})

routerAdd('POST', '/api/calendly/test', (c) => {
  try {
    const data = $apis.requestInfo(c).data || {}
    const tenantId = data.tenant_id
    let token = data.token

    if (!token && tenantId) {
      try {
        const record = $app.findFirstRecordByFilter(
          'integration_configs',
          'tenant_id = {:tenant_id} && provider = "calendly"',
          { tenant_id: tenantId },
        )
        if (record) {
          token = record.get('api_key')
        }
      } catch (_) {}
    }

    if (!token) {
      return c.json(400, {
        success: false,
        error: 'Token da API do Calendly não fornecido e não encontrado no banco.',
      })
    }

    const res = $http.send({
      url: 'https://api.calendly.com/users/me',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      return c.json(400, {
        success: false,
        error: 'Conexão falhou. Status: ' + res.statusCode,
      })
    }

    const meData = JSON.parse(res.raw)
    const resource = meData.resource || {}

    return c.json(200, {
      success: true,
      message: 'Conexão com Calendly ativa e validada!',
      scheduling_url: resource.scheduling_url || resource.uri || '',
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message || 'Erro ao testar conexão com Calendly.',
    })
  }
})

routerAdd('GET', '/api/calendly/config', (c) => {
  try {
    const tenantId = c.queryParam('tenant_id')
    if (!tenantId) {
      return c.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    try {
      const record = $app.findFirstRecordByFilter(
        'integration_configs',
        'tenant_id = {:tenant_id} && provider = "calendly"',
        { tenant_id: tenantId },
      )
      if (record && record.get('is_active') !== false) {
        const cfg = record.get('config') || {}
        return c.json(200, {
          connected: true,
          config: record,
          scheduling_url: cfg.scheduling_url || '',
        })
      }
    } catch (_) {}

    return c.json(200, {
      connected: false,
      config: null,
      scheduling_url: '',
    })
  } catch (err) {
    return c.json(500, {
      connected: false,
      config: null,
      scheduling_url: '',
      error: err.message,
    })
  }
})

routerAdd('GET', '/api/calendly/scheduling-link', (c) => {
  try {
    const tenantId = c.queryParam('tenant_id')
    if (!tenantId) {
      return c.json(400, { success: false, error: 'tenant_id é obrigatório.' })
    }

    let schedulingUrl = ''
    try {
      const record = $app.findFirstRecordByFilter(
        'integration_configs',
        'tenant_id = {:tenant_id} && provider = "calendly"',
        { tenant_id: tenantId },
      )
      if (record && record.get('is_active') !== false) {
        const cfg = record.get('config') || {}
        schedulingUrl = cfg.scheduling_url || ''
      }
    } catch (_) {}

    return c.json(200, {
      success: true,
      scheduling_url: schedulingUrl,
    })
  } catch (err) {
    return c.json(500, { success: false, error: err.message })
  }
})
