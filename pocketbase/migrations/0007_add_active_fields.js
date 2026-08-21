migrate(
  (app) => {
    // 1. Add 'active' field to users collection if not exists
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('active')) {
        usersCol.fields.add(new BoolField({ name: 'active' }))
        app.save(usersCol)
      }
      // Update records through pocketbase to ensure bool is saved as true
      const users = app.findRecordsByFilter('_pb_users_auth_', '', '', 100, 0)
      for (const u of users) {
        u.set('active', true)
        app.save(u)
      }
    } catch (err) {
      console.warn('Could not add active field to users collection', err)
    }

    // 2. Add 'active' field to customers collection if not exists
    try {
      const customersCol = app.findCollectionByNameOrId('customers')
      if (!customersCol.fields.getByName('active')) {
        customersCol.fields.add(new BoolField({ name: 'active' }))
        app.save(customersCol)
      }
      const custs = app.findRecordsByFilter('customers', '', '', 100, 0)
      for (const c of custs) {
        c.set('active', true)
        app.save(c)
      }
    } catch (err) {
      console.warn('Could not add active field to customers collection', err)
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const activeField = usersCol.fields.getByName('active')
      if (activeField) {
        usersCol.fields.removeByName('active')
        app.save(usersCol)
      }
    } catch (_) {}

    try {
      const customersCol = app.findCollectionByNameOrId('customers')
      const activeField = customersCol.fields.getByName('active')
      if (activeField) {
        customersCol.fields.removeByName('active')
        app.save(customersCol)
      }
    } catch (_) {}
  },
)
