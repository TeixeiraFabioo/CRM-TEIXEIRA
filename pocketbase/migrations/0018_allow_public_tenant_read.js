migrate(
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    tenants.listRule = ''
    tenants.viewRule = ''
    app.save(tenants)
  },
  (app) => {
    const tenants = app.findCollectionByNameOrId('tenants')
    tenants.listRule = "@request.auth.id != ''"
    tenants.viewRule = "@request.auth.id != ''"
    app.save(tenants)
  },
)
