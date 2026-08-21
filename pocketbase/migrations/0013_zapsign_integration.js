migrate(
  (app) => {
    // 1. Garantir coleção integration_configs com os campos especificados
    if (!app.hasTable('integration_configs')) {
      const integrationConfigs = new Collection({
        name: 'integration_configs',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
        viewRule:
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '') && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '') && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
        fields: [
          { name: 'tenant_id', type: 'text', required: true },
          { name: 'provider', type: 'text', required: true },
          { name: 'api_token', type: 'text' },
          { name: 'webhook_secret', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_integration_configs_tenant ON integration_configs (tenant_id)',
          'CREATE UNIQUE INDEX idx_integration_configs_tenant_provider ON integration_configs (tenant_id, provider)',
        ],
      })
      app.save(integrationConfigs)
    } else {
      const col = app.findCollectionByNameOrId('integration_configs')
      if (!col.fields.getByName('api_token')) {
        col.fields.add(new TextField({ name: 'api_token' }))
      }
      if (!col.fields.getByName('webhook_secret')) {
        col.fields.add(new TextField({ name: 'webhook_secret' }))
      }
      if (!col.fields.getByName('is_active')) {
        col.fields.add(new BoolField({ name: 'is_active' }))
      }
      // Ajustar regras de acesso
      col.listRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      col.viewRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      col.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '')"
      col.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '') && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = '' || @request.auth.id != '') && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(col)
    }

    // 2. Atualizar a coleção contracts garantindo todos os campos
    if (app.hasTable('contracts')) {
      const contractsCol = app.findCollectionByNameOrId('contracts')
      if (!contractsCol.fields.getByName('zapsign_doc_id')) {
        contractsCol.fields.add(new TextField({ name: 'zapsign_doc_id' }))
      }
      if (!contractsCol.fields.getByName('signing_link')) {
        contractsCol.fields.add(new TextField({ name: 'signing_link' }))
      }
      if (!contractsCol.fields.getByName('sign_url')) {
        contractsCol.fields.add(new TextField({ name: 'sign_url' }))
      }
      if (!contractsCol.fields.getByName('sent_at')) {
        contractsCol.fields.add(new DateField({ name: 'sent_at' }))
      }
      if (!contractsCol.fields.getByName('signed_at')) {
        contractsCol.fields.add(new DateField({ name: 'signed_at' }))
      }
      if (!contractsCol.fields.getByName('status')) {
        contractsCol.fields.add(new TextField({ name: 'status' }))
      }
      app.save(contractsCol)
    }
  },
  (app) => {
    // Revert logic se necessário
  },
)
