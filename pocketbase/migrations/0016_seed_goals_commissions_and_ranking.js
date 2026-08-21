migrate(
  (app) => {
    // 1. Obter tenant padrão
    let tenant
    try {
      tenant = app.findFirstRecordByData('tenants', 'slug', 'skip-enterprise')
    } catch (_) {
      try {
        const tenants = app.findRecordsByFilter('tenants', 'id != ""', 'created', 1, 0)
        tenant = tenants[0]
      } catch (_) {}
    }
    if (!tenant) return
    const tenantId = tenant.id

    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const contractsCol = app.findCollectionByNameOrId('contracts')
    const opportunitiesCol = app.findCollectionByNameOrId('opportunities')
    const proposalsCol = app.findCollectionByNameOrId('proposals')
    const customersCol = app.findCollectionByNameOrId('customers')
    const leadsCol = app.findCollectionByNameOrId('leads')
    const goalsCol = app.findCollectionByNameOrId('goals')
    const commissionsCol = app.findCollectionByNameOrId('commissions')

    // 2. Seed Vendedores / Advogados da equipe para o Ranking
    const teamMembers = [
      {
        email: 'mariana.costa@teixeiranascimento.adv.br',
        name: 'Dra. Mariana Costa',
        role: 'user',
        team: 'comercial',
      },
      {
        email: 'rodrigo.albuquerque@teixeiranascimento.adv.br',
        name: 'Dr. Rodrigo Albuquerque',
        role: 'user',
        team: 'comercial',
      },
      {
        email: 'aline.marques@teixeiranascimento.adv.br',
        name: 'Dra. Aline Marques',
        role: 'user',
        team: 'juridico',
      },
    ]

    const userMap = {}

    // Pegar admin existente
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'fabio.saantost@gmail.com')
      userMap['admin'] = admin.id
      admin.set('team', 'comercial')
      admin.set('name', 'Dr. Fabio Santos (Sócio-Diretor)')
      app.save(admin)
    } catch (_) {}

    for (const m of teamMembers) {
      try {
        const u = app.findAuthRecordByEmail('_pb_users_auth_', m.email)
        userMap[m.email] = u.id
      } catch (_) {
        const rec = new Record(usersCol)
        rec.setEmail(m.email)
        rec.setPassword('Skip@Pass')
        rec.setVerified(true)
        rec.set('name', m.name)
        rec.set('role', m.role)
        rec.set('team', m.team)
        rec.set('tenant_id', tenantId)
        rec.set('active', true)
        rec.set('status', 'active')
        app.save(rec)
        userMap[m.email] = rec.id
      }
    }

    const adminId = userMap['admin'] || Object.values(userMap)[0]
    const marianaId = userMap['mariana.costa@teixeiranascimento.adv.br'] || adminId
    const rodrigoId = userMap['rodrigo.albuquerque@teixeiranascimento.adv.br'] || adminId
    const alineId = userMap['aline.marques@teixeiranascimento.adv.br'] || adminId

    // 3. Atualizar e criar oportunidades para os vendedores
    // Obter clientes / leads existentes
    let allCustomers = []
    try {
      allCustomers = app.findRecordsByFilter('customers', 'tenant_id = {:t}', 'created', 10, 0, {
        t: tenantId,
      })
    } catch (_) {}

    let allLeads = []
    try {
      allLeads = app.findRecordsByFilter('leads', 'tenant_id = {:t}', 'created', 20, 0, {
        t: tenantId,
      })
    } catch (_) {}

    // Distribuir alguns leads entre os vendedores
    if (allLeads.length >= 3) {
      allLeads[0].set('assigned_to', marianaId)
      allLeads[0].set('responsavel_id', marianaId)
      app.save(allLeads[0])

      allLeads[1].set('assigned_to', rodrigoId)
      allLeads[1].set('responsavel_id', rodrigoId)
      app.save(allLeads[1])

      allLeads[2].set('assigned_to', alineId)
      allLeads[2].set('responsavel_id', alineId)
      app.save(allLeads[2])
    }

    // Criar Oportunidades Ganhas com Contratos Assinados para alimentar comissões, metas e ranking
    const contractsData = [
      {
        titulo: 'Contrato de Honorários - Recuperação Tributária PIS/COFINS',
        valor: 145000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: marianaId,
        oppTitle: 'Recuperação Tributária - Vanguarda Logística S.A.',
        oppValue: 145000,
        servico: 'Recuperação Tributária e Teses Fiscais',
        commPercent: 12,
        commStatus: 'pago',
        commPagoData: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        titulo: 'Contrato de Assessoria - Revisão de Contratos Bancários e Juros',
        valor: 85000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: marianaId,
        oppTitle: 'Revisão Financiamento Estruturado - Grupo Rocha',
        oppValue: 85000,
        servico: 'Revisão de Contratos Bancários e Juros Abusivos',
        commPercent: 10,
        commStatus: 'pendente',
      },
      {
        titulo: 'Contrato de Consultoria - Planejamento Tributário Holding',
        valor: 120000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: rodrigoId,
        oppTitle: 'Planejamento Tributário - InovaTech Soluções',
        oppValue: 120000,
        servico: 'Planejamento Tributário Estruturado',
        commPercent: 10,
        commStatus: 'aprovado',
      },
      {
        titulo: 'Contrato Contencioso - Defesa em Execução Fiscal',
        valor: 65000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: rodrigoId,
        oppTitle: 'Defesa Fiscal e Desbloqueio - MedCorp',
        oppValue: 65000,
        servico: 'Defesa em Execução Fiscal e Blindagem',
        commPercent: 10,
        commStatus: 'pago',
        commPagoData: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        titulo: 'Contrato B2B - Auditoria e Compliance Trabalhista',
        valor: 48000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: adminId,
        oppTitle: 'Auditoria Trabalhista - Nexus Logística',
        oppValue: 48000,
        servico: 'Auditoria e Compliance Trabalhista B2B',
        commPercent: 15,
        commStatus: 'pago',
        commPagoData: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        titulo: 'Contrato - Defesa Trabalhista Patronal Estratégica',
        valor: 35000,
        status: 'assinado',
        sign_status: 'signed',
        data_assinatura: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        signed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        responsavel_id: alineId,
        oppTitle: 'Defesa Trabalhista Coletiva - Indústria Alpha',
        oppValue: 35000,
        servico: 'Defesa Trabalhista Patronal Estratégica',
        commPercent: 10,
        commStatus: 'pendente',
      },
    ]

    for (const cData of contractsData) {
      let oppId = ''
      try {
        const existingOpp = app.findFirstRecordByData('opportunities', 'title', cData.oppTitle)
        oppId = existingOpp.id
      } catch (_) {
        const opp = new Record(opportunitiesCol)
        opp.set('tenant_id', tenantId)
        opp.set('title', cData.oppTitle)
        opp.set('value', cData.oppValue)
        opp.set('currency', 'BRL')
        opp.set('status', 'won')
        opp.set('servico', cData.servico)
        opp.set('assigned_to', cData.responsavel_id)
        opp.set('responsavel_id', cData.responsavel_id)
        opp.set('data_ganho', cData.data_assinatura)
        opp.set('closed_at', cData.data_assinatura)
        opp.set('soft_delete', false)
        app.save(opp)
        oppId = opp.id
      }

      let contractId = ''
      try {
        const existingContract = app.findFirstRecordByData('contracts', 'titulo', cData.titulo)
        contractId = existingContract.id
      } catch (_) {
        const cont = new Record(contractsCol)
        cont.set('tenant_id', tenantId)
        cont.set('titulo', cData.titulo)
        cont.set('valor', cData.valor)
        cont.set('status', cData.status)
        cont.set('sign_status', cData.sign_status)
        cont.set('oportunidade_id', oppId)
        cont.set('data_assinatura', cData.data_assinatura)
        cont.set('signed_at', cData.signed_at)
        cont.set('plataforma', 'zapsign')
        cont.set('sign_provider', 'zapsign')
        cont.set('historico', [
          {
            data: cData.data_assinatura,
            evento: 'Contrato assinado via ZapSign por todas as partes',
          },
        ])
        app.save(cont)
        contractId = cont.id
      }

      // Seed comissões vinculadas
      try {
        app.findFirstRecordByData('commissions', 'contrato_id', contractId)
      } catch (_) {
        const comm = new Record(commissionsCol)
        comm.set('tenant_id', tenantId)
        comm.set('usuario_id', cData.responsavel_id)
        comm.set('contrato_id', contractId)
        comm.set('oportunidade_id', oppId)
        comm.set('tipo', 'percentual')
        comm.set('percentual', cData.commPercent)
        comm.set('valor', (cData.valor * cData.commPercent) / 100)
        comm.set('status', cData.commStatus)
        comm.set('data_geracao', cData.data_assinatura)
        if (cData.commPagoData) {
          comm.set('data_pagamento', cData.commPagoData)
        }
        app.save(comm)
      }
    }

    // 4. Seed Metas Diversificadas
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    const goalsList = [
      {
        titulo: 'Meta Mensal de Receita Contratada - Comercial',
        tipo: 'valor',
        valor_alvo: 500000,
        equipe: 'comercial',
        periodo: 'mensal',
        data_inicio: startOfMonth,
        data_fim: endOfMonth,
        status: 'em_andamento',
      },
      {
        titulo: 'Meta de Faturamento Individual - Dra. Mariana Costa',
        tipo: 'valor',
        valor_alvo: 250000,
        usuario_id: marianaId,
        equipe: 'comercial',
        periodo: 'mensal',
        data_inicio: startOfMonth,
        data_fim: endOfMonth,
        status: 'em_andamento',
      },
      {
        titulo: 'Meta de Contratos Assinados - Dr. Rodrigo Albuquerque',
        tipo: 'contratos',
        valor_alvo: 4,
        usuario_id: rodrigoId,
        equipe: 'comercial',
        periodo: 'mensal',
        data_inicio: startOfMonth,
        data_fim: endOfMonth,
        status: 'em_andamento',
      },
      {
        titulo: 'Meta de Captação e Qualificação de Leads',
        tipo: 'leads',
        valor_alvo: 30,
        equipe: 'comercial',
        periodo: 'mensal',
        data_inicio: startOfMonth,
        data_fim: endOfMonth,
        status: 'em_andamento',
      },
    ]

    for (const g of goalsList) {
      try {
        app.findFirstRecordByData('goals', 'titulo', g.titulo)
      } catch (_) {
        const goalRec = new Record(goalsCol)
        goalRec.set('tenant_id', tenantId)
        goalRec.set('titulo', g.titulo)
        goalRec.set('tipo', g.tipo)
        goalRec.set('valor_alvo', g.valor_alvo)
        goalRec.set('equipe', g.equipe)
        if (g.usuario_id) goalRec.set('usuario_id', g.usuario_id)
        goalRec.set('periodo', g.periodo)
        goalRec.set('data_inicio', g.data_inicio)
        goalRec.set('data_fim', g.data_fim)
        goalRec.set('periodo_inicio', g.data_inicio)
        goalRec.set('periodo_fim', g.data_fim)
        goalRec.set('status', g.status)
        app.save(goalRec)
      }
    }
  },
  (app) => {},
)
