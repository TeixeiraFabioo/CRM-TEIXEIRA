migrate(
  (app) => {
    // 1. Atualizar coleção integration_configs
    let integrationCol
    if (!app.hasTable('integration_configs')) {
      integrationCol = new Collection({
        name: 'integration_configs',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'tenant_id', type: 'text', required: true },
          { name: 'provider', type: 'text', required: true },
          { name: 'api_token', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['connected', 'error', 'disabled', 'active', 'inactive'],
            maxSelect: 1,
          },
          { name: 'config_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_integration_configs_tenant ON integration_configs (tenant_id)',
          'CREATE UNIQUE INDEX idx_integration_configs_tenant_provider ON integration_configs (tenant_id, provider)',
        ],
      })
      app.save(integrationCol)
    } else {
      integrationCol = app.findCollectionByNameOrId('integration_configs')
      if (!integrationCol.fields.getByName('api_token')) {
        integrationCol.fields.add(new TextField({ name: 'api_token' }))
      }
      if (!integrationCol.fields.getByName('config_json')) {
        integrationCol.fields.add(new JSONField({ name: 'config_json' }))
      }

      // Ajustar regras de acesso: legível e gravável apenas pelo admin do tenant / backend
      integrationCol.listRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrationCol.viewRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrationCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      integrationCol.updateRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrationCol.deleteRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      app.save(integrationCol)
    }

    // 2. Atualizar coleção contracts
    if (app.hasTable('contracts')) {
      const contractsCol = app.findCollectionByNameOrId('contracts')

      if (!contractsCol.fields.getByName('sign_provider')) {
        contractsCol.fields.add(new TextField({ name: 'sign_provider' }))
      }
      if (!contractsCol.fields.getByName('sign_document_id')) {
        contractsCol.fields.add(new TextField({ name: 'sign_document_id' }))
      }
      if (!contractsCol.fields.getByName('sign_link')) {
        contractsCol.fields.add(new TextField({ name: 'sign_link' }))
      }
      if (!contractsCol.fields.getByName('sign_status')) {
        contractsCol.fields.add(
          new SelectField({
            name: 'sign_status',
            required: false,
            values: ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'],
            maxSelect: 1,
          }),
        )
      }
      if (!contractsCol.fields.getByName('sign_events')) {
        contractsCol.fields.add(new JSONField({ name: 'sign_events' }))
      }

      // Regras de acesso: legível/gravável por usuários autenticados do tenant
      contractsCol.listRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      contractsCol.viewRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      contractsCol.createRule = "@request.auth.id != ''"
      contractsCol.updateRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      contractsCol.deleteRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      app.save(contractsCol)
    }
  },
  (app) => {
    // Revert logic se necessário
  },
)
