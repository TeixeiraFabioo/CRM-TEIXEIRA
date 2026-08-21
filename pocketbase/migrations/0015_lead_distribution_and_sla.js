migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const leads = app.findCollectionByNameOrId('leads')

    // 1. Atualizar sla_configs com first_response_minutes, is_active se não existirem
    const slaCol = app.findCollectionByNameOrId('sla_configs')
    if (!slaCol.fields.getByName('first_response_minutes')) {
      slaCol.fields.add(new NumberField({ name: 'first_response_minutes' }))
    }
    if (!slaCol.fields.getByName('is_active')) {
      slaCol.fields.add(new BoolField({ name: 'is_active' }))
    }
    app.save(slaCol)

    // Sincronizar dados existentes de sla_configs (tempo_resposta_minutos -> first_response_minutes, ativo -> is_active)
    try {
      app
        .db()
        .newQuery(`
        UPDATE sla_configs 
        SET first_response_minutes = tempo_resposta_minutos 
        WHERE (first_response_minutes IS NULL OR first_response_minutes = 0) AND tempo_resposta_minutos IS NOT NULL;
      `)
        .execute()
      app
        .db()
        .newQuery(`
        UPDATE sla_configs 
        SET is_active = ativo 
        WHERE is_active IS NULL AND ativo IS NOT NULL;
      `)
        .execute()
    } catch (_) {}

    // 2. Criar coleção lead_distribution_logs (para registrar distribuições individuais de cada lead)
    let distLogsCol
    try {
      distLogsCol = app.findCollectionByNameOrId('lead_distribution_logs')
    } catch (_) {
      distLogsCol = new Collection({
        name: 'lead_distribution_logs',
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
            type: 'relation',
            required: true,
            collectionId: tenants.id,
            maxSelect: 1,
          },
          {
            name: 'lead_id',
            type: 'relation',
            required: true,
            collectionId: leads.id,
            maxSelect: 1,
          },
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: users.id,
            maxSelect: 1,
          },
          {
            name: 'distribution_method',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(distLogsCol)
    }

    // 3. Atualizar lead_distribution com campos adicionais caso usado como config ou log
    const distCol = app.findCollectionByNameOrId('lead_distribution')
    if (!distCol.fields.getByName('lead_id')) {
      distCol.fields.add(
        new RelationField({ name: 'lead_id', collectionId: leads.id, maxSelect: 1 }),
      )
    }
    if (!distCol.fields.getByName('user_id')) {
      distCol.fields.add(
        new RelationField({ name: 'user_id', collectionId: users.id, maxSelect: 1 }),
      )
    }
    if (!distCol.fields.getByName('distribution_method')) {
      distCol.fields.add(new TextField({ name: 'distribution_method' }))
    }
    if (!distCol.fields.getByName('is_active')) {
      distCol.fields.add(new BoolField({ name: 'is_active' }))
    }
    app.save(distCol)

    // 4. Garantir campo responsavel_id na coleção leads
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('responsavel_id')) {
      leadsCol.fields.add(
        new RelationField({ name: 'responsavel_id', collectionId: users.id, maxSelect: 1 }),
      )
      app.save(leadsCol)
    }
  },
  (app) => {
    // down
    try {
      const distLogsCol = app.findCollectionByNameOrId('lead_distribution_logs')
      app.delete(distLogsCol)
    } catch (_) {}
  },
)
