migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const leads = app.findCollectionByNameOrId('leads')
    const customers = app.findCollectionByNameOrId('customers')
    const pipelines = app.findCollectionByNameOrId('pipelines')
    const stages = app.findCollectionByNameOrId('pipeline_stages')
    const opportunities = app.findCollectionByNameOrId('opportunities')

    // 1. Criar empresas primeiro (pois pessoas e leads podem referenciar)
    const empresas = new Collection({
      name: 'empresas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'razao_social', type: 'text', required: true },
        { name: 'nome_fantasia', type: 'text' },
        { name: 'cnpj', type: 'text' },
        { name: 'segmento', type: 'text' },
        { name: 'porte', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'estado', type: 'text' },
        { name: 'site', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_empresas_tenant ON empresas (tenant_id)'],
    })
    app.save(empresas)

    // 2. Criar pessoas
    const pessoas = new Collection({
      name: 'pessoas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'cpf', type: 'text' },
        { name: 'cargo', type: 'text' },
        { name: 'empresa_id', type: 'relation', collectionId: empresas.id, maxSelect: 1 },
        { name: 'tags', type: 'json' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pessoas_tenant ON pessoas (tenant_id)'],
    })
    app.save(pessoas)

    // 3. Criar serviços
    const services = new Collection({
      name: 'services',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'categoria', type: 'text' },
        { name: 'area', type: 'text' },
        { name: 'valor_padrao', type: 'number' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_services_tenant ON services (tenant_id)'],
    })
    app.save(services)

    // 4. Criar tags
    const tags = new Collection({
      name: 'tags',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'cor', type: 'text' },
        { name: 'modulo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tags_tenant ON tags (tenant_id)'],
    })
    app.save(tags)

    // 5. Criar custom_fields
    const customFields = new Collection({
      name: 'custom_fields',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'modulo', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'tipo', type: 'text', required: true },
        { name: 'opcoes', type: 'json' },
        { name: 'obrigatorio', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(customFields)

    // 6. Criar templates
    const templates = new Collection({
      name: 'templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'tipo', type: 'text', required: true },
        { name: 'conteudo', type: 'text' },
        { name: 'variaveis', type: 'json' },
        { name: 'modulo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(templates)

    // 7. Criar proposals
    const proposals = new Collection({
      name: 'proposals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'lead_id', type: 'relation', collectionId: leads.id, maxSelect: 1 },
        { name: 'cliente_id', type: 'relation', collectionId: customers.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'responsavel_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'template_id', type: 'relation', collectionId: templates.id, maxSelect: 1 },
        { name: 'valor', type: 'number' },
        { name: 'desconto', type: 'number' },
        { name: 'valor_total', type: 'number' },
        { name: 'validade', type: 'date' },
        { name: 'servicos', type: 'json' },
        { name: 'condicoes', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'data_envio', type: 'date' },
        { name: 'data_visualizacao', type: 'date' },
        { name: 'data_aceite', type: 'date' },
        { name: 'data_recusa', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_proposals_tenant ON proposals (tenant_id)'],
    })
    app.save(proposals)

    // 8. Criar contracts
    const contracts = new Collection({
      name: 'contracts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'proposta_id', type: 'relation', collectionId: proposals.id, maxSelect: 1 },
        { name: 'cliente_id', type: 'relation', collectionId: customers.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'titulo', type: 'text', required: true },
        { name: 'valor', type: 'number' },
        { name: 'status', type: 'text' },
        { name: 'plataforma', type: 'text' },
        { name: 'documento_url', type: 'text' },
        { name: 'data_envio', type: 'date' },
        { name: 'data_visualizacao', type: 'date' },
        { name: 'data_assinatura', type: 'date' },
        { name: 'data_recusa', type: 'date' },
        { name: 'historico', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_contracts_tenant ON contracts (tenant_id)'],
    })
    app.save(contracts)

    // 9. Criar tasks
    const tasks = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'tipo', type: 'text' },
        { name: 'responsavel_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'lead_id', type: 'relation', collectionId: leads.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'cliente_id', type: 'relation', collectionId: customers.id, maxSelect: 1 },
        { name: 'data', type: 'date' },
        { name: 'horario', type: 'text' },
        { name: 'prioridade', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'recorrencia', type: 'text' },
        { name: 'data_conclusao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tasks_tenant ON tasks (tenant_id)'],
    })
    app.save(tasks)

    // 10. Criar notes
    const notes = new Collection({
      name: 'notes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'autor_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'lead_id', type: 'relation', collectionId: leads.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'cliente_id', type: 'relation', collectionId: customers.id, maxSelect: 1 },
        { name: 'conversa_id', type: 'text' },
        { name: 'fixada', type: 'bool' },
        { name: 'categoria', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_notes_tenant ON notes (tenant_id)'],
    })
    app.save(notes)

    // 11. Criar campaigns
    const campaigns = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'plataforma', type: 'text' },
        { name: 'orcamento', type: 'number' },
        { name: 'investimento', type: 'number' },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        { name: 'objetivo', type: 'text' },
        { name: 'responsavel_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'status', type: 'text' },
        { name: 'metricas', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_campaigns_tenant ON campaigns (tenant_id)'],
    })
    app.save(campaigns)

    // 12. Criar ads
    const ads = new Collection({
      name: 'ads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'campanha_id', type: 'relation', collectionId: campaigns.id, maxSelect: 1 },
        { name: 'plataforma', type: 'text' },
        { name: 'nome', type: 'text', required: true },
        { name: 'conjunto', type: 'text' },
        { name: 'ad_id_externo', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'leads', type: 'number' },
        { name: 'oportunidades', type: 'number' },
        { name: 'contratos', type: 'number' },
        { name: 'receita', type: 'number' },
        { name: 'metricas', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(ads)

    // 13. Criar goals (metas)
    const goals = new Collection({
      name: 'goals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'tipo', type: 'text' },
        { name: 'valor_alvo', type: 'number' },
        { name: 'valor_atual', type: 'number' },
        { name: 'usuario_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'equipe', type: 'text' },
        { name: 'periodo_inicio', type: 'date' },
        { name: 'periodo_fim', type: 'date' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(goals)

    // 14. Criar commissions
    const commissions = new Collection({
      name: 'commissions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'usuario_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'contrato_id', type: 'relation', collectionId: contracts.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'tipo', type: 'text' },
        { name: 'valor', type: 'number' },
        { name: 'percentual', type: 'number' },
        { name: 'status', type: 'text' },
        { name: 'data_geracao', type: 'date' },
        { name: 'data_pagamento', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(commissions)

    // 15. Criar segments
    const segments = new Collection({
      name: 'segments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'criterios', type: 'json' },
        { name: 'modulo', type: 'text' },
        { name: 'dinamico', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(segments)

    // 16. Criar conversion_events
    const conversionEvents = new Collection({
      name: 'conversion_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'lead_id', type: 'relation', collectionId: leads.id, maxSelect: 1 },
        { name: 'oportunidade_id', type: 'relation', collectionId: opportunities.id, maxSelect: 1 },
        { name: 'cliente_id', type: 'relation', collectionId: customers.id, maxSelect: 1 },
        { name: 'tipo', type: 'text', required: true },
        { name: 'plataforma', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'event_id', type: 'text' },
        { name: 'payload', type: 'json' },
        { name: 'tentativas', type: 'number' },
        { name: 'data_envio', type: 'date' },
        { name: 'resposta', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(conversionEvents)

    // 17. Criar processing_queue
    const processingQueue = new Collection({
      name: 'processing_queue',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'evento', type: 'text', required: true },
        { name: 'payload', type: 'json' },
        { name: 'status', type: 'text' },
        { name: 'tentativas', type: 'number' },
        { name: 'max_tentativas', type: 'number' },
        { name: 'erro_msg', type: 'text' },
        { name: 'data_processamento', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(processingQueue)

    // 18. Criar sla_configs
    const slaConfigs = new Collection({
      name: 'sla_configs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'equipe', type: 'text' },
        { name: 'origem', type: 'text' },
        { name: 'prioridade', type: 'text' },
        { name: 'tempo_resposta_minutos', type: 'number' },
        { name: 'horario_inicio', type: 'text' },
        { name: 'horario_fim', type: 'text' },
        { name: 'dias_semana', type: 'json' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(slaConfigs)

    // 19. Criar lead_distribution
    const leadDistribution = new Collection({
      name: 'lead_distribution',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'metodo', type: 'text', required: true },
        { name: 'equipe_id', type: 'text' },
        { name: 'regras', type: 'json' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(leadDistribution)

    // 20. Criar message_templates
    const messageTemplates = new Collection({
      name: 'message_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'canal', type: 'text' },
        { name: 'conteudo', type: 'text' },
        { name: 'tipo', type: 'text' },
        { name: 'variaveis', type: 'json' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(messageTemplates)

    // 21. Criar automations (regras de automação)
    const automations = new Collection({
      name: 'automations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenants.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'gatilho', type: 'text', required: true },
        { name: 'condicoes', type: 'json' },
        { name: 'acoes', type: 'json' },
        { name: 'ativo', type: 'bool' },
        { name: 'execucoes', type: 'number' },
        { name: 'ultima_execucao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(automations)

    // 22. Atualizar coleções existentes com novos campos necessários
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('cpf_cnpj'))
      leadsCol.fields.add(new TextField({ name: 'cpf_cnpj' }))
    if (!leadsCol.fields.getByName('pessoa_fisica_juridica'))
      leadsCol.fields.add(new TextField({ name: 'pessoa_fisica_juridica' }))
    if (!leadsCol.fields.getByName('empresa_id'))
      leadsCol.fields.add(
        new RelationField({ name: 'empresa_id', collectionId: empresas.id, maxSelect: 1 }),
      )
    if (!leadsCol.fields.getByName('estado')) leadsCol.fields.add(new TextField({ name: 'estado' }))
    if (!leadsCol.fields.getByName('origem')) leadsCol.fields.add(new TextField({ name: 'origem' }))
    if (!leadsCol.fields.getByName('conjunto'))
      leadsCol.fields.add(new TextField({ name: 'conjunto' }))
    if (!leadsCol.fields.getByName('anuncio'))
      leadsCol.fields.add(new TextField({ name: 'anuncio' }))
    if (!leadsCol.fields.getByName('area')) leadsCol.fields.add(new TextField({ name: 'area' }))
    if (!leadsCol.fields.getByName('tags')) leadsCol.fields.add(new JSONField({ name: 'tags' }))
    if (!leadsCol.fields.getByName('observacoes'))
      leadsCol.fields.add(new TextField({ name: 'observacoes' }))
    if (!leadsCol.fields.getByName('landing_page'))
      leadsCol.fields.add(new TextField({ name: 'landing_page' }))
    if (!leadsCol.fields.getByName('url_origem'))
      leadsCol.fields.add(new TextField({ name: 'url_origem' }))
    if (!leadsCol.fields.getByName('proxima_acao'))
      leadsCol.fields.add(new TextField({ name: 'proxima_acao' }))
    if (!leadsCol.fields.getByName('soft_delete'))
      leadsCol.fields.add(new BoolField({ name: 'soft_delete' }))
    app.save(leadsCol)

    const customersCol = app.findCollectionByNameOrId('customers')
    if (!customersCol.fields.getByName('lead_origem_id'))
      customersCol.fields.add(
        new RelationField({ name: 'lead_origem_id', collectionId: leads.id, maxSelect: 1 }),
      )
    if (!customersCol.fields.getByName('pessoa_id'))
      customersCol.fields.add(
        new RelationField({ name: 'pessoa_id', collectionId: pessoas.id, maxSelect: 1 }),
      )
    if (!customersCol.fields.getByName('empresa_id'))
      customersCol.fields.add(
        new RelationField({ name: 'empresa_id', collectionId: empresas.id, maxSelect: 1 }),
      )
    if (!customersCol.fields.getByName('data_conversao'))
      customersCol.fields.add(new DateField({ name: 'data_conversao' }))
    if (!customersCol.fields.getByName('valor_total_contratado'))
      customersCol.fields.add(new NumberField({ name: 'valor_total_contratado' }))
    if (!customersCol.fields.getByName('servicos_contratados'))
      customersCol.fields.add(new JSONField({ name: 'servicos_contratados' }))
    if (!customersCol.fields.getByName('tags'))
      customersCol.fields.add(new JSONField({ name: 'tags' }))
    if (!customersCol.fields.getByName('observacoes'))
      customersCol.fields.add(new TextField({ name: 'observacoes' }))
    if (!customersCol.fields.getByName('responsavel_id'))
      customersCol.fields.add(
        new RelationField({ name: 'responsavel_id', collectionId: users.id, maxSelect: 1 }),
      )
    app.save(customersCol)

    const opportunitiesCol = app.findCollectionByNameOrId('opportunities')
    if (!opportunitiesCol.fields.getByName('servico'))
      opportunitiesCol.fields.add(new TextField({ name: 'servico' }))
    if (!opportunitiesCol.fields.getByName('area'))
      opportunitiesCol.fields.add(new TextField({ name: 'area' }))
    if (!opportunitiesCol.fields.getByName('probabilidade'))
      opportunitiesCol.fields.add(new NumberField({ name: 'probabilidade' }))
    if (!opportunitiesCol.fields.getByName('origem'))
      opportunitiesCol.fields.add(new TextField({ name: 'origem' }))
    if (!opportunitiesCol.fields.getByName('campanha'))
      opportunitiesCol.fields.add(new TextField({ name: 'campanha' }))
    if (!opportunitiesCol.fields.getByName('conjunto'))
      opportunitiesCol.fields.add(new TextField({ name: 'conjunto' }))
    if (!opportunitiesCol.fields.getByName('anuncio'))
      opportunitiesCol.fields.add(new TextField({ name: 'anuncio' }))
    if (!opportunitiesCol.fields.getByName('prazo'))
      opportunitiesCol.fields.add(new TextField({ name: 'prazo' }))
    if (!opportunitiesCol.fields.getByName('previsao_fechamento'))
      opportunitiesCol.fields.add(new DateField({ name: 'previsao_fechamento' }))
    if (!opportunitiesCol.fields.getByName('data_ganho'))
      opportunitiesCol.fields.add(new DateField({ name: 'data_ganho' }))
    if (!opportunitiesCol.fields.getByName('data_perda'))
      opportunitiesCol.fields.add(new DateField({ name: 'data_perda' }))
    if (!opportunitiesCol.fields.getByName('observacoes'))
      opportunitiesCol.fields.add(new TextField({ name: 'observacoes' }))
    if (!opportunitiesCol.fields.getByName('soft_delete'))
      opportunitiesCol.fields.add(new BoolField({ name: 'soft_delete' }))
    app.save(opportunitiesCol)
  },
  (app) => {
    // Revert operations
  },
)
