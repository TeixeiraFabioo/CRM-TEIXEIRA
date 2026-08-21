migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    // Allow public creation of leads (landing page submission without auth)
    leads.createRule = ''
    app.save(leads)
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    leads.createRule = "@request.auth.id != ''"
    app.save(leads)
  },
)
