migrate(
  (app) => {
    // 1. Update contracts collection to add external_id, sign_url, external_provider
    const contractsCol = app.findCollectionByNameOrId('contracts')
    if (!contractsCol.fields.getByName('external_id')) {
      contractsCol.fields.add(new TextField({ name: 'external_id' }))
    }
    if (!contractsCol.fields.getByName('sign_url')) {
      contractsCol.fields.add(new TextField({ name: 'sign_url' }))
    }
    if (!contractsCol.fields.getByName('external_provider')) {
      contractsCol.fields.add(new TextField({ name: 'external_provider' }))
    }
    app.save(contractsCol)

    // 2. Create system secrets collection (for backend-only secrets storage per tenant or global)
    // Accessible only by admin / backend hooks (API rules set to null for users or auth write)
    if (!app.hasTable('system_secrets')) {
      const secretsCol = new Collection({
        name: 'system_secrets',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'key', type: 'text', required: true },
          { name: 'value', type: 'text', required: true },
          { name: 'tenant_id', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_secrets_key_tenant ON system_secrets (key, tenant_id)'],
      })
      app.save(secretsCol)
    }
  },
  (app) => {
    // Revert
    try {
      const secretsCol = app.findCollectionByNameOrId('system_secrets')
      app.delete(secretsCol)
    } catch (_) {}
  },
)
