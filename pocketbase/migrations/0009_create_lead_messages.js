migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const leads = app.findCollectionByNameOrId('leads')

    // 1. Criar coleção lead_messages
    const leadMessages = new Collection({
      name: 'lead_messages',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      viewRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      deleteRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      fields: [
        {
          name: 'tenant_id',
          type: 'text',
          required: true,
        },
        {
          name: 'lead_id',
          type: 'relation',
          required: true,
          collectionId: leads.id,
          maxSelect: 1,
        },
        {
          name: 'author_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        {
          name: 'team',
          type: 'select',
          required: true,
          values: ['comercial', 'juridico', 'financeiro'],
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          values: ['nota', 'sistema'],
          maxSelect: 1,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lead_messages_lead ON lead_messages (lead_id, created)',
        'CREATE INDEX idx_lead_messages_tenant ON lead_messages (tenant_id)',
      ],
    })
    app.save(leadMessages)

    // 2. Adicionar campo team_owner na coleção leads se não existir
    if (!leads.fields.getByName('team_owner')) {
      leads.fields.add(
        new SelectField({
          name: 'team_owner',
          values: ['comercial', 'juridico', 'financeiro'],
          maxSelect: 1,
        }),
      )
      app.save(leads)
    }
  },
  (app) => {
    try {
      const leadMessages = app.findCollectionByNameOrId('lead_messages')
      app.delete(leadMessages)
    } catch (_) {}

    try {
      const leads = app.findCollectionByNameOrId('leads')
      if (leads.fields.getByName('team_owner')) {
        leads.fields.removeByName('team_owner')
        app.save(leads)
      }
    } catch (_) {}
  },
)
