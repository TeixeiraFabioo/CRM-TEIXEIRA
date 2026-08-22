onRecordCreate((e) => {
  e.next()

  try {
    const lead = e.record
    if (!lead) return

    const tenantId = lead.getString('tenant_id')
    if (!tenantId) return

    // Disparar evento CAPI (Meta Conversions API) para o lead criado.
    // Dispara para todo lead novo, independentemente da distribuição, e
    // nunca deixa falhas aqui quebrarem a criação do lead.
    try {
      const capiCol = $app.findCollectionByNameOrId('capi_events')
      const capiRec = new Record(capiCol)
      capiRec.set('tenant_id', tenantId)
      capiRec.set('event_name', 'Lead')

      const leadEmail = (lead.getString('email') || '').trim().toLowerCase()
      const leadPhoneRaw = lead.getString('phone') || lead.getString('whatsapp') || ''
      let leadPhoneDigits = leadPhoneRaw.replace(/\D/g, '')
      if (leadPhoneDigits && !leadPhoneDigits.startsWith('55')) {
        leadPhoneDigits = '55' + leadPhoneDigits
      }
      const leadFbc = lead.getString('fbc') || ''
      const leadFbp = lead.getString('fbp') || ''

      // Meta CAPI exige em/ph como arrays de hashes SHA-256 (normalizados).
      const capiUserData = {}
      if (leadEmail) capiUserData.em = [$security.sha256(leadEmail)]
      if (leadPhoneDigits) capiUserData.ph = [$security.sha256(leadPhoneDigits)]
      if (leadFbc) capiUserData.fbc = leadFbc
      if (leadFbp) capiUserData.fbp = leadFbp
      capiRec.set('user_data', capiUserData)

      capiRec.set('event_data', {
        event_source_url: lead.getString('landing_page') || lead.getString('url_origem') || '',
        custom_data: {
          source: lead.getString('source') || '',
          channel: lead.getString('channel') || '',
          campaign: lead.getString('campaign') || '',
          ad_set: lead.getString('ad_set') || '',
          ad: lead.getString('ad') || '',
          utm_source: lead.getString('utm_source') || '',
          utm_medium: lead.getString('utm_medium') || '',
          utm_campaign: lead.getString('utm_campaign') || '',
          product: lead.getString('product') || '',
          service: lead.getString('service') || '',
          area: lead.getString('area') || '',
        },
      })

      capiRec.set('status', 'pending')
      capiRec.set('attempts', 0)
      $app.save(capiRec)
      // O hook onRecordAfterCreateSuccess de capi.js processa o envio para a Meta.
    } catch (capiErr) {
      console.log('Erro ao disparar evento CAPI para lead:', capiErr)
    }

    // Se o lead já possui responsável atribuído (assigned_to ou responsavel_id), não distribui
    const existingAssigned = lead.getString('assigned_to') || lead.getString('responsavel_id')
    if (existingAssigned && existingAssigned.trim() !== '') {
      return
    }

    // Verificar configuração de distribuição do tenant na coleção lead_distribution
    let distConfig = null
    try {
      distConfig = $app.findFirstRecordByData('lead_distribution', 'tenant_id', tenantId)
    } catch (_) {}

    // Se existir configuração e estiver desativada (ativo === false || is_active === false), não distribui
    if (distConfig) {
      const isConfigActive = distConfig.getBool('ativo') || distConfig.getBool('is_active')
      const method =
        distConfig.getString('metodo') ||
        distConfig.getString('distribution_method') ||
        'round_robin'
      if (!isConfigActive || method === 'manual') {
        return
      }
    }

    // Buscar usuários ativos do tenant
    let eligibleUsers = []
    try {
      const allUsers = $app.findRecordsByFilter(
        'users',
        'tenant_id = {:tenantId}',
        'created',
        100,
        0,
        { tenantId: tenantId },
      )

      // Buscar roles do tenant para identificar roles com nome vendedor / atendente
      const roles = $app.findRecordsByFilter('roles', 'tenant_id = {:tenantId}', 'name', 50, 0, {
        tenantId: tenantId,
      })
      const roleMap = {}
      for (let r of roles) {
        roleMap[r.id] = (r.getString('name') || '').toLowerCase()
      }

      for (let u of allUsers) {
        const isActive = u.getBool('active') !== false && u.getString('status') !== 'inactive'
        if (!isActive) continue

        const roleField = (u.getString('role') || '').toLowerCase()
        const roleId = u.getString('role_id')
        const roleName = roleId && roleMap[roleId] ? roleMap[roleId] : ''

        // Critério: role "vendedor" ou "atendente" (ou role_id com nome Vendedor/Atendente ou papel comercial/user)
        const isSalesRole =
          roleField === 'user' ||
          roleField === 'vendedor' ||
          roleField === 'atendente' ||
          roleName.indexOf('vendedor') !== -1 ||
          roleName.indexOf('atendente') !== -1 ||
          roleName.indexOf('comercial') !== -1

        if (isSalesRole) {
          eligibleUsers.push(u)
        }
      }

      // Se nenhum usuário específico de vendedor for encontrado, usar qualquer usuário ativo do tenant
      if (eligibleUsers.length === 0) {
        for (let u of allUsers) {
          const isActive = u.getBool('active') !== false && u.getString('status') !== 'inactive'
          if (isActive) {
            eligibleUsers.push(u)
          }
        }
      }
    } catch (err) {
      console.log('Erro ao buscar usuários elegíveis:', err)
    }

    if (eligibleUsers.length === 0) {
      return
    }

    // Identificar o último vendedor que recebeu um lead no tenant para executar o round-robin
    let selectedUser = eligibleUsers[0]
    try {
      let lastUserId = ''
      // Tenta buscar no lead_distribution ou lead_distribution_logs
      try {
        const lastDistLogs = $app.findRecordsByFilter(
          'lead_distribution',
          'tenant_id = {:tenantId} && user_id != ""',
          '-created',
          1,
          0,
          { tenantId: tenantId },
        )
        if (lastDistLogs.length > 0) {
          lastUserId = lastDistLogs[0].getString('user_id')
        }
      } catch (_) {}

      if (!lastUserId) {
        try {
          const lastDistLogs2 = $app.findRecordsByFilter(
            'lead_distribution_logs',
            'tenant_id = {:tenantId}',
            '-created',
            1,
            0,
            { tenantId: tenantId },
          )
          if (lastDistLogs2.length > 0) {
            lastUserId = lastDistLogs2[0].getString('user_id')
          }
        } catch (_) {}
      }

      if (lastUserId) {
        const lastIndex = eligibleUsers.findIndex((u) => u.id === lastUserId)
        if (lastIndex !== -1) {
          const nextIndex = (lastIndex + 1) % eligibleUsers.length
          selectedUser = eligibleUsers[nextIndex]
        }
      }
    } catch (err) {
      console.log('Erro ao calcular round-robin:', err)
    }

    // 1. Atualizar o lead com o responsável selecionado
    lead.set('assigned_to', selectedUser.id)
    lead.set('responsavel_id', selectedUser.id)
    $app.save(lead)

    // 2. Registrar na coleção lead_distribution
    try {
      const distCol = $app.findCollectionByNameOrId('lead_distribution')
      const distRec = new Record(distCol)
      distRec.set('tenant_id', tenantId)
      distRec.set('lead_id', lead.id)
      distRec.set('user_id', selectedUser.id)
      distRec.set('distribution_method', 'round_robin')
      distRec.set('metodo', 'round_robin')
      distRec.set('ativo', true)
      $app.save(distRec)
    } catch (err) {
      console.log('Erro ao registrar lead_distribution:', err)
    }

    // 3. Registrar também na coleção lead_distribution_logs (se existir)
    try {
      const logsCol = $app.findCollectionByNameOrId('lead_distribution_logs')
      const logRec = new Record(logsCol)
      logRec.set('tenant_id', tenantId)
      logRec.set('lead_id', lead.id)
      logRec.set('user_id', selectedUser.id)
      logRec.set('distribution_method', 'round_robin')
      $app.save(logRec)
    } catch (_) {}

    // 4. Registrar no audit_logs
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', selectedUser.id)
      auditRec.set('action', 'lead_distributed_round_robin')
      auditRec.set('resource_type', 'lead')
      auditRec.set('resource_id', lead.id)
      auditRec.set('new_value', {
        assigned_to: selectedUser.id,
        user_name: selectedUser.getString('name'),
        distribution_method: 'round_robin',
      })
      $app.save(auditRec)
    } catch (_) {}
  } catch (globalErr) {
    console.log('Erro no hook de distribuição automática de leads:', globalErr)
  }
}, 'leads')
