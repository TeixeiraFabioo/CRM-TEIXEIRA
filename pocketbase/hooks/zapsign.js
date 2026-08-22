/**
 * PocketBase Hook: ZapSign Electronic Signature Integration
 *
 * NOTA DE CONFIGURAÇÃO:
 * O token do ZapSign deve ser inserido pelo admin via Settings > Integrações (futuro).
 * Por enquanto, o backend consome o token da coleção `integration_configs` onde provider='zapsign'
 * (campo api_token ou config_json.api_token / config.api_token).
 *
 * Funcionalidades implementadas:
 * 1. Hook onRecordAfterUpdateSuccess na coleção 'contracts':
 *    - Quando sign_status for atualizado para 'sent' (ou se 'status' mudar para 'sent'/'enviado'),
 *      se ainda não houver sign_document_id criado, dispara createZapSignDocument automaticamente.
 *
 * 2. Endpoint webhook: POST /api/zapsign/webhook (e compatibilidade com /api/webhooks/zapsign):
 *    - Recebe evento de assinatura do ZapSign, valida assinatura/token.
 *    - Atualiza contract.sign_status e contract.sign_events.
 *    - Se status = "signed" (ou evento doc_signed / completed), atualiza também a oportunidade vinculada
 *      para a etapa "Ganho/Contratado" (status 'won', probabilidade 100%, estágio correspondente).
 *
 * 3. Endpoints auxiliares para integração direta do CRM:
 *    - POST /api/signatures/zapsign/create (criação manual/direta via API com auth)
 *    - GET /api/signatures/zapsign/status/{docId} (consulta de status com auth)
 *    - POST /api/signatures/test-connection (teste de conexão do token com auth)
 */

// --- 1. Hook de ciclo de vida em contracts: disparar ZapSign quando sign_status mudar para "sent" ---
onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    if (!record) return

    const newSignStatus = record.getString('sign_status')
    const oldSignStatus = record.original() ? record.original().getString('sign_status') : ''

    const newStatus = record.getString('status')
    const oldStatus = record.original() ? record.original().getString('status') : ''

    const isSentTrigger =
      (newSignStatus === 'sent' && oldSignStatus !== 'sent') ||
      (newStatus === 'sent' && oldStatus !== 'sent') ||
      (newStatus === 'enviado' && oldStatus !== 'enviado' && !newSignStatus)

    const alreadyHasDoc =
      record.getString('sign_document_id') ||
      record.getString('zapsign_doc_id') ||
      record.getString('external_id')

    // Só dispara se mudou para sent e ainda não gerou documento no ZapSign
    if (isSentTrigger && !alreadyHasDoc) {
      const tenantId = record.getString('tenant_id')
      if (!tenantId) {
        console.warn('[ZapSign Hook] Contrato sem tenant_id:', record.id)
        return
      }

      // 1. Buscar api_token na coleção integration_configs
      let apiToken = ''
      let isSandbox = false
      let customBaseUrl = ''

      try {
        const configs = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "zapsign"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          apiToken = cfgRec.getString('api_token')
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (!apiToken && cfgJson.api_token) apiToken = cfgJson.api_token
          if (cfgJson.sandbox !== undefined) isSandbox = !!cfgJson.sandbox
          if (cfgJson.api_url_base) customBaseUrl = cfgJson.api_url_base
        }
      } catch (errCfg) {
        console.warn(
          '[ZapSign Hook] Erro ao buscar integration_configs para tenant:',
          tenantId,
          errCfg,
        )
      }

      // Fallbacks para system_secrets ou env
      if (!apiToken) {
        try {
          const secretRec = $app.findFirstRecordByData('system_secrets', 'key', 'ZAPSIGN_API_TOKEN')
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            apiToken = secretRec.getString('value')
          }
        } catch (_) {}
      }

      if (!apiToken) {
        apiToken = $os.getenv('ZAPSIGN_API_TOKEN') || ''
      }

      if (!apiToken) {
        console.warn('[ZapSign Hook] Nenhum api_token ZapSign configurado para o tenant:', tenantId)
        return
      }

      // 2. Buscar dados do cliente ou lead vinculado ao contrato
      let signerName = 'Signatário Principal'
      let signerEmail = ''
      let signerPhone = ''
      let signerDocument = ''
      let signerRg = ''
      let signerAddress = ''
      let signerCity = ''
      let signerState = ''
      let signerEstadoCivil = ''

      const clienteId = record.getString('cliente_id')
      const oportunidadeId = record.getString('oportunidade_id')
      const propostaId = record.getString('proposta_id')
      let leadId = ''

      if (clienteId) {
        try {
          const cust = $app.findRecordById('customers', clienteId)
          if (cust) {
            signerName = cust.getString('name') || signerName
            signerEmail = cust.getString('email') || signerEmail
            signerPhone = cust.getString('phone') || cust.getString('whatsapp') || signerPhone
            signerDocument = cust.getString('document') || signerDocument
            signerRg = cust.getString('rg') || signerRg
            signerAddress = cust.getString('address') || signerAddress
            signerCity = cust.getString('city') || signerCity
            signerState = cust.getString('state') || signerState
            signerEstadoCivil = cust.getString('estado_civil') || signerEstadoCivil
          }
        } catch (_) {}
      }

      if (oportunidadeId && (!signerEmail || signerName === 'Signatário Principal')) {
        try {
          const opp = $app.findRecordById('opportunities', oportunidadeId)
          if (opp) {
            leadId = opp.getString('lead_id')
          }
        } catch (_) {}
      }

      if (propostaId && (!signerEmail || signerName === 'Signatário Principal')) {
        try {
          const prop = $app.findRecordById('proposals', propostaId)
          if (prop && !leadId) {
            leadId = prop.getString('lead_id')
          }
        } catch (_) {}
      }

      if (leadId && (!signerEmail || signerName === 'Signatário Principal')) {
        try {
          const lead = $app.findRecordById('leads', leadId)
          if (lead) {
            signerName = lead.getString('name') || signerName
            signerEmail = lead.getString('email') || signerEmail
            signerPhone = lead.getString('phone') || lead.getString('whatsapp') || signerPhone
          }
        } catch (_) {}
      }

      // 3. Montar payload do ZapSign
      const docTitle = record.getString('titulo') || 'Contrato Comercial - ' + signerName
      const signerObj = { name: signerName }
      if (signerEmail) {
        signerObj.email = signerEmail
        signerObj.send_automatic_email = true
      }
      if (signerPhone) {
        let cleanPhone = signerPhone.replace(/\D/g, '')
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }
        if (cleanPhone) signerObj.phone_country = '55'
        if (cleanPhone)
          signerObj.phone_number = cleanPhone.startsWith('55')
            ? cleanPhone.substring(2)
            : cleanPhone
        signerObj.send_automatic_whatsapp = true
      }

      let targetUrl = customBaseUrl
      if (!targetUrl) {
        targetUrl = isSandbox
          ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
          : 'https://api.zapsign.com.br/api/v1/docs/'
      }
      if (!targetUrl.endsWith('/')) targetUrl += '/'

      const zapsignPayload = {
        name: docTitle,
        signers: [signerObj],
        lang: 'pt-br',
        disable_signer_emails: false,
      }

      const docUrl = record.getString('documento_url')
      if (docUrl && (docUrl.startsWith('http://') || docUrl.startsWith('https://'))) {
        zapsignPayload.url_pdf = docUrl
      } else {
        const val = record.get('valor')
        zapsignPayload.markdown =
          '# ' +
          docTitle +
          '\n\n' +
          '**Contratante:** ' +
          signerName +
          '\n' +
          (signerEmail ? '**E-mail:** ' + signerEmail + '\n' : '') +
          (signerPhone ? '**Telefone/WhatsApp:** ' + signerPhone + '\n' : '') +
          (signerDocument ? '**CPF/CNPJ:** ' + signerDocument + '\n' : '') +
          (signerRg ? '**RG:** ' + signerRg + '\n' : '') +
          (signerAddress || signerCity || signerState
            ? '**Endereço:** ' +
              [signerAddress, signerCity, signerState].filter(Boolean).join(', ') +
              '\n'
            : '') +
          (signerEstadoCivil ? '**Estado Civil:** ' + signerEstadoCivil + '\n' : '') +
          (val
            ? '**Valor:** R$ ' +
              Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
              '\n'
            : '') +
          "\nDocumento emitido via Teixeira'sHub CRM."
      }

      // 4. Disparar chamada POST para API ZapSign via $http.send
      try {
        const apiRes = $http.send({
          url: targetUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiToken.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(zapsignPayload),
          timeout: 25,
        })

        if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
          const resJson = apiRes.json || {}
          const docId = resJson.token || resJson.id || resJson.doc_id || resJson.open_id || ''
          let signLink = resJson.sign_url || ''
          if (!signLink && resJson.signers && resJson.signers[0] && resJson.signers[0].sign_url) {
            signLink = resJson.signers[0].sign_url
          }

          const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

          // Atualizar o contrato com os dados retornados
          record.set('sign_provider', 'zapsign')
          record.set('sign_document_id', docId)
          record.set('sign_link', signLink)
          record.set('sign_status', 'sent')
          record.set('zapsign_doc_id', docId)
          record.set('signing_link', signLink)
          record.set('sign_url', signLink)
          record.set('external_id', docId)
          record.set('external_provider', 'zapsign')
          record.set('external_status', 'sent')
          record.set('sent_at', nowIso)
          record.set('data_envio', nowIso)

          const currentEvents = record.get('sign_events') || []
          const eventsArr = Array.isArray(currentEvents) ? currentEvents : []
          eventsArr.push({
            event: 'doc_created',
            provider: 'zapsign',
            doc_id: docId,
            sign_link: signLink,
            created_at: nowIso,
          })
          record.set('sign_events', eventsArr)

          const currentHist = record.get('historico') || []
          const histArr = Array.isArray(currentHist) ? currentHist : []
          histArr.push({
            action: 'zapsign_doc_created',
            doc_id: docId,
            date: nowIso,
          })
          record.set('historico', histArr)

          $app.save(record)
          console.log(
            '[ZapSign Hook] Documento criado com sucesso no ZapSign para contrato:',
            record.id,
            'docId:',
            docId,
          )
        } else {
          console.error(
            '[ZapSign Hook] Erro retornado pelo ZapSign:',
            apiRes.statusCode,
            JSON.stringify(apiRes.json),
          )
        }
      } catch (postErr) {
        console.error('[ZapSign Hook] Falha ao enviar requisição para ZapSign:', postErr)
      }
    }
  } catch (err) {
    console.error('[ZapSign Hook] Erro no onRecordAfterUpdateSuccess:', err)
  }
}, 'contracts')

// --- 2. Endpoint Webhook: POST /api/zapsign/webhook ---
routerAdd('POST', '/api/zapsign/webhook', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const headers = e.requestInfo().headers || {}

    // Validação opcional de assinatura / token / secret
    const webhookSecretEnv = $os.getenv('ZAPSIGN_WEBHOOK_SECRET') || ''
    const receivedSecret =
      e.requestInfo().query.secret ||
      e.requestInfo().query.token ||
      headers['x-zapsign-secret'] ||
      headers['x-webhook-secret'] ||
      ''

    if (webhookSecretEnv && receivedSecret && webhookSecretEnv !== receivedSecret) {
      console.warn('[ZapSign Webhook] Secret não confere.')
      return e.json(401, { error: 'Unauthorized webhook request' })
    }

    // Extrair dados do webhook
    const eventType = body.event_type || body.event || body.type || ''
    const docToken =
      body.token ||
      body.doc_token ||
      body.doc_id ||
      body.id ||
      (body.document && body.document.token) ||
      ''
    const rawStatus =
      body.status ||
      (body.document && body.document.status) ||
      (eventType === 'doc_signed' ? 'signed' : '')
    const signedFileUrl = body.signed_file || (body.document && body.document.signed_file) || ''

    console.log('[ZapSign Webhook] Recebido:', { eventType, docToken, rawStatus })

    if (!docToken && !eventType) {
      return e.json(200, {
        received: true,
        processed: false,
        message: 'Payload vazio ou sem identificador de documento',
      })
    }

    let contractUpdated = false
    let opportunityMoved = false
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // Mapeamento de status para sign_status
    let normalizedSignStatus = 'pending'
    const statusLower = (rawStatus || '').toLowerCase()
    const eventLower = (eventType || '').toLowerCase()

    if (
      statusLower === 'signed' ||
      statusLower === 'completed' ||
      statusLower === 'assinado' ||
      eventLower === 'doc_signed' ||
      eventLower === 'signer_signed'
    ) {
      normalizedSignStatus = 'signed'
    } else if (
      statusLower === 'viewed' ||
      statusLower === 'visualizado' ||
      eventLower === 'doc_viewed'
    ) {
      normalizedSignStatus = 'viewed'
    } else if (
      statusLower === 'declined' ||
      statusLower === 'refused' ||
      statusLower === 'recusado' ||
      statusLower === 'rejected' ||
      eventLower === 'doc_rejected'
    ) {
      normalizedSignStatus = 'declined'
    } else if (statusLower === 'expired' || statusLower === 'expirado') {
      normalizedSignStatus = 'expired'
    } else if (statusLower === 'sent' || statusLower === 'enviado') {
      normalizedSignStatus = 'sent'
    }

    if (docToken) {
      let contractRec = null

      // Busca por sign_document_id, zapsign_doc_id ou external_id
      try {
        contractRec = $app.findFirstRecordByData('contracts', 'sign_document_id', docToken)
      } catch (_) {}

      if (!contractRec) {
        try {
          contractRec = $app.findFirstRecordByData('contracts', 'zapsign_doc_id', docToken)
        } catch (_) {}
      }

      if (!contractRec) {
        try {
          contractRec = $app.findFirstRecordByData('contracts', 'external_id', docToken)
        } catch (_) {}
      }

      if (contractRec) {
        const tenantId = contractRec.getString('tenant_id')
        const oppId = contractRec.getString('oportunidade_id')

        // 1. Atualizar sign_status e sign_events
        contractRec.set('sign_status', normalizedSignStatus)
        contractRec.set('external_status', rawStatus || normalizedSignStatus)

        const currentEvents = contractRec.get('sign_events') || []
        const eventsArr = Array.isArray(currentEvents) ? currentEvents : []
        eventsArr.push({
          event_type: eventType,
          status: rawStatus,
          sign_status: normalizedSignStatus,
          payload: body,
          received_at: nowIso,
        })
        contractRec.set('sign_events', eventsArr)

        const currentHist = contractRec.get('historico') || []
        const histArr = Array.isArray(currentHist) ? currentHist : []
        histArr.push({
          action: 'webhook_' + (eventType || normalizedSignStatus),
          status: normalizedSignStatus,
          date: nowIso,
        })
        contractRec.set('historico', histArr)

        if (signedFileUrl) {
          contractRec.set('documento_url', signedFileUrl)
        }

        if (normalizedSignStatus === 'signed') {
          contractRec.set('status', 'assinado')
          contractRec.set('data_assinatura', nowIso)
          contractRec.set('signed_at', nowIso)
        } else if (normalizedSignStatus === 'declined') {
          contractRec.set('status', 'recusado')
          contractRec.set('data_recusa', nowIso)
        } else if (normalizedSignStatus === 'viewed') {
          contractRec.set('data_visualizacao', nowIso)
        }

        $app.save(contractRec)
        contractUpdated = true

        // 2. Se status = "signed", atualizar a oportunidade vinculada para etapa "Ganho/Contratado"
        if (normalizedSignStatus === 'signed' && oppId) {
          try {
            const oppRec = $app.findRecordById('opportunities', oppId)
            if (oppRec) {
              oppRec.set('status', 'won')
              oppRec.set('data_ganho', nowIso)
              oppRec.set('probabilidade', 100)

              // Localizar o estágio do pipeline para "Ganho" / "Contratado" / "Fechado"
              const pipelineId = oppRec.getString('pipeline_id')
              if (pipelineId) {
                try {
                  const stages = $app.findRecordsByFilter(
                    'pipeline_stages',
                    'pipeline_id = "' + pipelineId + '"',
                    '-probability',
                    10,
                    0,
                  )
                  if (stages && stages.length > 0) {
                    let targetStage = stages.find((st) => {
                      const nameLower = (st.getString('name') || '').toLowerCase()
                      return (
                        st.get('probability') === 100 ||
                        nameLower.includes('contratado') ||
                        nameLower.includes('ganho') ||
                        nameLower.includes('assinado') ||
                        nameLower.includes('fechado')
                      )
                    })
                    if (!targetStage) targetStage = stages[0] // o de maior probabilidade
                    oppRec.set('stage_id', targetStage.id)
                  }
                } catch (stgErr) {
                  console.warn('[ZapSign Webhook] Erro ao buscar pipeline_stages:', stgErr)
                }
              }

              $app.save(oppRec)
              opportunityMoved = true
            }
          } catch (oppErr) {
            console.warn('[ZapSign Webhook] Erro ao atualizar oportunidade vinculada:', oppErr)
          }
        }

        // 3. Auditoria
        if (tenantId) {
          try {
            const auditCol = $app.findCollectionByNameOrId('audit_logs')
            const auditRec = new Record(auditCol)
            auditRec.set('tenant_id', tenantId)
            auditRec.set('action', 'zapsign_webhook_' + normalizedSignStatus)
            auditRec.set('resource_type', 'contracts')
            auditRec.set('resource_id', contractRec.id)
            auditRec.set('new_value', {
              event_type: eventType,
              sign_status: normalizedSignStatus,
              doc_token: docToken,
            })
            $app.save(auditRec)
          } catch (_) {}
        }
      } else {
        console.log('[ZapSign Webhook] Contrato não encontrado para docToken:', docToken)
      }
    }

    return e.json(200, {
      success: true,
      received: true,
      contract_updated: contractUpdated,
      opportunity_moved: opportunityMoved,
      sign_status: normalizedSignStatus,
      doc_id: docToken,
    })
  } catch (err) {
    console.error('[ZapSign Webhook] Erro:', err)
    return e.json(500, {
      success: false,
      error: 'Erro no processamento do webhook ZapSign: ' + (err.message || String(err)),
    })
  }
})

// Alias de compatibilidade para webhook anterior: POST /api/webhooks/zapsign
routerAdd('POST', '/api/webhooks/zapsign', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const headers = e.requestInfo().headers || {}

    const webhookSecretEnv = $os.getenv('ZAPSIGN_WEBHOOK_SECRET') || ''
    const receivedSecret =
      e.requestInfo().query.secret ||
      e.requestInfo().query.token ||
      headers['x-zapsign-secret'] ||
      headers['x-webhook-secret'] ||
      ''

    if (webhookSecretEnv && receivedSecret && webhookSecretEnv !== receivedSecret) {
      console.warn('[ZapSign Webhook] Secret não confere.')
      return e.json(401, { error: 'Unauthorized webhook request' })
    }

    const eventType = body.event_type || body.event || body.type || ''
    const docToken =
      body.token ||
      body.doc_token ||
      body.doc_id ||
      body.id ||
      (body.document && body.document.token) ||
      ''
    const rawStatus =
      body.status ||
      (body.document && body.document.status) ||
      (eventType === 'doc_signed' ? 'signed' : '')
    const signedFileUrl = body.signed_file || (body.document && body.document.signed_file) || ''

    if (!docToken && !eventType) {
      return e.json(200, {
        received: true,
        processed: false,
        message: 'Payload vazio ou sem identificador de documento',
      })
    }

    let contractUpdated = false
    let opportunityMoved = false
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

    let normalizedSignStatus = 'pending'
    const statusLower = (rawStatus || '').toLowerCase()
    const eventLower = (eventType || '').toLowerCase()

    if (
      statusLower === 'signed' ||
      statusLower === 'completed' ||
      statusLower === 'assinado' ||
      eventLower === 'doc_signed' ||
      eventLower === 'signer_signed'
    ) {
      normalizedSignStatus = 'signed'
    } else if (
      statusLower === 'viewed' ||
      statusLower === 'visualizado' ||
      eventLower === 'doc_viewed'
    ) {
      normalizedSignStatus = 'viewed'
    } else if (
      statusLower === 'declined' ||
      statusLower === 'refused' ||
      statusLower === 'recusado' ||
      statusLower === 'rejected' ||
      eventLower === 'doc_rejected'
    ) {
      normalizedSignStatus = 'declined'
    } else if (statusLower === 'expired' || statusLower === 'expirado') {
      normalizedSignStatus = 'expired'
    } else if (statusLower === 'sent' || statusLower === 'enviado') {
      normalizedSignStatus = 'sent'
    }

    if (docToken) {
      let contractRec = null

      try {
        contractRec = $app.findFirstRecordByData('contracts', 'sign_document_id', docToken)
      } catch (_) {}

      if (!contractRec) {
        try {
          contractRec = $app.findFirstRecordByData('contracts', 'zapsign_doc_id', docToken)
        } catch (_) {}
      }

      if (!contractRec) {
        try {
          contractRec = $app.findFirstRecordByData('contracts', 'external_id', docToken)
        } catch (_) {}
      }

      if (contractRec) {
        const tenantId = contractRec.getString('tenant_id')
        const oppId = contractRec.getString('oportunidade_id')

        contractRec.set('sign_status', normalizedSignStatus)
        contractRec.set('external_status', rawStatus || normalizedSignStatus)

        const currentEvents = contractRec.get('sign_events') || []
        const eventsArr = Array.isArray(currentEvents) ? currentEvents : []
        eventsArr.push({
          event_type: eventType,
          status: rawStatus,
          sign_status: normalizedSignStatus,
          payload: body,
          received_at: nowIso,
        })
        contractRec.set('sign_events', eventsArr)

        const currentHist = contractRec.get('historico') || []
        const histArr = Array.isArray(currentHist) ? currentHist : []
        histArr.push({
          action: 'webhook_' + (eventType || normalizedSignStatus),
          status: normalizedSignStatus,
          date: nowIso,
        })
        contractRec.set('historico', histArr)

        if (signedFileUrl) {
          contractRec.set('documento_url', signedFileUrl)
        }

        if (normalizedSignStatus === 'signed') {
          contractRec.set('status', 'assinado')
          contractRec.set('data_assinatura', nowIso)
          contractRec.set('signed_at', nowIso)
        } else if (normalizedSignStatus === 'declined') {
          contractRec.set('status', 'recusado')
          contractRec.set('data_recusa', nowIso)
        } else if (normalizedSignStatus === 'viewed') {
          contractRec.set('data_visualizacao', nowIso)
        }

        $app.save(contractRec)
        contractUpdated = true

        if (normalizedSignStatus === 'signed' && oppId) {
          try {
            const oppRec = $app.findRecordById('opportunities', oppId)
            if (oppRec) {
              oppRec.set('status', 'won')
              oppRec.set('data_ganho', nowIso)
              oppRec.set('probabilidade', 100)

              const pipelineId = oppRec.getString('pipeline_id')
              if (pipelineId) {
                try {
                  const stages = $app.findRecordsByFilter(
                    'pipeline_stages',
                    'pipeline_id = "' + pipelineId + '"',
                    '-probability',
                    10,
                    0,
                  )
                  if (stages && stages.length > 0) {
                    let targetStage = stages.find((st) => {
                      const nameLower = (st.getString('name') || '').toLowerCase()
                      return (
                        st.get('probability') === 100 ||
                        nameLower.includes('contratado') ||
                        nameLower.includes('ganho') ||
                        nameLower.includes('assinado') ||
                        nameLower.includes('fechado')
                      )
                    })
                    if (!targetStage) targetStage = stages[0]
                    oppRec.set('stage_id', targetStage.id)
                  }
                } catch (stgErr) {
                  console.warn('[ZapSign Webhook] Erro ao buscar pipeline_stages:', stgErr)
                }
              }

              $app.save(oppRec)
              opportunityMoved = true
            }
          } catch (oppErr) {
            console.warn('[ZapSign Webhook] Erro ao atualizar oportunidade vinculada:', oppErr)
          }
        }

        if (tenantId) {
          try {
            const auditCol = $app.findCollectionByNameOrId('audit_logs')
            const auditRec = new Record(auditCol)
            auditRec.set('tenant_id', tenantId)
            auditRec.set('action', 'zapsign_webhook_' + normalizedSignStatus)
            auditRec.set('resource_type', 'contracts')
            auditRec.set('resource_id', contractRec.id)
            auditRec.set('new_value', {
              event_type: eventType,
              sign_status: normalizedSignStatus,
              doc_token: docToken,
            })
            $app.save(auditRec)
          } catch (_) {}
        }
      }
    }

    return e.json(200, {
      success: true,
      received: true,
      contract_updated: contractUpdated,
      opportunity_moved: opportunityMoved,
      sign_status: normalizedSignStatus,
      doc_id: docToken,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro no processamento do webhook ZapSign: ' + (err.message || String(err)),
    })
  }
})

// --- 3. Endpoint Auxiliar: POST /api/signatures/zapsign/create (Criação direta via API autenticada) ---
routerAdd(
  'POST',
  '/api/signatures/zapsign/create',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const leadData = body.leadData || {}
      const customerData = body.customerData || {}
      const contractData = body.contractData || {}

      const tenantId = body.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''
      const contractId = body.contract_id || contractData.id || ''

      let apiToken = body.token || ''
      let isSandbox = false
      let customBaseUrl = ''

      if (!apiToken && tenantId) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'tenant_id = "' + tenantId + '" && provider = "zapsign"',
            '-created',
            1,
            0,
          )
          if (configs && configs.length > 0) {
            const cfgRec = configs[0]
            apiToken = cfgRec.getString('api_token')
            const cfg = cfgRec.get('config_json') || cfgRec.get('config') || {}
            if (!apiToken && cfg.api_token) apiToken = cfg.api_token
            if (cfg.sandbox !== undefined) isSandbox = !!cfg.sandbox
            if (cfg.api_url_base) customBaseUrl = cfg.api_url_base
          }
        } catch (_) {}
      }

      if (!apiToken && tenantId) {
        try {
          const secretRec = $app.findFirstRecordByData('system_secrets', 'key', 'ZAPSIGN_API_TOKEN')
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
          ) {
            apiToken = secretRec.getString('value')
          }
        } catch (_) {}
      }

      if (!apiToken) {
        apiToken = $os.getenv('ZAPSIGN_API_TOKEN') || ''
      }

      if (!apiToken) {
        return e.json(400, {
          success: false,
          error: 'Token do ZapSign não configurado na integração.',
        })
      }

      let baseUrl = customBaseUrl
      if (!baseUrl) {
        baseUrl = isSandbox
          ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
          : 'https://api.zapsign.com.br/api/v1/docs/'
      }
      if (!baseUrl.endsWith('/')) baseUrl += '/'

      const signerName =
        customerData.name ||
        customerData.nome ||
        leadData.name ||
        leadData.nome ||
        body.signer_name ||
        'Signatário Principal'

      const signerEmail = customerData.email || leadData.email || body.signer_email || ''
      const signerPhone =
        customerData.phone ||
        customerData.whatsapp ||
        leadData.phone ||
        leadData.whatsapp ||
        body.signer_phone ||
        ''

      const docName =
        contractData.titulo ||
        contractData.title ||
        body.name ||
        'Contrato Comercial - ' + signerName

      const signerObj = { name: signerName }
      if (signerEmail) {
        signerObj.email = signerEmail
        signerObj.send_automatic_email = true
      }
      if (signerPhone) {
        let cleanPhone = signerPhone.replace(/\D/g, '')
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }
        if (cleanPhone) signerObj.phone_country = '55'
        if (cleanPhone)
          signerObj.phone_number = cleanPhone.startsWith('55')
            ? cleanPhone.substring(2)
            : cleanPhone
        signerObj.send_automatic_whatsapp = true
      }

      const zapsignPayload = {
        name: docName,
        signers: [signerObj],
        lang: 'pt-br',
        disable_signer_emails: false,
      }

      if (body.template_id || contractData.template_id) {
        zapsignPayload.template_id = body.template_id || contractData.template_id
      } else if (body.url_pdf || contractData.documento_url) {
        zapsignPayload.url_pdf = body.url_pdf || contractData.documento_url
      } else if (body.markdown || contractData.conteudo) {
        zapsignPayload.markdown = body.markdown || contractData.conteudo
      } else {
        zapsignPayload.markdown =
          '# ' +
          docName +
          '\n\n' +
          '**Contratante:** ' +
          signerName +
          '\n' +
          (signerEmail ? '**E-mail:** ' + signerEmail + '\n' : '') +
          (signerPhone ? '**Telefone/WhatsApp:** ' + signerPhone + '\n' : '') +
          (customerData.document ? '**CPF/CNPJ:** ' + customerData.document + '\n' : '') +
          (customerData.rg ? '**RG:** ' + customerData.rg + '\n' : '') +
          (customerData.address || customerData.city || customerData.state
            ? '**Endereço:** ' +
              [customerData.address, customerData.city, customerData.state]
                .filter(Boolean)
                .join(', ') +
              '\n'
            : '') +
          (customerData.estado_civil
            ? '**Estado Civil:** ' + customerData.estado_civil + '\n'
            : '') +
          (contractData.valor
            ? '**Valor:** R$ ' +
              Number(contractData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
              '\n'
            : '') +
          "\nContrato emitido via Teixeira'sHub CRM."
      }

      let apiRes
      try {
        apiRes = $http.send({
          url: baseUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiToken.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(zapsignPayload),
          timeout: 25,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error: 'Falha na conexão com a API do ZapSign: ' + (httpErr.message || String(httpErr)),
        })
      }

      const resData = apiRes.json || {}
      if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
        return e.json(apiRes.statusCode, {
          success: false,
          error:
            resData.detail ||
            resData.message ||
            JSON.stringify(resData) ||
            'Erro retornado pela API ZapSign.',
          statusCode: apiRes.statusCode,
        })
      }

      const docId = resData.token || resData.id || resData.doc_id || resData.open_id || ''
      let signUrl = resData.sign_url || ''
      if (!signUrl && resData.signers && resData.signers[0] && resData.signers[0].sign_url) {
        signUrl = resData.signers[0].sign_url
      }

      const status = resData.status || 'sent'
      const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

      if (contractId) {
        try {
          const contractRec = $app.findRecordById('contracts', contractId)
          if (contractRec) {
            contractRec.set('sign_provider', 'zapsign')
            contractRec.set('sign_document_id', docId)
            contractRec.set('sign_link', signUrl)
            contractRec.set('sign_status', 'sent')
            contractRec.set('zapsign_doc_id', docId)
            contractRec.set('external_id', docId)
            contractRec.set('sign_url', signUrl)
            contractRec.set('signing_link', signUrl)
            contractRec.set('external_provider', 'zapsign')
            contractRec.set('external_status', status)
            contractRec.set('plataforma', 'zapsign')
            contractRec.set('status', 'enviado')
            contractRec.set('data_envio', nowIso)
            contractRec.set('sent_at', nowIso)

            const hist = contractRec.get('historico') || []
            const histArray = Array.isArray(hist) ? hist : []
            histArray.push({
              action: 'document_created',
              provider: 'zapsign',
              doc_id: docId,
              status: status,
              date: nowIso,
            })
            contractRec.set('historico', histArray)

            $app.save(contractRec)
          }
        } catch (dbErr) {
          console.warn('[ZapSign Hook] Erro ao atualizar contrato no PB:', dbErr)
        }
      }

      return e.json(200, {
        success: true,
        document_id: docId,
        sign_link: signUrl,
        doc_id: docId,
        sign_url: signUrl,
        status: status,
        data: resData,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao criar documento no ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 4. Endpoint Auxiliar: GET /api/signatures/zapsign/status/{docId} ---
routerAdd(
  'GET',
  '/api/signatures/zapsign/status/{docId}',
  (e) => {
    try {
      const docId = e.requestInfo().params.docId
      if (!docId) {
        return e.badRequestError('ID do documento não informado.')
      }

      let apiToken = $os.getenv('ZAPSIGN_API_TOKEN') || ''
      let isSandbox = false
      let customBaseUrl = ''

      const tenantId = (e.auth && e.auth.get('tenant_id')) || ''
      if (tenantId) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'tenant_id = "' + tenantId + '" && provider = "zapsign"',
            '-created',
            1,
            0,
          )
          if (configs && configs.length > 0) {
            const cfgRec = configs[0]
            apiToken = cfgRec.getString('api_token')
            const cfg = cfgRec.get('config_json') || cfgRec.get('config') || {}
            if (!apiToken && cfg.api_token) apiToken = cfg.api_token
            if (cfg.sandbox !== undefined) isSandbox = !!cfg.sandbox
            if (cfg.api_url_base) customBaseUrl = cfg.api_url_base
          }
        } catch (_) {}

        if (!apiToken) {
          try {
            const secretRec = $app.findFirstRecordByData(
              'system_secrets',
              'key',
              'ZAPSIGN_API_TOKEN',
            )
            if (
              secretRec &&
              (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId)
            ) {
              apiToken = secretRec.getString('value')
            }
          } catch (_) {}
        }
      }

      if (!apiToken) {
        return e.json(400, {
          success: false,
          error: 'Token do ZapSign não configurado.',
        })
      }

      let baseUrl = customBaseUrl
      if (!baseUrl) {
        baseUrl = isSandbox
          ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
          : 'https://api.zapsign.com.br/api/v1/docs/'
      }
      if (!baseUrl.endsWith('/')) baseUrl += '/'

      let apiRes
      try {
        apiRes = $http.send({
          url: baseUrl + encodeURIComponent(docId) + '/',
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + apiToken.trim(),
            'Content-Type': 'application/json',
          },
          timeout: 15,
        })
      } catch (httpErr) {
        return e.json(502, {
          success: false,
          error: 'Falha na requisição HTTP com o ZapSign: ' + (httpErr.message || String(httpErr)),
        })
      }

      const resData = apiRes.json || {}
      if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
        return e.json(apiRes.statusCode, {
          success: false,
          error: resData.detail || resData.message || 'Erro ao consultar status no ZapSign.',
          statusCode: apiRes.statusCode,
        })
      }

      const status = resData.status || 'unknown'
      const signedFileUrl = resData.signed_file || ''

      return e.json(200, {
        success: true,
        document_id: docId,
        doc_id: docId,
        status: status,
        signed_file: signedFileUrl,
        data: resData,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro interno ao consultar status: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 5. Endpoint Auxiliar: POST /api/signatures/test-connection ---
routerAdd(
  'POST',
  '/api/signatures/test-connection',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      let token = reqBody.token || ''
      const sandbox = !!reqBody.sandbox
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''

      if (!token && tenantId) {
        try {
          const configs = $app.findRecordsByFilter(
            'integration_configs',
            'tenant_id = "' + tenantId + '" && provider = "zapsign"',
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

        if (!token) {
          try {
            const secretRec = $app.findFirstRecordByData(
              'system_secrets',
              'key',
              'ZAPSIGN_API_TOKEN',
            )
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
        token = $os.getenv('ZAPSIGN_API_TOKEN') || ''
      }

      if (!token) {
        return e.json(400, {
          success: false,
          message: 'Token do ZapSign não informado nem configurado.',
        })
      }

      const baseUrl = sandbox
        ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
        : 'https://api.zapsign.com.br/api/v1/docs/'

      const res = $http.send({
        url: baseUrl + '?page=1',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, {
          success: true,
          status: 'connected',
          message: 'Conexão com ZapSign validada com sucesso!',
          data: res.json,
        })
      } else {
        return e.json(res.statusCode, {
          success: false,
          status: 'error',
          statusCode: res.statusCode,
          message:
            (res.json && (res.json.detail || res.json.message || JSON.stringify(res.json))) ||
            'Falha de autenticação com a API do ZapSign.',
        })
      }
    } catch (err) {
      return e.json(500, {
        success: false,
        status: 'error',
        message: 'Erro ao comunicar com a API do ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 6. Endpoint de Conexão ZapSign: POST /api/signatures/zapsign/connect ---
routerAdd(
  'POST',
  '/api/signatures/zapsign/connect',
  (e) => {
    try {
      const reqBody = e.requestInfo().body || {}
      const token = (reqBody.token || reqBody.api_token || '').trim()
      const tenantId = reqBody.tenant_id || (e.auth && e.auth.get('tenant_id')) || ''
      const sandbox = !!reqBody.sandbox

      if (!tenantId) {
        return e.json(400, { success: false, error: 'tenant_id é obrigatório.' })
      }
      if (!token) {
        return e.json(400, { success: false, error: 'Token do ZapSign é obrigatório.' })
      }

      // Validar o token chamando a API do ZapSign
      const baseUrl = sandbox
        ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
        : 'https://api.zapsign.com.br/api/v1/docs/'

      let testRes
      try {
        testRes = $http.send({
          url: baseUrl + '?page=1',
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
            'Não foi possível conectar à API do ZapSign: ' + (httpErr.message || String(httpErr)),
        })
      }

      if (testRes.statusCode < 200 || testRes.statusCode >= 300) {
        return e.json(400, {
          success: false,
          error:
            (testRes.json &&
              (testRes.json.detail || testRes.json.message || JSON.stringify(testRes.json))) ||
            'Token inválido ou recusado pela API do ZapSign.',
          statusCode: testRes.statusCode,
        })
      }

      // Upsert na coleção integration_configs
      let configRec = null
      try {
        const existing = $app.findRecordsByFilter(
          'integration_configs',
          'tenant_id = "' + tenantId + '" && provider = "zapsign"',
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
        configRec.set('provider', 'zapsign')
      }

      configRec.set('status', 'active')
      configRec.set('is_active', true)
      configRec.set('api_token', token)
      configRec.set('config_json', {
        provider: 'zapsign',
        sandbox: sandbox,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      })
      configRec.set('config', {
        provider: 'zapsign',
        sandbox: sandbox,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      })

      $app.save(configRec)

      // Registrar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('tenant_id', tenantId)
        auditRec.set('user_id', e.auth ? e.auth.id : '')
        auditRec.set('action', 'zapsign_connected')
        auditRec.set('resource_type', 'integration_configs')
        auditRec.set('resource_id', configRec.id)
        $app.save(auditRec)
      } catch (_) {}

      // Retornar confirmação SEM expor o token na resposta
      return e.json(200, {
        success: true,
        message: 'ZapSign conectado com sucesso!',
        config: {
          id: configRec.id,
          provider: 'zapsign',
          status: 'active',
          is_active: true,
          updated: configRec.getString('updated') || new Date().toISOString(),
          created: configRec.getString('created') || new Date().toISOString(),
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao conectar ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 7. Endpoint de Desconexão ZapSign: POST /api/signatures/zapsign/disconnect ---
routerAdd(
  'POST',
  '/api/signatures/zapsign/disconnect',
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
          'tenant_id = "' + tenantId + '" && provider = "zapsign"',
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
        console.warn('[ZapSign Hook] Erro ao deletar config:', delErr)
      }

      // Registrar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('tenant_id', tenantId)
        auditRec.set('user_id', e.auth ? e.auth.id : '')
        auditRec.set('action', 'zapsign_disconnected')
        auditRec.set('resource_type', 'integration_configs')
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'ZapSign desconectado com sucesso.',
        removed_count: count,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao desconectar ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// --- 8. Endpoint de Consulta de Status ZapSign: GET /api/signatures/zapsign/config ---
routerAdd(
  'GET',
  '/api/signatures/zapsign/config',
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
          'tenant_id = "' + tenantId + '" && provider = "zapsign"',
          '-created',
          1,
          0,
        )
        if (configs && configs.length > 0) {
          const cfgRec = configs[0]
          const token = cfgRec.getString('api_token')
          const cfgJson = cfgRec.get('config_json') || cfgRec.get('config') || {}
          if (token || cfgJson.api_token) {
            isConnected = true
            configData = {
              id: cfgRec.id,
              provider: 'zapsign',
              status: cfgRec.getString('status') || 'active',
              is_active: cfgRec.get('is_active') !== false,
              created: cfgRec.getString('created'),
              updated: cfgRec.getString('updated'),
              sandbox: !!cfgJson.sandbox,
              last_sync: cfgJson.last_sync || cfgRec.getString('updated'),
            }
          }
        }
      } catch (qErr) {
        console.warn('[ZapSign Hook] Erro ao buscar config:', qErr)
      }

      // Fallback para secrets do sistema se não houver em integration_configs
      if (!isConnected) {
        try {
          const secretRec = $app.findFirstRecordByData('system_secrets', 'key', 'ZAPSIGN_API_TOKEN')
          if (
            secretRec &&
            (!secretRec.getString('tenant_id') || secretRec.getString('tenant_id') === tenantId) &&
            secretRec.getString('value')
          ) {
            isConnected = true
            configData = {
              id: 'system_secret',
              provider: 'zapsign',
              status: 'active',
              is_active: true,
              created: secretRec.getString('created'),
              updated: secretRec.getString('updated'),
              last_sync: secretRec.getString('updated'),
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
        error: 'Erro ao obter status do ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
