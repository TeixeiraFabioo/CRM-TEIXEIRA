// pocketbase/hooks/calendly.js
// Calendly endpoints for Skip Cloud / PocketBase

// 1. Endpoint to connect Calendly: POST /api/calendly/connect
routerAdd(
  'POST',
  '/api/calendly/connect',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const token = (reqBody.token || reqBody.api_token || '').trim()
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }
      if (!token) {
        return e.json(400, { success: false, error: 'Token de API do Calendly é obrigatório.' })
      }

      // Validate token against Calendly API: GET https://api.calendly.com/users/me
      let testRes
      try {
        testRes = $http.send({
          url: 'https://api.calendly.com/users/me',
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error:
            'Não foi possível conectar à API do Calendly: ' + (httpErr.message || String(httpErr)),
        })
      }

      if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
        const errorDetail =
          (testRes.json &&
            (testRes.json.message ||
              testRes.json.title ||
              testRes.json.detail ||
              JSON.stringify(testRes.json))) ||
          'Token inválido ou recusado pela API do Calendly.'
        return e.json(400, {
          success: false,
          error: errorDetail,
          statusCode: testRes.statusCode,
        })
      }

      const resData = testRes.json || {}
      const resource = resData.resource || {}
      const schedulingUrl = resource.scheduling_url || ''
      const userEmail = resource.email || ''
      const userName = resource.name || ''
      const userUri = resource.uri || ''
      const userAvatar = resource.avatar_url || ''

      // Upsert in integration_configs
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

      const configPayload = {
        provider: 'calendly',
        scheduling_url: schedulingUrl,
        user_email: userEmail,
        user_name: userName,
        user_uri: userUri,
        avatar_url: userAvatar,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      }

      configRec.set('status', 'active')
      configRec.set('is_active', true)
      configRec.set('api_token', token)
      configRec.set('config_json', configPayload)
      configRec.set('config', configPayload)

      $app.save(configRec)

      // Audit log
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
        scheduling_url: schedulingUrl,
        config: {
          id: configRec.id,
          provider: 'calendly',
          status: 'active',
          is_active: true,
          scheduling_url: schedulingUrl,
          user_email: userEmail,
          user_name: userName,
          avatar_url: userAvatar,
          updated: configRec.getString('updated') || new Date().toISOString(),
          created: configRec.getString('created') || new Date().toISOString(),
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao conectar Calendly: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Endpoint to disconnect Calendly: POST /api/calendly/disconnect
routerAdd(
  'POST',
  '/api/calendly/disconnect',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

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
        console.warn('[Calendly Hook] Erro ao deletar config:', delErr)
      }

      // Audit log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('tenant_id', tenantId)
        auditRec.set('user_id', e.auth ? e.auth.id : '')
        auditRec.set('action', 'calendly_disconnected')
        auditRec.set('resource_type', 'integration_configs')
        auditRec.set('resource_id', '')
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
  },
  $apis.requireAuth(),
)

// 3. Endpoint to test Calendly connection: POST /api/calendly/test
routerAdd(
  'POST',
  '/api/calendly/test',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      let token = (reqBody.token || reqBody.api_token || '').trim()
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

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
            token = cfgRec.getString('api_token')
            const cfg = cfgRec.get('config_json') || cfgRec.get('config') || {}
            if (!token && cfg.api_token) token = cfg.api_token
          }
        } catch (_) {}
      }

      if (!token && tenantId) {
        try {
          const secretRec = $app.findFirstRecordByData(
            'system_secrets',
            'key',
            'CALENDLY_API_TOKEN',
          )
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            token = secretRec.getString('value')
          }
        } catch (_) {}
      }

      if (!token) {
        token = $os.getenv('CALENDLY_API_TOKEN') || ''
      }

      if (!token) {
        return e.json(400, {
          success: false,
          error: 'Nenhum token do Calendly informado ou encontrado.',
        })
      }

      let testRes
      try {
        testRes = $http.send({
          url: 'https://api.calendly.com/users/me',
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error: 'Erro ao conectar à API do Calendly: ' + (httpErr.message || String(httpErr)),
        })
      }

      if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
        const errorDetail =
          (testRes.json &&
            (testRes.json.message ||
              testRes.json.title ||
              testRes.json.detail ||
              JSON.stringify(testRes.json))) ||
          'Token inválido ou recusado pela API do Calendly.'
        return e.json(400, {
          success: false,
          message: errorDetail,
          error: errorDetail,
          statusCode: testRes.statusCode,
        })
      }

      const resData = testRes.json || {}
      const resource = resData.resource || {}

      return e.json(200, {
        success: true,
        message: 'Conexão com a API do Calendly validada com sucesso!',
        scheduling_url: resource.scheduling_url || '',
        user: {
          name: resource.name || '',
          email: resource.email || '',
          scheduling_url: resource.scheduling_url || '',
          avatar_url: resource.avatar_url || '',
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro no teste de conexão Calendly: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Endpoint to get Calendly config and scheduling link: GET /api/calendly/config
routerAdd(
  'GET',
  '/api/calendly/config',
  (e) => {
    try {
      const tenantId = e.requestInfo().query.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }

      let isConnected = false
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
          const token = cfgRec.getString('api_token')
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (token || cfgJson.api_token || cfgJson.scheduling_url) {
            isConnected = true
            configData = {
              id: cfgRec.id,
              provider: 'calendly',
              status: cfgRec.getString('status') || 'active',
              is_active: cfgRec.get('is_active') !== false,
              scheduling_url: cfgJson.scheduling_url || '',
              user_name: cfgJson.user_name || '',
              user_email: cfgJson.user_email || '',
              avatar_url: cfgJson.avatar_url || '',
              created: cfgRec.getString('created'),
              updated: cfgRec.getString('updated'),
              last_sync: cfgJson.last_sync || cfgRec.getString('updated'),
            }
          }
        }
      } catch (qErr) {
        console.warn('[Calendly Hook] Erro ao buscar config:', qErr)
      }

      return e.json(200, {
        success: true,
        connected: isConnected,
        scheduling_url: configData ? configData.scheduling_url : '',
        config: configData,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao obter status do Calendly: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// 5. Endpoint to get scheduling link: GET /api/calendly/scheduling-link
routerAdd(
  'GET',
  '/api/calendly/scheduling-link',
  (e) => {
    try {
      const tenantId = e.requestInfo().query.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

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
          const cfgRec = configs[0]
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          schedulingUrl = cfgJson.scheduling_url || ''
        }
      } catch (qErr) {
        console.warn('[Calendly Hook] Erro ao buscar scheduling link:', qErr)
      }

      return e.json(200, {
        success: true,
        scheduling_url: schedulingUrl,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao obter link do Calendly: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
