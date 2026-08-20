migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    const tenant = app.findFirstRecordByData('tenants', 'slug', 'skip-enterprise')
    const tenantId = tenant.id

    // 1. Seed Serviços Jurídicos
    const servicesCol = app.findCollectionByNameOrId('services')
    const legalServices = [
      {
        nome: 'Recuperação Tributária e Teses Fiscais',
        categoria: 'Consultoria',
        area: 'Direito Tributário',
        valor_padrao: 25000,
        status: 'ativo',
      },
      {
        nome: 'Planejamento Tributário Estruturado',
        categoria: 'Consultoria',
        area: 'Direito Tributário',
        valor_padrao: 18000,
        status: 'ativo',
      },
      {
        nome: 'Revisão de Contratos Bancários e Juros Abusivos',
        categoria: 'Contencioso',
        area: 'Direito Bancário',
        valor_padrao: 12000,
        status: 'ativo',
      },
      {
        nome: 'Defesa em Execução Fiscal e Blindagem',
        categoria: 'Contencioso',
        area: 'Direito Bancário',
        valor_padrao: 35000,
        status: 'ativo',
      },
      {
        nome: 'Auditoria e Compliance Trabalhista B2B',
        categoria: 'Consultoria',
        area: 'Direito Trabalhista',
        valor_padrao: 15000,
        status: 'ativo',
      },
      {
        nome: 'Defesa Trabalhista Patronal Estratégica',
        categoria: 'Contencioso',
        area: 'Direito Trabalhista',
        valor_padrao: 9500,
        status: 'ativo',
      },
      {
        nome: 'Ações de Alta Complexidade do Consumidor',
        categoria: 'Contencioso',
        area: 'Direito do Consumidor',
        valor_padrao: 7500,
        status: 'ativo',
      },
    ]

    for (const s of legalServices) {
      try {
        app.findFirstRecordByData('services', 'nome', s.nome)
      } catch (_) {
        const r = new Record(servicesCol)
        r.set('tenant_id', tenantId)
        r.set('nome', s.nome)
        r.set('categoria', s.categoria)
        r.set('area', s.area)
        r.set('valor_padrao', s.valor_padrao)
        r.set('status', s.status)
        r.set(
          'descricao',
          `Atuação especializada em ${s.area} para clientes corporativos e pessoas físicas de alto valor.`,
        )
        app.save(r)
      }
    }

    // 2. Seed Tags Padrão
    const tagsCol = app.findCollectionByNameOrId('tags')
    const defaultTags = [
      { nome: 'VIP', cor: '#e11d48', modulo: 'leads' },
      { nome: 'Urgente', cor: '#dc2626', modulo: 'tarefas' },
      { nome: 'Decisor', cor: '#2563eb', modulo: 'pessoas' },
      { nome: 'Grande Porte', cor: '#7c3aed', modulo: 'empresas' },
      { nome: 'Tributário', cor: '#059669', modulo: 'oportunidades' },
      { nome: 'Bancário', cor: '#0284c7', modulo: 'oportunidades' },
      { nome: 'Contrato Ativo', cor: '#16a34a', modulo: 'clientes' },
      { nome: 'Follow-up 24h', cor: '#d97706', modulo: 'leads' },
    ]

    for (const t of defaultTags) {
      try {
        app.findFirstRecordByData('tags', 'nome', t.nome)
      } catch (_) {
        const r = new Record(tagsCol)
        r.set('tenant_id', tenantId)
        r.set('nome', t.nome)
        r.set('cor', t.cor)
        r.set('modulo', t.modulo)
        app.save(r)
      }
    }

    // 3. Seed Templates
    const templatesCol = app.findCollectionByNameOrId('templates')
    const sampleTemplates = [
      {
        nome: 'Proposta Padrão - Consultoria Tributária',
        tipo: 'proposta',
        modulo: 'oportunidades',
        conteudo:
          'Prezado(a) {{cliente_nome}},\n\nApresentamos a proposta de assessoria jurídica especializada em Direito Tributário pelo escritório Teixeira & Nascimento Advogados.\n\nEscopo:\n- Levantamento de créditos fiscais e auditoria nos últimos 5 anos.\n- Elaboração de parecer técnico e ingresso com medida cabível.\n\nHonorários: R$ {{valor_total}}\nCondições: {{condicoes}}\n\nValidade da proposta: {{validade}}',
        variaveis: {
          cliente_nome: 'Nome do Cliente',
          valor_total: 'Valor Total (R$)',
          condicoes: 'Condições de Pagamento',
          validade: 'Data de Validade',
        },
      },
      {
        nome: 'Contrato de Prestação de Serviços Advocatícios',
        tipo: 'contrato',
        modulo: 'clientes',
        conteudo:
          'CONTRATO DE HONORÁRIOS ADVOCATÍCIOS\n\nCONTRATANTE: {{cliente_nome}}, CPF/CNPJ: {{cliente_documento}}.\nCONTRATADO: TEIXEIRA & NASCIMENTO – ADVOGADOS ASSOCIADOS.\n\nCLÁUSULA 1ª - DO OBJETO: Prestação de serviços jurídicos profissionais na área de {{servico_nome}}.\n\nCLÁUSULA 2ª - DOS HONORÁRIOS: Pela prestação dos serviços, o CONTRATANTE pagará o valor de R$ {{valor}}.',
        variaveis: {
          cliente_nome: 'Nome',
          cliente_documento: 'CPF/CNPJ',
          servico_nome: 'Serviço',
          valor: 'Valor Total',
        },
      },
      {
        nome: 'Primeiro Contato Rápido WhatsApp',
        tipo: 'mensagem',
        modulo: 'leads',
        conteudo:
          'Olá {{nome}}, tudo bem? Sou o Dr. Fabio do escritório Teixeira & Nascimento Advogados. Recebemos sua solicitação referente a {{servico}}. Podemos conversar 5 minutinhos para entender melhor o seu caso?',
        variaveis: { nome: 'Nome do Lead', servico: 'Área/Serviço Solicitado' },
      },
    ]

    for (const tpl of sampleTemplates) {
      try {
        app.findFirstRecordByData('templates', 'nome', tpl.nome)
      } catch (_) {
        const r = new Record(templatesCol)
        r.set('tenant_id', tenantId)
        r.set('nome', tpl.nome)
        r.set('tipo', tpl.tipo)
        r.set('modulo', tpl.modulo)
        r.set('conteudo', tpl.conteudo)
        r.set('variaveis', tpl.variaveis)
        app.save(r)
      }
    }

    // 4. Seed Empresas e Pessoas de Exemplo
    const empresasCol = app.findCollectionByNameOrId('empresas')
    const pessoasCol = app.findCollectionByNameOrId('pessoas')

    let emp1Id = ''
    try {
      const existing = app.findFirstRecordByData('empresas', 'cnpj', '12.345.678/0001-90')
      emp1Id = existing.id
    } catch (_) {
      const emp = new Record(empresasCol)
      emp.set('tenant_id', tenantId)
      emp.set('razao_social', 'Grupo Vanguarda Logística e Transportes S.A.')
      emp.set('nome_fantasia', 'Vanguarda Logística')
      emp.set('cnpj', '12.345.678/0001-90')
      emp.set('segmento', 'Transportes & Logística')
      emp.set('porte', 'Grande Porte')
      emp.set('cidade', 'São Paulo')
      emp.set('estado', 'SP')
      emp.set('site', 'https://vanguardalog.com.br')
      emp.set('telefone', '(11) 3450-9900')
      emp.set(
        'observacoes',
        'Empresa com passivo tributário e oportunidades de recuperação de PIS/COFINS.',
      )
      app.save(emp)
      emp1Id = emp.id
    }

    let emp2Id = ''
    try {
      const existing2 = app.findFirstRecordByData('empresas', 'cnpj', '98.765.432/0001-11')
      emp2Id = existing2.id
    } catch (_) {
      const emp2 = new Record(empresasCol)
      emp2.set('tenant_id', tenantId)
      emp2.set('razao_social', 'InovaTech Soluções Digitais Ltda.')
      emp2.set('nome_fantasia', 'InovaTech')
      emp2.set('cnpj', '98.765.432/0001-11')
      emp2.set('segmento', 'Tecnologia & Software')
      emp2.set('porte', 'Médio Porte')
      emp2.set('cidade', 'Campinas')
      emp2.set('estado', 'SP')
      emp2.set('site', 'https://inovatech.io')
      emp2.set('telefone', '(19) 3890-4400')
      emp2.set(
        'observacoes',
        'Empresa buscando revisão de contratos bancários e compliance trabalhista.',
      )
      app.save(emp2)
      emp2Id = emp2.id
    }

    try {
      app.findFirstRecordByData('pessoas', 'email', 'carlos.mendonca@vanguardalog.com.br')
    } catch (_) {
      const p1 = new Record(pessoasCol)
      p1.set('tenant_id', tenantId)
      p1.set('nome', 'Dr. Carlos Mendonça')
      p1.set('email', 'carlos.mendonca@vanguardalog.com.br')
      p1.set('telefone', '(11) 98765-4321')
      p1.set('whatsapp', '(11) 98765-4321')
      p1.set('cpf', '123.456.789-00')
      p1.set('cargo', 'Diretor Financeiro / CFO')
      p1.set('empresa_id', emp1Id)
      p1.set('tags', ['Decisor', 'VIP'])
      p1.set('observacoes', 'Principal decisor para contratações tributárias.')
      app.save(p1)
    }

    // 5. Seed Campanhas de Marketing
    const campaignsCol = app.findCollectionByNameOrId('campaigns')
    const adminUser = app.findFirstRecordByData(
      '_pb_users_auth_',
      'email',
      'fabio.saantost@gmail.com',
    )

    try {
      app.findFirstRecordByData('campaigns', 'nome', 'Meta Ads - Recuperação PIS/COFINS Q3')
    } catch (_) {
      const camp1 = new Record(campaignsCol)
      camp1.set('tenant_id', tenantId)
      camp1.set('nome', 'Meta Ads - Recuperação PIS/COFINS Q3')
      camp1.set('plataforma', 'meta_ads')
      camp1.set('orcamento', 15000)
      camp1.set('investimento', 8450)
      camp1.set('data_inicio', '2026-07-01')
      camp1.set('data_fim', '2026-09-30')
      camp1.set('objetivo', 'Geração de Leads B2B Qualificados')
      camp1.set('responsavel_id', adminUser.id)
      camp1.set('status', 'ativa')
      camp1.set('metricas', {
        impressoes: 142000,
        cliques: 3840,
        ctr: 2.7,
        cpc: 2.2,
        leads: 94,
        oportunidades: 22,
        contratos: 6,
        receita: 150000,
        roas: 17.75,
      })
      app.save(camp1)
    }

    try {
      app.findFirstRecordByData('campaigns', 'nome', 'Google Ads - Defesa Bancária Empresarial')
    } catch (_) {
      const camp2 = new Record(campaignsCol)
      camp2.set('tenant_id', tenantId)
      camp2.set('nome', 'Google Ads - Defesa Bancária Empresarial')
      camp2.set('plataforma', 'google_ads')
      camp2.set('orcamento', 10000)
      camp2.set('investimento', 6200)
      camp2.set('data_inicio', '2026-07-15')
      camp2.set('data_fim', '2026-09-30')
      camp2.set('objetivo', 'Pesquisa Fundo de Funil')
      camp2.set('responsavel_id', adminUser.id)
      camp2.set('status', 'ativa')
      camp2.set('metricas', {
        impressoes: 48000,
        cliques: 1920,
        ctr: 4.0,
        cpc: 3.23,
        leads: 58,
        oportunidades: 15,
        contratos: 4,
        receita: 88000,
        roas: 14.19,
      })
      app.save(camp2)
    }

    // 6. Seed Metas Comerciais
    const goalsCol = app.findCollectionByNameOrId('goals')
    try {
      app.findFirstRecordByData('goals', 'titulo', 'Meta de Faturamento Q3 - R$ 500k')
    } catch (_) {
      const g1 = new Record(goalsCol)
      g1.set('tenant_id', tenantId)
      g1.set('titulo', 'Meta de Faturamento Q3 - R$ 500k')
      g1.set('tipo', 'receita')
      g1.set('valor_alvo', 500000)
      g1.set('valor_atual', 364000)
      g1.set('usuario_id', adminUser.id)
      g1.set('equipe', 'Tributário & Bancário')
      g1.set('periodo_inicio', '2026-07-01')
      g1.set('periodo_fim', '2026-09-30')
      g1.set('status', 'em_andamento')
      app.save(g1)
    }

    // 7. Seed SLAs
    const slaCol = app.findCollectionByNameOrId('sla_configs')
    try {
      app.findFirstRecordByData('sla_configs', 'equipe', 'Comercial Geral')
    } catch (_) {
      const sla1 = new Record(slaCol)
      sla1.set('tenant_id', tenantId)
      sla1.set('equipe', 'Comercial Geral')
      sla1.set('origem', 'Meta Ads')
      sla1.set('prioridade', 'alta')
      sla1.set('tempo_resposta_minutos', 15)
      sla1.set('horario_inicio', '08:00')
      sla1.set('horario_fim', '19:00')
      sla1.set('dias_semana', ['seg', 'ter', 'qua', 'qui', 'sex'])
      sla1.set('ativo', true)
      app.save(sla1)
    }

    // 8. Seed Automação
    const automationsCol = app.findCollectionByNameOrId('automations')
    try {
      app.findFirstRecordByData('automations', 'nome', 'Qualificação Automática Meta Ads')
    } catch (_) {
      const auto1 = new Record(automationsCol)
      auto1.set('tenant_id', tenantId)
      auto1.set('nome', 'Qualificação Automática Meta Ads')
      auto1.set('gatilho', 'novo_lead')
      auto1.set('condicoes', { origem: 'Meta Ads', temperatura: 'hot' })
      auto1.set('acoes', [
        {
          tipo: 'criar_tarefa',
          titulo: 'Primeiro contato WhatsApp em até 15 min',
          prioridade: 'urgente',
        },
        { tipo: 'enviar_notificacao', canal: 'sistema' },
      ])
      auto1.set('ativo', true)
      auto1.set('execucoes', 47)
      app.save(auto1)
    }
  },
  (app) => {},
)
