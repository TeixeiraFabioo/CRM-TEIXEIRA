// PocketBase Hook: ZapSign Electronic Signature Adapter & Webhook Router
// Provides:
// - Adapter methods: createDocument, getDocumentStatus, handleWebhook
// - API endpoint: POST /api/signatures/zapsign/create (authenticated)
// - API endpoint: GET /api/signatures/zapsign/status/{docId} (authenticated)
// - API endpoint: POST /api/signatures/test-connection (authenticated)
// - Webhook endpoint: POST /api/webhooks/zapsign (public / signed)

// 1. Endpoint para criar documento no ZapSign via CRM
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

      // Buscar token do ZapSign (prioridade: body.token > integration_configs > system_secrets > env)
      let apiToken = body.token || ''
      let isSandbox = false
      let customBaseUrl = ''

      if (!apiToken && tenantId) {
        try {
          const configRec = $app.findFirstRecordByData('integration_configs', 'provider', 'zapsign')
          if (configRec && configRec.get('tenant_id') === tenantId) {
            const cfg = configRec.get('config') || {}
            if (cfg.api_token) apiToken = cfg.api_token
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
            (!secretRec.get('tenant_id') || secretRec.get('tenant_id') === tenantId)
          ) {
            apiToken = secretRec.get('value') || ''
          }
        } catch (_) {}
      }

      if (!apiToken) {
        apiToken = $os.getenv('ZAPSIGN_API_TOKEN') || ''
      }

      if (!apiToken) {
        return e.json(400, {
          success: false,
          error: 'Token do ZapSign não configurado (ZAPSIGN_API_TOKEN).',
        })
      }

      let baseUrl = customBaseUrl
      if (!baseUrl) {
        baseUrl = isSandbox
          ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
          : 'https://api.zapsign.com.br/api/v1/docs/'
      }
      if (!baseUrl.endsWith('/')) baseUrl += '/'

      // Montar signatários
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

      const signerObj = {
        name: signerName,
      }
      if (signerEmail) signerObj.email = signerEmail
      if (signerPhone) {
        // Formatar telefone internacional se necessário
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
      if (signerEmail) {
        signerObj.send_automatic_email = true
      }

      // Payload do ZapSign
      const zapsignPayload = {
        name: docName,
        signers: [signerObj],
        lang: 'pt-br',
        disable_signer_emails: false,
      }

      // Se tiver template_id ou markdown/url
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
          (contractData.valor
            ? '**Valor:** R$ ' +
              Number(contractData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
              '\n'
            : '') +
          "\nContrato gerado e emitido via Teixeira'sHub CRM."
      }

      // Enviar requisição HTTP para o ZapSign
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
          error:
            'Falha na conexão HTTP com a API do ZapSign: ' + (httpErr.message || String(httpErr)),
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

      const status = resData.status || 'pending'
      const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

      // Se temos o ID do contrato no PB, atualizamos o registro
      if (contractId) {
        try {
          const contractRec = $app.findRecordById('contracts', contractId)
          if (contractRec) {
            contractRec.set('zapsign_doc_id', docId)
            contractRec.set('external_id', docId)
            contractRec.set('sign_url', signUrl)
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
        doc_id: docId,
        sign_url: signUrl,
        status: status,
        data: resData,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro interno ao criar documento no ZapSign: ' + (err.message || String(err)),
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Endpoint para consultar status do documento no ZapSign
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
          const configRec = $app.findFirstRecordByData('integration_configs', 'provider', 'zapsign')
          if (configRec && configRec.get('tenant_id') === tenantId) {
            const cfg = configRec.get('config') || {}
            if (cfg.api_token) apiToken = cfg.api_token
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
              (!secretRec.get('tenant_id') || secretRec.get('tenant_id') === tenantId)
            ) {
              apiToken = secretRec.get('value') || ''
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

// 3. Endpoint de Teste de Conexão com ZapSign
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
          const configRec = $app.findFirstRecordByData('integration_configs', 'provider', 'zapsign')
          if (configRec && configRec.get('tenant_id') === tenantId) {
            const cfg = configRec.get('config') || {}
            if (cfg.api_token) token = cfg.api_token
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
              (!secretRec.get('tenant_id') || secretRec.get('tenant_id') === tenantId)
            ) {
              token = secretRec.get('value') || ''
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
          message: 'Token do ZapSign não informado nem configurado nas variáveis de ambiente.',
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

// 4. Webhook endpoint para receber notificações do ZapSign
// Rota pública para webhooks externos: POST /api/webhooks/zapsign
routerAdd('POST', '/api/webhooks/zapsign', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const headers = e.requestInfo().headers || {}

    // Validação básica de token/assinatura se fornecida via query param ou header
    const webhookSecretEnv = $os.getenv('ZAPSIGN_WEBHOOK_SECRET') || ''
    const receivedSecret =
      e.requestInfo().query.secret ||
      e.requestInfo().query.token ||
      headers['x-zapsign-secret'] ||
      headers['x-webhook-secret'] ||
      ''

    if (webhookSecretEnv && receivedSecret && webhookSecretEnv !== receivedSecret) {
      console.warn('[ZapSign Webhook] Assinatura/Secret inválido recebido.')
      return e.json(401, { error: 'Unauthorized webhook request' })
    }

    // Identificar campos do evento ZapSign
    // ZapSign envia: { event_type: "doc_signed", token: "...", status: "signed", name: "...", ... }
    // ou payload direto com doc_id / token / external_id
    const eventType = body.event_type || body.event || body.type || ''
    const docToken =
      body.token ||
      body.doc_token ||
      body.doc_id ||
      body.id ||
      (body.document && body.document.token) ||
      ''
    const docStatus =
      body.status ||
      (body.document && body.document.status) ||
      (eventType === 'doc_signed' ? 'signed' : '')
    const signedFileUrl = body.signed_file || (body.document && body.document.signed_file) || ''

    console.log(
      '[ZapSign Webhook] Recebido evento:',
      eventType,
      'DocToken:',
      docToken,
      'Status:',
      docStatus,
    )

    if (!docToken && !eventType) {
      return e.json(200, {
        received: true,
        processed: false,
        message: 'Payload vazio ou não reconhecido como evento ZapSign',
      })
    }

    let contractUpdated = false
    let opportunityMoved = false
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // Procurar contrato no PocketBase associado ao documento
    if (docToken) {
      try {
        // Tentar buscar por zapsign_doc_id ou external_id
        let contractRec = null
        try {
          contractRec = $app.findFirstRecordByData('contracts', 'zapsign_doc_id', docToken)
        } catch (_) {}

        if (!contractRec) {
          try {
            contractRec = $app.findFirstRecordByData('contracts', 'external_id', docToken)
          } catch (_) {}
        }

        if (contractRec) {
          const tenantId = contractRec.get('tenant_id')
          const oppId = contractRec.get('oportunidade_id')
          const currentHist = contractRec.get('historico') || []
          const histArray = Array.isArray(currentHist) ? currentHist : []

          histArray.push({
            action: 'webhook_received',
            event_type: eventType,
            status: docStatus,
            payload: body,
            date: nowIso,
          })
          contractRec.set('historico', histArray)
          contractRec.set('external_status', docStatus || 'updated')

          if (signedFileUrl) {
            contractRec.set('documento_url', signedFileUrl)
          }

          // Se status for assinado ("signed", "completed", "doc_signed")
          if (
            docStatus === 'signed' ||
            docStatus === 'completed' ||
            eventType === 'doc_signed' ||
            eventType === 'signer_signed'
          ) {
            contractRec.set('status', 'assinado')
            contractRec.set('data_assinatura', nowIso)
            contractRec.set('signed_at', nowIso)

            $app.save(contractRec)
            contractUpdated = true

            // Mover oportunidade associada para "won" (ou estágio Fechado/Ganho)
            if (oppId) {
              try {
                const oppRec = $app.findRecordById('opportunities', oppId)
                if (oppRec) {
                  oppRec.set('status', 'won')
                  oppRec.set('data_ganho', nowIso)
                  oppRec.set('probabilidade', 100)

                  // Tentar encontrar o estágio "Fechado" / "Ganho" / "Assinado" do pipeline
                  const pipelineId = oppRec.get('pipeline_id')
                  if (pipelineId) {
                    try {
                      const stages = $app.findRecordsByFilter(
                        'pipeline_stages',
                        'pipeline_id = "' + pipelineId + '"',
                        '-probability',
                        5,
                        0,
                      )
                      if (stages && stages.length > 0) {
                        // Encontrar estágio com 100% de probabilidade ou nome Ganho/Assinado/Fechado
                        let wonStage = stages.find(
                          (st) =>
                            st.get('probability') === 100 ||
                            st.get('name').toLowerCase().includes('ganho') ||
                            st.get('name').toLowerCase().includes('assinado') ||
                            st.get('name').toLowerCase().includes('fechado'),
                        )
                        if (!wonStage) wonStage = stages[0] // o de maior probabilidade
                        oppRec.set('stage_id', wonStage.id)
                      }
                    } catch (_) {}
                  }

                  $app.save(oppRec)
                  opportunityMoved = true
                }
              } catch (oppErr) {
                console.warn('[ZapSign Webhook] Erro ao atualizar oportunidade vinculada:', oppErr)
              }
            }

            // Registrar evento de auditoria se aplicável
            try {
              if (tenantId) {
                const auditCol = $app.findCollectionByNameOrId('audit_logs')
                const auditRec = new Record(auditCol)
                auditRec.set('tenant_id', tenantId)
                auditRec.set('action', 'contract_signed_zapsign')
                auditRec.set('resource_type', 'contracts')
                auditRec.set('resource_id', contractRec.id)
                auditRec.set('new_value', {
                  doc_token: docToken,
                  status: docStatus,
                  event: eventType,
                })
                $app.save(auditRec)
              }
            } catch (_) {}
          } else if (docStatus === 'rejected' || eventType === 'doc_rejected') {
            contractRec.set('status', 'recusado')
            contractRec.set('data_recusa', nowIso)
            $app.save(contractRec)
            contractUpdated = true
          } else {
            $app.save(contractRec)
            contractUpdated = true
          }
        } else {
          console.log('[ZapSign Webhook] Nenhum contrato localizado com docToken:', docToken)
        }
      } catch (ctrErr) {
        console.warn('[ZapSign Webhook] Erro no processamento do contrato:', ctrErr)
      }
    }

    return e.json(200, {
      success: true,
      received: true,
      contract_updated: contractUpdated,
      opportunity_moved: opportunityMoved,
      event: eventType,
      doc_id: docToken,
      status: docStatus,
    })
  } catch (err) {
    console.error('[ZapSign Webhook] Erro fatal no handler:', err)
    return e.json(500, {
      success: false,
      error: 'Erro no processamento do webhook: ' + (err.message || String(err)),
    })
  }
})
