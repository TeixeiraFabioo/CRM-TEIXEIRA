/**
 * PocketBase Hook: Google Meet & Google Calendar Integration
 *
 * All functions are defined inline within callbacks to comply with PocketBase JSVM callback scoping rules.
 */

// Hook onRecordCreate em tasks: Geração automática de Google Meet
onRecordCreate((e) => {
  try {
    const task = e.record
    if (!task) return e.next()

    const tipo = task.getString('tipo')
    let meetLink = task.getString('meet_link')

    if (tipo === 'reuniao' && !meetLink) {
      const tenantId = task.getString('tenant_id')
      let accessToken = ''
      let configRec = null

      try {
        const list = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = {:tid} && provider = "google_meet"',
          '-created',
          1,
          0,
          { tid: tenantId },
        )
        if (list && list.length > 0) {
          configRec = list[0]
        }
      } catch (err) {
        console.log('[Google Meet] Erro ao buscar config:', err)
      }

      if (!configRec) {
        try {
          const globalList = $app.findRecordsByFilter(
            'integration_configs',
            'provider = "google_meet" && is_active = true',
            '-created',
            1,
            0,
          )
          if (globalList && globalList.length > 0) {
            configRec = globalList[0]
          }
        } catch (_) {}
      }

      if (configRec) {
        const cfg = configRec.get('config_json') || configRec.get('config') || {}
        const directToken = (
          configRec.getString('api_token') ||
          configRec.getString('api_key') ||
          cfg.access_token ||
          cfg.api_token ||
          ''
        ).trim()

        const clientId = (
          cfg.client_id ||
          cfg.clientId ||
          $os.getenv('GOOGLE_CLIENT_ID') ||
          ''
        ).trim()
        const clientSecret = (
          cfg.client_secret ||
          cfg.clientSecret ||
          $os.getenv('GOOGLE_CLIENT_SECRET') ||
          ''
        ).trim()
        const refreshToken = (
          cfg.refresh_token ||
          cfg.refreshToken ||
          $os.getenv('GOOGLE_REFRESH_TOKEN') ||
          ''
        ).trim()

        if (refreshToken && clientId && clientSecret) {
          try {
            const postBody =
              'client_id=' +
              encodeURIComponent(clientId) +
              '&client_secret=' +
              encodeURIComponent(clientSecret) +
              '&refresh_token=' +
              encodeURIComponent(refreshToken) +
              '&grant_type=refresh_token'

            const tokenRes = $http.send({
              url: 'https://oauth2.googleapis.com/token',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: postBody,
              timeout: 15,
            })

            if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
              const tokenJson = tokenRes.json || {}
              if (tokenJson.access_token) {
                accessToken = tokenJson.access_token
                const updatedCfg = Object.assign({}, cfg, {
                  access_token: accessToken,
                  token_refreshed_at: new Date().toISOString(),
                })
                configRec.set('api_token', accessToken)
                configRec.set('config_json', updatedCfg)
                configRec.set('config', updatedCfg)
                configRec.set('status', 'active')
                configRec.set('is_active', true)
                configRec.set('error_message', '')
                try {
                  $app.save(configRec)
                } catch (_) {}
              }
            } else {
              const errJson = tokenRes.json || {}
              const errMsg =
                errJson.error_description || errJson.error || 'HTTP ' + tokenRes.statusCode
              console.warn('[Google Meet] Falha ao renovar refresh token:', errMsg)
              try {
                configRec.set('error_message', 'Erro na renovação do token Google: ' + errMsg)
                $app.save(configRec)
              } catch (_) {}
            }
          } catch (refreshErr) {
            console.warn('[Google Meet] Erro de rede ao renovar token:', refreshErr)
          }
        }

        if (!accessToken && directToken) {
          accessToken = directToken
        }
      }

      if (accessToken) {
        const leadId = task.getString('lead_id')
        const respId = task.getString('responsavel_id')
        const oppId = task.getString('oportunidade_id')

        let leadName = 'Lead'
        let respName = 'Consultor'
        let oppName = 'Oportunidade'
        let attendees = []

        if (leadId) {
          try {
            const leadRec = $app.findRecordById('leads', leadId)
            if (leadRec) {
              leadName = leadRec.getString('name') || leadName
              const lEmail = leadRec.getString('email')
              if (lEmail) attendees.push({ email: lEmail })
            }
          } catch (_) {}
        }

        if (respId) {
          try {
            const userRec = $app.findRecordById('users', respId)
            if (userRec) {
              respName = userRec.getString('name') || respName
              const uEmail = userRec.getString('email')
              if (uEmail) attendees.push({ email: uEmail })
            }
          } catch (_) {}
        }

        if (oppId) {
          try {
            const oppRec = $app.findRecordById('opportunities', oppId)
            if (oppRec) {
              oppName = oppRec.getString('title') || oppName
            }
          } catch (_) {}
        }

        const parts = task.get('participantes')
        if (Array.isArray(parts)) {
          parts.forEach((p) => {
            if (typeof p === 'string' && p.includes('@')) attendees.push({ email: p.trim() })
          })
        } else if (typeof parts === 'string' && parts.includes('@')) {
          parts.split(',').forEach((p) => {
            if (p.includes('@')) attendees.push({ email: p.trim() })
          })
        }

        const eventSummary =
          'REUNIÃO ' +
          leadName.toUpperCase() +
          ' CONSULTOR ' +
          respName.toUpperCase() +
          ' - ' +
          oppName.toUpperCase()

        const taskDate = task.getString('data') || new Date().toISOString().slice(0, 10)
        const taskTime = task.getString('horario') || '10:00'
        const startDateTime = taskDate.slice(0, 10) + 'T' + taskTime.slice(0, 5) + ':00'

        let endDateTime = ''
        try {
          const startDateObj = new Date(startDateTime)
          const endDateObj = new Date(startDateObj.getTime() + 45 * 60 * 1000)
          endDateTime = endDateObj.toISOString()
        } catch (_) {
          endDateTime = startDateTime
        }

        const requestId = 'meet_' + task.id + '_' + Date.now()

        const eventPayload = {
          summary: eventSummary,
          description:
            task.getString('descricao') || 'Reunião agendada pelo Teixeira & Nascimento CRM',
          start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/Sao_Paulo',
          },
          attendees: attendees,
          conferenceData: {
            createRequest: {
              requestId: requestId,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        }

        const calendarId = 'primary'
        try {
          const calRes = $http.send({
            url:
              'https://www.googleapis.com/calendar/v3/calendars/' +
              encodeURIComponent(calendarId) +
              '/events?conferenceDataVersion=1',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + accessToken.trim(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventPayload),
            timeout: 20,
          })

          if (calRes.statusCode >= 200 && calRes.statusCode < 300) {
            const calJson = calRes.json || {}
            let generatedMeetLink = ''

            if (calJson.conferenceData && calJson.conferenceData.entryPoints) {
              for (let ep = 0; ep < calJson.conferenceData.entryPoints.length; ep++) {
                const entry = calJson.conferenceData.entryPoints[ep]
                if (entry.entryPointType === 'video' && entry.uri) {
                  generatedMeetLink = entry.uri
                  break
                }
              }
            }

            if (!generatedMeetLink && calJson.hangoutLink) {
              generatedMeetLink = calJson.hangoutLink
            }

            if (generatedMeetLink) {
              task.set('meet_link', generatedMeetLink)
              console.log('[Google Meet Hook] Meet Link criado com sucesso:', generatedMeetLink)
            }
          } else {
            const errJson = calRes.json || {}
            const errMsg = errJson.error
              ? errJson.error.message || JSON.stringify(errJson.error)
              : 'HTTP ' + calRes.statusCode
            console.warn('[Google Meet Hook] Falha ao criar evento no Calendar:', errMsg)
            if (configRec) {
              try {
                configRec.set('error_message', errMsg)
                $app.save(configRec)
              } catch (_) {}
            }
          }
        } catch (calErr) {
          console.warn('[Google Meet Hook] Erro de conexão com Google Calendar:', calErr)
          if (configRec) {
            try {
              configRec.set(
                'error_message',
                'Falha de conexão com Google Calendar: ' + (calErr.message || String(calErr)),
              )
              $app.save(configRec)
            } catch (_) {}
          }
        }
      }
    }

    return e.next()
  } catch (outerErr) {
    console.error('[Google Meet onRecordCreate] Erro:', outerErr)
    return e.next()
  }
}, 'tasks')

// Hook onRecordUpdate em tasks: se alterou para reunião ou se não tinha meet_link
onRecordUpdate((e) => {
  try {
    const task = e.record
    if (!task) return e.next()

    const tipo = task.getString('tipo')
    let meetLink = task.getString('meet_link')

    if (tipo === 'reuniao' && !meetLink) {
      const tenantId = task.getString('tenant_id')
      let accessToken = ''
      let configRec = null

      try {
        const list = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = {:tid} && provider = "google_meet"',
          '-created',
          1,
          0,
          { tid: tenantId },
        )
        if (list && list.length > 0) {
          configRec = list[0]
        }
      } catch (err) {
        console.log('[Google Meet Update] Erro ao buscar config:', err)
      }

      if (!configRec) {
        try {
          const globalList = $app.findRecordsByFilter(
            'integration_configs',
            'provider = "google_meet" && is_active = true',
            '-created',
            1,
            0,
          )
          if (globalList && globalList.length > 0) {
            configRec = globalList[0]
          }
        } catch (_) {}
      }

      if (configRec) {
        const cfg = configRec.get('config_json') || configRec.get('config') || {}
        const directToken = (
          configRec.getString('api_token') ||
          configRec.getString('api_key') ||
          cfg.access_token ||
          cfg.api_token ||
          ''
        ).trim()

        const clientId = (
          cfg.client_id ||
          cfg.clientId ||
          $os.getenv('GOOGLE_CLIENT_ID') ||
          ''
        ).trim()
        const clientSecret = (
          cfg.client_secret ||
          cfg.clientSecret ||
          $os.getenv('GOOGLE_CLIENT_SECRET') ||
          ''
        ).trim()
        const refreshToken = (
          cfg.refresh_token ||
          cfg.refreshToken ||
          $os.getenv('GOOGLE_REFRESH_TOKEN') ||
          ''
        ).trim()

        if (refreshToken && clientId && clientSecret) {
          try {
            const postBody =
              'client_id=' +
              encodeURIComponent(clientId) +
              '&client_secret=' +
              encodeURIComponent(clientSecret) +
              '&refresh_token=' +
              encodeURIComponent(refreshToken) +
              '&grant_type=refresh_token'

            const tokenRes = $http.send({
              url: 'https://oauth2.googleapis.com/token',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: postBody,
              timeout: 15,
            })

            if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
              const tokenJson = tokenRes.json || {}
              if (tokenJson.access_token) {
                accessToken = tokenJson.access_token
                const updatedCfg = Object.assign({}, cfg, {
                  access_token: accessToken,
                  token_refreshed_at: new Date().toISOString(),
                })
                configRec.set('api_token', accessToken)
                configRec.set('config_json', updatedCfg)
                configRec.set('config', updatedCfg)
                configRec.set('status', 'active')
                configRec.set('is_active', true)
                configRec.set('error_message', '')
                try {
                  $app.save(configRec)
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        if (!accessToken && directToken) {
          accessToken = directToken
        }
      }

      if (accessToken) {
        const leadId = task.getString('lead_id')
        const respId = task.getString('responsavel_id')
        const oppId = task.getString('oportunidade_id')

        let leadName = 'Lead'
        let respName = 'Consultor'
        let oppName = 'Oportunidade'
        let attendees = []

        if (leadId) {
          try {
            const leadRec = $app.findRecordById('leads', leadId)
            if (leadRec) {
              leadName = leadRec.getString('name') || leadName
              const lEmail = leadRec.getString('email')
              if (lEmail) attendees.push({ email: lEmail })
            }
          } catch (_) {}
        }

        if (respId) {
          try {
            const userRec = $app.findRecordById('users', respId)
            if (userRec) {
              respName = userRec.getString('name') || respName
              const uEmail = userRec.getString('email')
              if (uEmail) attendees.push({ email: uEmail })
            }
          } catch (_) {}
        }

        if (oppId) {
          try {
            const oppRec = $app.findRecordById('opportunities', oppId)
            if (oppRec) {
              oppName = oppRec.getString('title') || oppName
            }
          } catch (_) {}
        }

        const eventSummary =
          'REUNIÃO ' +
          leadName.toUpperCase() +
          ' CONSULTOR ' +
          respName.toUpperCase() +
          ' - ' +
          oppName.toUpperCase()

        const taskDate = task.getString('data') || new Date().toISOString().slice(0, 10)
        const taskTime = task.getString('horario') || '10:00'
        const startDateTime = taskDate.slice(0, 10) + 'T' + taskTime.slice(0, 5) + ':00'

        let endDateTime = ''
        try {
          const startDateObj = new Date(startDateTime)
          const endDateObj = new Date(startDateObj.getTime() + 45 * 60 * 1000)
          endDateTime = endDateObj.toISOString()
        } catch (_) {
          endDateTime = startDateTime
        }

        const requestId = 'meet_upd_' + task.id + '_' + Date.now()

        const eventPayload = {
          summary: eventSummary,
          description:
            task.getString('descricao') || 'Reunião agendada pelo Teixeira & Nascimento CRM',
          start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/Sao_Paulo',
          },
          attendees: attendees,
          conferenceData: {
            createRequest: {
              requestId: requestId,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        }

        const calendarId = 'primary'
        try {
          const calRes = $http.send({
            url:
              'https://www.googleapis.com/calendar/v3/calendars/' +
              encodeURIComponent(calendarId) +
              '/events?conferenceDataVersion=1',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + accessToken.trim(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventPayload),
            timeout: 20,
          })

          if (calRes.statusCode >= 200 && calRes.statusCode < 300) {
            const calJson = calRes.json || {}
            let generatedMeetLink = ''

            if (calJson.conferenceData && calJson.conferenceData.entryPoints) {
              for (let ep = 0; ep < calJson.conferenceData.entryPoints.length; ep++) {
                const entry = calJson.conferenceData.entryPoints[ep]
                if (entry.entryPointType === 'video' && entry.uri) {
                  generatedMeetLink = entry.uri
                  break
                }
              }
            }

            if (!generatedMeetLink && calJson.hangoutLink) {
              generatedMeetLink = calJson.hangoutLink
            }

            if (generatedMeetLink) {
              task.set('meet_link', generatedMeetLink)
              console.log('[Google Meet Hook Update] Meet Link criado:', generatedMeetLink)
            }
          } else {
            const errJson = calRes.json || {}
            const errMsg = errJson.error
              ? errJson.error.message || JSON.stringify(errJson.error)
              : 'HTTP ' + calRes.statusCode
            console.warn('[Google Meet Hook Update] Falha ao criar evento no Calendar:', errMsg)
            if (configRec) {
              try {
                configRec.set('error_message', errMsg)
                $app.save(configRec)
              } catch (_) {}
            }
          }
        } catch (calErr) {
          console.warn('[Google Meet Hook Update] Erro:', calErr)
          if (configRec) {
            try {
              configRec.set(
                'error_message',
                'Falha de conexão com Google Calendar: ' + (calErr.message || String(calErr)),
              )
              $app.save(configRec)
            } catch (_) {}
          }
        }
      }
    }

    return e.next()
  } catch (err) {
    console.error('[Google Meet onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'tasks')

// Lifecycle hook: Validação ao criar integração Google Meet no integration_configs
onRecordCreate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'google_meet') return e.next()

    let apiKey = (record.getString('api_token') || record.getString('api_key') || '').trim()
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!apiKey && cfg.api_token) apiKey = String(cfg.api_token).trim()
    if (!apiKey && cfg.api_key) apiKey = String(cfg.api_key).trim()
    if (!apiKey && cfg.apiKey) apiKey = String(cfg.apiKey).trim()
    if (!apiKey && cfg.token) apiKey = String(cfg.token).trim()

    // Validação estrita: Calendar API exige OAuth 2, não API Key
    if (apiKey.startsWith('AIza')) {
      record.set('status', 'error')
      record.set('is_active', false)
      record.set(
        'error_message',
        'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      )
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'google_meet',
        error_message:
          'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
      return e.next()
    }

    if (apiKey && !record.getString('api_token')) {
      record.set('api_token', apiKey)
    }

    const refreshToken = (cfg.refresh_token || cfg.refreshToken || '').trim()
    if (refreshToken.startsWith('AIza')) {
      record.set('status', 'error')
      record.set('is_active', false)
      record.set(
        'error_message',
        'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      )
      return e.next()
    }

    if (!apiKey && !refreshToken) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      record.set('error_message', '')
      return e.next()
    }

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').trim()

    if (refreshToken) {
      const clientId = (
        cfg.client_id ||
        cfg.clientId ||
        $os.getenv('GOOGLE_CLIENT_ID') ||
        ''
      ).trim()
      const clientSecret = (
        cfg.client_secret ||
        cfg.clientSecret ||
        $os.getenv('GOOGLE_CLIENT_SECRET') ||
        ''
      ).trim()

      if (clientId && clientSecret) {
        try {
          const postBody =
            'client_id=' +
            encodeURIComponent(clientId) +
            '&client_secret=' +
            encodeURIComponent(clientSecret) +
            '&refresh_token=' +
            encodeURIComponent(refreshToken) +
            '&grant_type=refresh_token'

          const tokenRes = $http.send({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: postBody,
            timeout: 15,
          })

          if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
            const tokenJson = tokenRes.json || {}
            record.set('status', 'active')
            record.set('is_active', true)
            record.set('error_message', '')
            if (tokenJson.access_token) {
              record.set('api_token', tokenJson.access_token)
            }
            const updatedCfg = Object.assign({}, cfg, {
              provider: 'google_meet',
              calendar_id: calendarId,
              last_validated: new Date().toISOString(),
              error_message: '',
            })
            record.set('config_json', updatedCfg)
            record.set('config', updatedCfg)
            return e.next()
          } else {
            const errJson = tokenRes.json || {}
            const errMsg =
              errJson.error_description || errJson.error || 'Erro OAuth HTTP ' + tokenRes.statusCode
            record.set('status', 'error')
            record.set('is_active', false)
            record.set('error_message', errMsg)
            return e.next()
          }
        } catch (httpErr) {
          record.set('status', 'error')
          record.set('is_active', false)
          record.set(
            'error_message',
            'Falha de conexão com Google OAuth: ' + (httpErr.message || String(httpErr)),
          )
          return e.next()
        }
      }
    }

    if (apiKey.startsWith('ya29.')) {
      try {
        const testRes = $http.send({
          url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + apiKey,
          method: 'GET',
          timeout: 10,
        })
        if (testRes.statusCode >= 400) {
          let errDetail =
            'Token OAuth do Google inválido ou expirado (HTTP ' + testRes.statusCode + ')'
          record.set('status', 'error')
          record.set('is_active', false)
          record.set('error_message', errDetail)
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            error_message: errDetail,
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
    record.set('error_message', '')
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

    let apiKey = (record.getString('api_token') || record.getString('api_key') || '').trim()
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!apiKey && cfg.api_token) apiKey = String(cfg.api_token).trim()
    if (!apiKey && cfg.api_key) apiKey = String(cfg.api_key).trim()
    if (!apiKey && cfg.apiKey) apiKey = String(cfg.apiKey).trim()
    if (!apiKey && cfg.token) apiKey = String(cfg.token).trim()

    // Validação estrita: Calendar API exige OAuth 2, não API Key
    if (apiKey.startsWith('AIza')) {
      record.set('status', 'error')
      record.set('is_active', false)
      record.set(
        'error_message',
        'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      )
      const updatedCfg = Object.assign({}, cfg, {
        provider: 'google_meet',
        error_message:
          'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      })
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
      return e.next()
    }

    if (apiKey && !record.getString('api_token')) {
      record.set('api_token', apiKey)
    }

    const refreshToken = (cfg.refresh_token || cfg.refreshToken || '').trim()
    if (refreshToken.startsWith('AIza')) {
      record.set('status', 'error')
      record.set('is_active', false)
      record.set(
        'error_message',
        'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
      )
      return e.next()
    }

    if (!apiKey && !refreshToken) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      record.set('error_message', '')
      return e.next()
    }

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').trim()

    if (refreshToken) {
      const clientId = (
        cfg.client_id ||
        cfg.clientId ||
        $os.getenv('GOOGLE_CLIENT_ID') ||
        ''
      ).trim()
      const clientSecret = (
        cfg.client_secret ||
        cfg.clientSecret ||
        $os.getenv('GOOGLE_CLIENT_SECRET') ||
        ''
      ).trim()

      if (clientId && clientSecret) {
        try {
          const postBody =
            'client_id=' +
            encodeURIComponent(clientId) +
            '&client_secret=' +
            encodeURIComponent(clientSecret) +
            '&refresh_token=' +
            encodeURIComponent(refreshToken) +
            '&grant_type=refresh_token'

          const tokenRes = $http.send({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: postBody,
            timeout: 15,
          })

          if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
            const tokenJson = tokenRes.json || {}
            record.set('status', 'active')
            record.set('is_active', true)
            record.set('error_message', '')
            if (tokenJson.access_token) {
              record.set('api_token', tokenJson.access_token)
            }
            const updatedCfg = Object.assign({}, cfg, {
              provider: 'google_meet',
              calendar_id: calendarId,
              last_validated: new Date().toISOString(),
              error_message: '',
              test_requested: false,
            })
            record.set('config_json', updatedCfg)
            record.set('config', updatedCfg)
            return e.next()
          } else {
            const errJson = tokenRes.json || {}
            const errMsg =
              errJson.error_description || errJson.error || 'Erro OAuth HTTP ' + tokenRes.statusCode
            record.set('status', 'error')
            record.set('is_active', false)
            record.set('error_message', errMsg)
            return e.next()
          }
        } catch (httpErr) {
          record.set('status', 'error')
          record.set('is_active', false)
          record.set(
            'error_message',
            'Falha de conexão com Google OAuth: ' + (httpErr.message || String(httpErr)),
          )
          return e.next()
        }
      }
    }

    if (apiKey.startsWith('ya29.')) {
      try {
        const testRes = $http.send({
          url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + apiKey,
          method: 'GET',
          timeout: 10,
        })
        if (testRes.statusCode >= 400) {
          let errDetail =
            'Token OAuth do Google inválido ou expirado (HTTP ' + testRes.statusCode + ')'
          record.set('status', 'error')
          record.set('is_active', false)
          record.set('error_message', errDetail)
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            error_message: errDetail,
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
    record.set('error_message', '')
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
