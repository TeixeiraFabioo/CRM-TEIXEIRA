migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')

    if (!tenants.fields.getByName('meta_pixel_id')) {
      tenants.fields.add(
        new TextField({
          name: 'meta_pixel_id',
          required: false,
        }),
      )
      app.save(tenants)
    }

    // Update existing seeded tenant to have meta_pixel_id if available
    try {
      const tenant = app.findFirstRecordByData('tenants', 'slug', 'skip-enterprise')
      tenant.set('meta_pixel_id', '98127391823')

      // Also sync in settings JSON if needed
      const currentSettings = tenant.get('settings') || {}
      currentSettings.meta_pixel_id = '98127391823'
      currentSettings.lgpd_consent_required = true
      currentSettings.meta_pixel_active = true
      tenant.set('settings', currentSettings)

      app.save(tenant)
    } catch (_) {}
  },
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    const field = tenants.fields.getByName('meta_pixel_id')
    if (field) {
      tenants.fields.removeByName('meta_pixel_id')
      app.save(tenants)
    }
  },
)
