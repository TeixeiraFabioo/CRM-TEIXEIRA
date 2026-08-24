migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('integration_configs')
    let changed = false

    if (!col.fields.getByName('api_key')) {
      col.fields.add(new TextField({ name: 'api_key' }))
      changed = true
    }

    if (changed) {
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('integration_configs')
      col.fields.removeByName('api_key')
      app.save(col)
    } catch (_) {}
  },
)
