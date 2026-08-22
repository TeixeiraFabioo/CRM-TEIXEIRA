// Migration 0024 — Fila de eventos da Meta Conversions API (CAPI)
// Cria a coleção `capi_events` que armazena eventos server-side a serem
// enviados para a Meta via Conversions API.
//
// Idempotente: só cria a coleção se ela ainda não existir.
migrate(
  (app) => {
    if (app.hasTable('capi_events')) return

    const tenantsColId = app.findCollectionByNameOrId('tenants').id

    const capiEvents = new Collection({
      name: 'capi_events',
      type: 'base',
      listRule: "@request.auth.id != '' && tenant_id = @request.auth.tenant_id",
      viewRule: "@request.auth.id != '' && tenant_id = @request.auth.tenant_id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && tenant_id = @request.auth.tenant_id",
      deleteRule: "@request.auth.id != '' && tenant_id = @request.auth.tenant_id",
      fields: [
        {
          name: 'tenant_id',
          type: 'relation',
          required: true,
          collectionId: tenantsColId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'event_name', type: 'text' },
        { name: 'event_data', type: 'json' },
        { name: 'user_data', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'sent', 'failed'],
          maxSelect: 1,
        },
        { name: 'error_message', type: 'text' },
        { name: 'attempts', type: 'number', onlyInt: true, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_capi_events_tenant ON capi_events (tenant_id)',
        'CREATE INDEX idx_capi_events_status ON capi_events (status)',
        'CREATE INDEX idx_capi_events_status_created ON capi_events (status, created DESC)',
      ],
    })

    app.save(capiEvents)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('capi_events')
      app.delete(col)
    } catch (_) {}
  },
)
