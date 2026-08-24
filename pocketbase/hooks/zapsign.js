/**
 * PocketBase Hook: ZapSign Electronic Signature Integration
 *
 * Strategy without routerAdd (native records API + lifecycle hooks):
 * - onRecordCreate / onRecordUpdate on integration_configs:
 *   Validates ZapSign token against ZapSign API (GET https://api.zapsign.com.br/api/v1/docs/?page=1)
 *   Sets status='active', is_active=true on success; status='error' with error message on failure.
 * - onRecordAfterUpdateSuccess on contracts:
 *   Auto-creates ZapSign document when contract status becomes 'enviado' or sign_status becomes 'sent'.
 *   (Preserved existing functionality).
 */

// Lifecycle hook: Validação de Token ZapSign ao criar/atualizar configuração
onRecordCreate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'zapsign') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.token) token = cfg.token

    if (!token) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    const sandbox = !!cfg.sandbox
    const baseUrl = sandbox
      ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
      : 'https://api.zapsign.com.br/api/v1/docs/'

    try {
      const testRes = $http.send({
        url: baseUrl + '?page=1',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        record.set('status', 'active')
        record.set('is_active', true)
        const nowIso = new Date().toISOString()
        const updatedCfg = {
          ...cfg,
          provider: 'zapsign',
          sandbox: sandbox,
          last_validated: nowIso,
          error_message: '',
        }
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        const errDetail =
          (testRes.json &&
            (testRes.json.detail || testRes.json.message || JSON.stringify(testRes.json))) ||
          'Token inválido ou recusado pela API do ZapSign (HTTP ' + testRes.statusCode + ')'
        record.set('status', 'error')
        record.set('is_active', false)
        const updatedCfg = {
          ...cfg,
          provider: 'zapsign',
          sandbox: sandbox,
          error_message: String(errDetail),
        }
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      record.set('status', 'error')
      record.set('is_active', false)
      const updatedCfg = {
        ...cfg,
        provider: 'zapsign',
        sandbox: sandbox,
        error_message:
          'Falha de conexão com a API do ZapSign: ' + (httpErr.message || String(httpErr)),
      }
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[ZapSign onRecordCreate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

onRecordUpdate((e) => {
  try {
    const record = e.record
    if (!record) return e.next()

    const provider = record.getString('provider')
    if (provider !== 'zapsign') return e.next()

    let token = record.getString('api_token') || record.getString('api_key') || ''
    const cfg = record.get('config_json') || record.get('config') || {}
    if (!token && cfg.api_token) token = cfg.api_token
    if (!token && cfg.token) token = cfg.token

    if (!token) {
      record.set('status', 'inactive')
      record.set('is_active', false)
      return e.next()
    }

    const sandbox = !!cfg.sandbox
    const baseUrl = sandbox
      ? 'https://sandbox.api.zapsign.com.br/api/v1/docs/'
      : 'https://api.zapsign.com.br/api/v1/docs/'

    try {
      const testRes = $http.send({
        url: baseUrl + '?page=1',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token.trim(),
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (testRes.statusCode >= 200 && testRes.statusCode < 300) {
        record.set('status', 'active')
        record.set('is_active', true)
        const nowIso = new Date().toISOString()
        const updatedCfg = {
          ...cfg,
          provider: 'zapsign',
          sandbox: sandbox,
          last_validated: nowIso,
          error_message: '',
          test_requested: false,
        }
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      } else {
        const errDetail =
          (testRes.json &&
            (testRes.json.detail || testRes.json.message || JSON.stringify(testRes.json))) ||
          'Token inválido ou recusado pela API do ZapSign (HTTP ' + testRes.statusCode + ')'
        record.set('status', 'error')
        record.set('is_active', false)
        const updatedCfg = {
          ...cfg,
          provider: 'zapsign',
          sandbox: sandbox,
          error_message: String(errDetail),
          test_requested: false,
        }
        record.set('config_json', updatedCfg)
        record.set('config', updatedCfg)
      }
    } catch (httpErr) {
      record.set('status', 'error')
      record.set('is_active', false)
      const updatedCfg = {
        ...cfg,
        provider: 'zapsign',
        sandbox: sandbox,
        error_message:
          'Falha de conexão com a API do ZapSign: ' + (httpErr.message || String(httpErr)),
        test_requested: false,
      }
      record.set('config_json', updatedCfg)
      record.set('config', updatedCfg)
    }

    return e.next()
  } catch (err) {
    console.error('[ZapSign onRecordUpdate] Erro:', err)
    return e.next()
  }
}, 'integration_configs')

// --- Lifecycle hook: onRecordAfterUpdateSuccess em contracts (Criação automática no ZapSign) ---
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

    if (isSentTrigger && !alreadyHasDoc) {
      const tenantId = record.getString('tenant_id')
      if (!tenantId) {
        console.warn('[ZapSign Hook] Contrato sem tenant_id:', record.id)
        return
      }

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
          apiToken = cfgRec.getString('api_token') || cfgRec.getString('api_key')
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
        if (cleanPhone) {
          signerObj.phone_number = cleanPhone.startsWith('55')
            ? cleanPhone.substring(2)
            : cleanPhone
        }
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
