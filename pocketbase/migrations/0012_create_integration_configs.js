migrate(
  (app) => {
    // 1. Criar coleção integration_configs se não existir
    if (!app.hasTable('integration_configs')) {
      const integrationConfigs = new Collection({
        name: 'integration_configs',
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
          { name: 'tenant_id', type: 'text', required: true },
          {
            name: 'provider',
            type: 'select',
            required: true,
            values: ['zapsign', 'clicksign', 'whatsapp', 'meta_ads', 'google_ads', 'calendly'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['active', 'inactive', 'error'],
            maxSelect: 1,
          },
          { name: 'config', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_integration_configs_tenant ON integration_configs (tenant_id)',
          'CREATE UNIQUE INDEX idx_integration_configs_tenant_provider ON integration_configs (tenant_id, provider)',
        ],
      })
      app.save(integrationConfigs)
    }

    // 2. Atualizar a coleção contracts para garantir todos os campos necessários da integração
    const contractsCol = app.findCollectionByNameOrId('contracts')
    if (!contractsCol.fields.getByName('zapsign_doc_id')) {
      contractsCol.fields.add(new TextField({ name: 'zapsign_doc_id' }))
    }
    if (!contractsCol.fields.getByName('sign_url')) {
      contractsCol.fields.add(new TextField({ name: 'sign_url' }))
    }
    if (!contractsCol.fields.getByName('external_status')) {
      contractsCol.fields.add(new TextField({ name: 'external_status' }))
    }
    if (!contractsCol.fields.getByName('sent_at')) {
      contractsCol.fields.add(new DateField({ name: 'sent_at' }))
    }
    if (!contractsCol.fields.getByName('signed_at')) {
      contractsCol.fields.add(new DateField({ name: 'signed_at' }))
    }
    app.save(contractsCol)
  },
  (app) => {
    try {
      const integrationConfigs = app.findCollectionByNameOrId('integration_configs')
      app.delete(integrationConfigs)
    } catch (_) {}
  },
)
