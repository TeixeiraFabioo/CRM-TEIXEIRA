// 0031_add_google_meet_to_integration_provider.js
// Adiciona 'google_meet' aos values do campo select provider da coleção integration_configs

migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('integration_configs')
      const providerField = col.fields.getByName('provider')
      if (providerField) {
        const values = providerField.values || []
        if (!values.includes('google_meet')) {
          values.push('google_meet')
          providerField.values = values
          if (providerField.maxSelect > values.length) {
            providerField.maxSelect = values.length
          }
          app.save(col)
        }
      }
    } catch (err) {
      console.warn('0031: failed to add google_meet provider', err)
      throw err
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('integration_configs')
      const providerField = col.fields.getByName('provider')
      if (providerField) {
        const values = (providerField.values || []).filter((v) => v !== 'google_meet')
        providerField.values = values
        app.save(col)
      }
    } catch (err) {
      console.warn('0031 revert: failed to revert google_meet provider', err)
    }
  },
)
