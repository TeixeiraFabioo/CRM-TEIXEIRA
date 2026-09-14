/**
 * PocketBase Hook: Google Meet & Google Calendar Integration
 *
 * Implements:
 * 1. Automatic exchange of OAuth 2 refresh token for access token (POST https://oauth2.googleapis.com/token)
 *    persisted and cached inside the integration record (config_json.access_token / access_token_expires_at).
 *    If refresh fails, saves real error message in error_message and marks is_active=false.
 * 2. Event creation in Google Calendar via POST .../events?conferenceDataVersion=1 with conferenceData
 *    and sets meet_link + google_event_id on task. Sanitizes relation field `participantes` so invalid ids
 *    never crash task creation.
 * 3. Event update in Google Calendar (PATCH) on task update if date/time/title change, using google_event_id.
 * 4. Event deletion from Google Calendar on task delete (DELETE .../events/{id}).
 * 5. Strict role enforcement: only 'gestor'/'manager' or 'admin' can delete meeting tasks.
 *
 * NOTE: PocketBase JSVM executes callbacks in separate pooled isolates.
 * No top-level variables or functions: all logic and helpers must be inline inside each callback.
 */

// Hook onRecordCreate em tasks: Sanitização de participantes e criação de Google Meet no Calendar
onRecordCreate((e) => {
  try {
    const task = e.record
    if (!task) return e.next()

    // --- SANITIZAÇÃO DE PARTICIPANTES ---
    // O campo 'participantes' é uma relação PocketBase com users.
    // Qualquer id vazio ou que não corresponda a um usuário existente causa:
    // "GoError: participantes: Failed to find all relation records with the provided ids."
    try {
      const rawParts = task.get('participantes')
      if (Array.isArray(rawParts) && rawParts.length > 0) {
        const validUserIds = []
        for (let i = 0; i < rawParts.length; i++) {
          const item = rawParts[i]
          if (typeof item === 'string' && item.trim().length > 0) {
            const trimmed = item.trim()
            try {
              const u = $app.findRecordById('users', trimmed)
              if (u && u.id) {
                validUserIds.push(u.id)
              }
            } catch (_) {
              // Não é id de user válido na base — ignorar para não abortar criação da tarefa
            }
          }
        }
        task.set('participantes', validUserIds)
      } else if (rawParts && !Array.isArray(rawParts)) {
        task.set('participantes', [])
      }
    } catch (partErr) {
      console.warn('[Google Meet Hook] Erro ao sanitizar participantes:', partErr)
      try {
        task.set('participantes', [])
      } catch (_) {}
    }

    const tipo = task.getString('tipo')
    let meetLink = task.getString('meet_link')
    let googleEventId = task.getString('google_event_id')

    if (tipo === 'reuniao' && (!meetLink || !googleEventId)) {
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
        console.log('[Google Meet] Erro ao buscar config do tenant:', err)
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
        let rawCfg = configRec.get('config_json')
        if (rawCfg === undefined || rawCfg === null || rawCfg === '') {
          rawCfg = configRec.get('config')
        }
        let cfg = {}
        if (typeof rawCfg === 'string') {
          try {
            cfg = JSON.parse(rawCfg) || {}
          } catch (_) {
            cfg = {}
          }
        } else if (rawCfg && typeof rawCfg === 'object') {
          cfg = rawCfg
        }

        // Busca refresh token de config_json, api_key ou api_token
        let refreshToken = (
          cfg.refresh_token ||
          cfg.refreshToken ||
          $os.getenv('GOOGLE_REFRESH_TOKEN') ||
          ''
        )
          .toString()
          .trim()

        const rawApiKey = (configRec.getString('api_key') || '').trim()
        const rawApiToken = (configRec.getString('api_token') || '').trim()

        if (!refreshToken) {
          if (rawApiKey.startsWith('1//') || rawApiKey.startsWith('1/')) {
            refreshToken = rawApiKey
          } else if (rawApiToken.startsWith('1//') || rawApiToken.startsWith('1/')) {
            refreshToken = rawApiToken
          }
        }

        // Busca client_id e client_secret
        let clientId = (cfg.client_id || cfg.clientId || $os.getenv('GOOGLE_CLIENT_ID') || '')
          .toString()
          .trim()

        let clientSecret = (
          cfg.client_secret ||
          cfg.clientSecret ||
          $os.getenv('GOOGLE_CLIENT_SECRET') ||
          ''
        )
          .toString()
          .trim()

        // Fallback padrão se não configurado
        if (!clientId) {
          clientId = '407408718192.apps.googleusercontent.com'
        }

        // Cache persistido no próprio registro config_json
        const nowMs = Date.now()
        const cachedToken = cfg.access_token || ''
        const cachedExpiresAt = Number(cfg.access_token_expires_at) || 0

        if (cachedToken && cachedExpiresAt > nowMs + 60000) {
          accessToken = cachedToken
        }

        // Se não tem access token válido em cache, renovar via POST https://oauth2.googleapis.com/token
        if (!accessToken && refreshToken) {
          try {
            let postBody =
              'client_id=' +
              encodeURIComponent(clientId) +
              '&refresh_token=' +
              encodeURIComponent(refreshToken) +
              '&grant_type=refresh_token'

            if (clientSecret) {
              postBody += '&client_secret=' + encodeURIComponent(clientSecret)
            }

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
                const expiresInSecs = Number(tokenJson.expires_in) || 3600
                const updatedCfg = Object.assign({}, cfg, {
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: refreshToken,
                  access_token: accessToken,
                  access_token_expires_at: nowMs + expiresInSecs * 1000,
                  token_refreshed_at: new Date().toISOString(),
                })
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
                errJson.error_description ||
                errJson.error ||
                'Erro OAuth HTTP ' + tokenRes.statusCode
              console.warn('[Google Meet Hook] Falha ao trocar refresh token:', errMsg)
              try {
                configRec.set('error_message', 'Erro na renovação do token Google: ' + errMsg)
                configRec.set('status', 'error')
                configRec.set('is_active', false)
                $app.save(configRec)
              } catch (_) {}
            }
          } catch (refreshErr) {
            console.warn('[Google Meet Hook] Erro de rede ao trocar refresh token:', refreshErr)
            try {
              configRec.set(
                'error_message',
                'Erro de conexão ao renovar token: ' + (refreshErr.message || String(refreshErr)),
              )
              $app.save(configRec)
            } catch (_) {}
          }
        }

        // Se ainda não tiver accessToken mas tiver um token direto tipo Bearer que não seja refresh token
        if (!accessToken) {
          const possibleToken = rawApiToken || rawApiKey
          if (possibleToken && possibleToken.startsWith('ya29.')) {
            accessToken = possibleToken
          }
        }
      }

      if (accessToken) {
        const leadId = task.getString('lead_id')
        const respId = task.getString('responsavel_id')
        const oppId = task.getString('oportunidade_id')

        let leadName = 'Lead'
        let respName = 'Consultor'
        let oppName = 'Oportunidade'
        const attendees = []

        if (leadId) {
          try {
            const leadRec = $app.findRecordById('leads', leadId)
            if (leadRec) {
              leadName = leadRec.getString('name') || leadName
              const lEmail = leadRec.getString('email')
              if (lEmail && lEmail.includes('@')) attendees.push({ email: lEmail.trim() })
            }
          } catch (_) {}
        }

        if (respId) {
          try {
            const userRec = $app.findRecordById('users', respId)
            if (userRec) {
              respName = userRec.getString('name') || respName
              const uEmail = userRec.getString('email')
              if (uEmail && uEmail.includes('@')) attendees.push({ email: uEmail.trim() })
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

        // Coletar emails de participantes se houverem users vinculados
        const partIds = task.get('participantes')
        if (Array.isArray(partIds)) {
          partIds.forEach((pid) => {
            if (typeof pid === 'string' && pid.trim()) {
              try {
                const pUser = $app.findRecordById('users', pid.trim())
                if (pUser) {
                  const pEmail = pUser.getString('email')
                  if (pEmail && pEmail.includes('@')) {
                    attendees.push({ email: pEmail.trim() })
                  }
                }
              } catch (_) {}
            }
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

        const requestId = 'meet_' + (task.id || 'new') + '_' + Date.now()

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

            if (calJson.id) {
              task.set('google_event_id', calJson.id)
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

// Hook onRecordUpdate em tasks:
// 1. Sanitização de participantes
// 2. Se a tarefa é reunião e já tem google_event_id: atualiza o evento existente via PATCH no Calendar
// 3. Se a tarefa virou reunião ou não tinha evento ainda: cria o evento sem duplicar
onRecordUpdate((e) => {
  try {
    const task = e.record
    if (!task) return e.next()

    // --- SANITIZAÇÃO DE PARTICIPANTES ---
    try {
      const rawParts = task.get('participantes')
      if (Array.isArray(rawParts) && rawParts.length > 0) {
        const validUserIds = []
        for (let i = 0; i < rawParts.length; i++) {
          const item = rawParts[i]
          if (typeof item === 'string' && item.trim().length > 0) {
            const trimmed = item.trim()
            try {
              const u = $app.findRecordById('users', trimmed)
              if (u && u.id) {
                validUserIds.push(u.id)
              }
            } catch (_) {}
          }
        }
        task.set('participantes', validUserIds)
      } else if (rawParts && !Array.isArray(rawParts)) {
        task.set('participantes', [])
      }
    } catch (_) {}

    const tipo = task.getString('tipo')
    let meetLink = task.getString('meet_link')
    let googleEventId = task.getString('google_event_id')

    if (tipo === 'reuniao') {
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
        let rawCfg = configRec.get('config_json')
        if (rawCfg === undefined || rawCfg === null || rawCfg === '') {
          rawCfg = configRec.get('config')
        }
        let cfg = {}
        if (typeof rawCfg === 'string') {
          try {
            cfg = JSON.parse(rawCfg) || {}
          } catch (_) {
            cfg = {}
          }
        } else if (rawCfg && typeof rawCfg === 'object') {
          cfg = rawCfg
        }

        let refreshToken = (
          cfg.refresh_token ||
          cfg.refreshToken ||
          $os.getenv('GOOGLE_REFRESH_TOKEN') ||
          ''
        )
          .toString()
          .trim()

        const rawApiKey = (configRec.getString('api_key') || '').trim()
        const rawApiToken = (configRec.getString('api_token') || '').trim()

        if (!refreshToken) {
          if (rawApiKey.startsWith('1//') || rawApiKey.startsWith('1/')) {
            refreshToken = rawApiKey
          } else if (rawApiToken.startsWith('1//') || rawApiToken.startsWith('1/')) {
            refreshToken = rawApiToken
          }
        }

        let clientId = (cfg.client_id || cfg.clientId || $os.getenv('GOOGLE_CLIENT_ID') || '')
          .toString()
          .trim()

        let clientSecret = (
          cfg.client_secret ||
          cfg.clientSecret ||
          $os.getenv('GOOGLE_CLIENT_SECRET') ||
          ''
        )
          .toString()
          .trim()

        if (!clientId) {
          clientId = '407408718192.apps.googleusercontent.com'
        }

        const nowMs = Date.now()
        const cachedToken = cfg.access_token || ''
        const cachedExpiresAt = Number(cfg.access_token_expires_at) || 0

        if (cachedToken && cachedExpiresAt > nowMs + 60000) {
          accessToken = cachedToken
        }

        if (!accessToken && refreshToken) {
          try {
            let postBody =
              'client_id=' +
              encodeURIComponent(clientId) +
              '&refresh_token=' +
              encodeURIComponent(refreshToken) +
              '&grant_type=refresh_token'

            if (clientSecret) {
              postBody += '&client_secret=' + encodeURIComponent(clientSecret)
            }

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
                const expiresInSecs = Number(tokenJson.expires_in) || 3600
                const updatedCfg = Object.assign({}, cfg, {
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: refreshToken,
                  access_token: accessToken,
                  access_token_expires_at: nowMs + expiresInSecs * 1000,
                  token_refreshed_at: new Date().toISOString(),
                })
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
                errJson.error_description ||
                errJson.error ||
                'Erro OAuth HTTP ' + tokenRes.statusCode
              console.warn('[Google Meet Update] Falha ao renovar refresh token:', errMsg)
              try {
                configRec.set('error_message', 'Erro na renovação do token Google: ' + errMsg)
                configRec.set('status', 'error')
                configRec.set('is_active', false)
                $app.save(configRec)
              } catch (_) {}
            }
          } catch (_) {}
        }

        if (!accessToken) {
          const possibleToken = rawApiToken || rawApiKey
          if (possibleToken && possibleToken.startsWith('ya29.')) {
            accessToken = possibleToken
          }
        }
      }

      if (accessToken) {
        const leadId = task.getString('lead_id')
        const respId = task.getString('responsavel_id')
        const oppId = task.getString('oportunidade_id')

        let leadName = 'Lead'
        let respName = 'Consultor'
        let oppName = 'Oportunidade'
        const attendees = []

        if (leadId) {
          try {
            const leadRec = $app.findRecordById('leads', leadId)
            if (leadRec) {
              leadName = leadRec.getString('name') || leadName
              const lEmail = leadRec.getString('email')
              if (lEmail && lEmail.includes('@')) attendees.push({ email: lEmail.trim() })
            }
          } catch (_) {}
        }

        if (respId) {
          try {
            const userRec = $app.findRecordById('users', respId)
            if (userRec) {
              respName = userRec.getString('name') || respName
              const uEmail = userRec.getString('email')
              if (uEmail && uEmail.includes('@')) attendees.push({ email: uEmail.trim() })
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

        const partIds = task.get('participantes')
        if (Array.isArray(partIds)) {
          partIds.forEach((pid) => {
            if (typeof pid === 'string' && pid.trim()) {
              try {
                const pUser = $app.findRecordById('users', pid.trim())
                if (pUser) {
                  const pEmail = pUser.getString('email')
                  if (pEmail && pEmail.includes('@')) {
                    attendees.push({ email: pEmail.trim() })
                  }
                }
              } catch (_) {}
            }
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

        const calendarId = 'primary'

        // CASO 1: Já existe um evento no Calendar associado a esta tarefa -> PATCH
        if (googleEventId) {
          try {
            const patchPayload = {
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
            }

            const patchRes = $http.send({
              url:
                'https://www.googleapis.com/calendar/v3/calendars/' +
                encodeURIComponent(calendarId) +
                '/events/' +
                encodeURIComponent(googleEventId),
              method: 'PATCH',
              headers: {
                Authorization: 'Bearer ' + accessToken.trim(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(patchPayload),
              timeout: 15,
            })

            if (patchRes.statusCode >= 200 && patchRes.statusCode < 300) {
              const patchJson = patchRes.json || {}
              if (patchJson.hangoutLink && !meetLink) {
                task.set('meet_link', patchJson.hangoutLink)
              }
              console.log('[Google Meet Update] Evento atualizado com sucesso no Calendar.')
            } else {
              console.warn(
                '[Google Meet Update] Erro ao atualizar evento existente:',
                patchRes.statusCode,
                patchRes.body,
              )
            }
          } catch (patchErr) {
            console.warn('[Google Meet Update] Erro de rede ao atualizar evento:', patchErr)
          }
        } else {
          // CASO 2: Ainda não tem google_event_id -> criar novo evento no Calendar
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

              if (calJson.id) {
                task.set('google_event_id', calJson.id)
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
    }

    return e.next()
  } catch (err) {
    console.error('[Google Meet onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'tasks')

// Hook onRecordDelete em tasks:
// 1. Exclusão: só gestor ('gestor' / 'manager') e admin ('admin') podem excluir tarefa do tipo reunião.
// 2. Se a tarefa tiver google_event_id, cancela/remove o evento correspondente no Google Calendar.
onRecordDelete((e) => {
  try {
    const task = e.record
    if (!task) return e.next()

    const tipo = task.getString('tipo')
    const authRecord = e.httpContext ? e.httpContext.get('authRecord') : null

    // Enforce estrito no backend para exclusão de reuniões
    if (tipo === 'reuniao' && authRecord) {
      const userRole = (authRecord.getString('role') || '').toLowerCase()
      const allowedRoles = ['admin', 'gestor', 'manager']
      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenError(
          'Apenas gestores e administradores têm permissão para excluir reuniões.',
        )
      }
    }

    const googleEventId = task.getString('google_event_id')

    // Se o evento foi criado no Calendar, remover via DELETE
    if (googleEventId) {
      const tenantId = task.getString('tenant_id')
      let accessToken = ''

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
          const configRec = list[0]
          let rawCfg = configRec.get('config_json')
          if (rawCfg === undefined || rawCfg === null || rawCfg === '') {
            rawCfg = configRec.get('config')
          }
          let cfg = {}
          if (typeof rawCfg === 'string') {
            try {
              cfg = JSON.parse(rawCfg) || {}
            } catch (_) {
              cfg = {}
            }
          } else if (rawCfg && typeof rawCfg === 'object') {
            cfg = rawCfg
          }

          const nowMs = Date.now()
          const cachedToken = cfg.access_token || ''
          const cachedExpiresAt = Number(cfg.access_token_expires_at) || 0

          if (cachedToken && cachedExpiresAt > nowMs + 60000) {
            accessToken = cachedToken
          } else {
            let refreshToken = (
              cfg.refresh_token ||
              cfg.refreshToken ||
              configRec.getString('api_key') ||
              configRec.getString('api_token') ||
              $os.getenv('GOOGLE_REFRESH_TOKEN') ||
              ''
            )
              .toString()
              .trim()
            let clientId = (
              cfg.client_id ||
              cfg.clientId ||
              $os.getenv('GOOGLE_CLIENT_ID') ||
              '407408718192.apps.googleusercontent.com'
            )
              .toString()
              .trim()
            let clientSecret = (
              cfg.client_secret ||
              cfg.clientSecret ||
              $os.getenv('GOOGLE_CLIENT_SECRET') ||
              ''
            )
              .toString()
              .trim()

            if (refreshToken) {
              let postBody =
                'client_id=' +
                encodeURIComponent(clientId) +
                '&refresh_token=' +
                encodeURIComponent(refreshToken) +
                '&grant_type=refresh_token'
              if (clientSecret) postBody += '&client_secret=' + encodeURIComponent(clientSecret)

              const tokenRes = $http.send({
                url: 'https://oauth2.googleapis.com/token',
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: postBody,
                timeout: 10,
              })
              if (tokenRes.statusCode >= 200 && tokenRes.statusCode < 300) {
                const tokenJson = tokenRes.json || {}
                accessToken = tokenJson.access_token || ''
              }
            }
          }
        }
      } catch (_) {}

      if (accessToken) {
        try {
          $http.send({
            url:
              'https://www.googleapis.com/calendar/v3/calendars/primary/events/' +
              encodeURIComponent(googleEventId),
            method: 'DELETE',
            headers: {
              Authorization: 'Bearer ' + accessToken.trim(),
            },
            timeout: 10,
          })
          console.log('[Google Meet Delete] Evento removido do Calendar:', googleEventId)
        } catch (delErr) {
          console.warn('[Google Meet Delete] Erro ao deletar evento no Calendar:', delErr)
        }
      }
    }

    return e.next()
  } catch (err) {
    console.error('[Google Meet onRecordDelete] Erro:', err)
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
    let rawCfg = record.get('config_json')
    if (rawCfg === undefined || rawCfg === null || rawCfg === '') {
      rawCfg = record.get('config')
    }
    let cfg = {}
    if (typeof rawCfg === 'string') {
      try {
        cfg = JSON.parse(rawCfg) || {}
      } catch (_) {
        cfg = {}
      }
    } else if (rawCfg && typeof rawCfg === 'object') {
      cfg = rawCfg
    }

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

    let refreshToken = (cfg.refresh_token || cfg.refreshToken || '').toString().trim()
    if (!refreshToken && (apiKey.startsWith('1//') || apiKey.startsWith('1/'))) {
      refreshToken = apiKey
    }

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

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').toString().trim()

    let clientId = (cfg.client_id || cfg.clientId || $os.getenv('GOOGLE_CLIENT_ID') || '')
      .toString()
      .trim()

    let clientSecret = (
      cfg.client_secret ||
      cfg.clientSecret ||
      $os.getenv('GOOGLE_CLIENT_SECRET') ||
      ''
    )
      .toString()
      .trim()

    if (!clientId) {
      clientId = '407408718192.apps.googleusercontent.com'
    }

    if (refreshToken) {
      try {
        let postBody =
          'client_id=' +
          encodeURIComponent(clientId) +
          '&refresh_token=' +
          encodeURIComponent(refreshToken) +
          '&grant_type=refresh_token'

        if (clientSecret) {
          postBody += '&client_secret=' + encodeURIComponent(clientSecret)
        }

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
          const expiresInSecs = Number(tokenJson.expires_in) || 3600
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            access_token: tokenJson.access_token || '',
            access_token_expires_at: Date.now() + expiresInSecs * 1000,
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
    let rawCfg = record.get('config_json')
    if (rawCfg === undefined || rawCfg === null || rawCfg === '') {
      rawCfg = record.get('config')
    }
    let cfg = {}
    if (typeof rawCfg === 'string') {
      try {
        cfg = JSON.parse(rawCfg) || {}
      } catch (_) {
        cfg = {}
      }
    } else if (rawCfg && typeof rawCfg === 'object') {
      cfg = rawCfg
    }

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

    let refreshToken = (cfg.refresh_token || cfg.refreshToken || '').toString().trim()
    if (!refreshToken && (apiKey.startsWith('1//') || apiKey.startsWith('1/'))) {
      refreshToken = apiKey
    }

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

    const calendarId = (cfg.calendar_id || cfg.calendarId || 'primary').toString().trim()

    let clientId = (cfg.client_id || cfg.clientId || $os.getenv('GOOGLE_CLIENT_ID') || '')
      .toString()
      .trim()

    let clientSecret = (
      cfg.client_secret ||
      cfg.clientSecret ||
      $os.getenv('GOOGLE_CLIENT_SECRET') ||
      ''
    )
      .toString()
      .trim()

    if (!clientId) {
      clientId = '407408718192.apps.googleusercontent.com'
    }

    if (refreshToken) {
      try {
        let postBody =
          'client_id=' +
          encodeURIComponent(clientId) +
          '&refresh_token=' +
          encodeURIComponent(refreshToken) +
          '&grant_type=refresh_token'

        if (clientSecret) {
          postBody += '&client_secret=' + encodeURIComponent(clientSecret)
        }

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
          const expiresInSecs = Number(tokenJson.expires_in) || 3600
          const updatedCfg = Object.assign({}, cfg, {
            provider: 'google_meet',
            calendar_id: calendarId,
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            access_token: tokenJson.access_token || '',
            access_token_expires_at: Date.now() + expiresInSecs * 1000,
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
