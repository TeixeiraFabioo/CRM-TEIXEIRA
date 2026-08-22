migrate(
  (app) => {
    // ─────────────────────────────────────────────────────────────────────
    // 1. USERS (_pb_users_auth_)
    //    - list/view: same-tenant only (previously any authed user could
    //      list users across all tenants — a cross-tenant leak)
    //    - create: stays PUBLIC (required for tenant self-registration)
    //    - update/delete: self record OR admin within the same tenant
    // ─────────────────────────────────────────────────────────────────────
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      users.viewRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      // create stays public ("") — registration flow needs it
      users.updateRule =
        "@request.auth.id != '' && (id = @request.auth.id || (@request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')))"
      users.deleteRule =
        "@request.auth.id != '' && (id = @request.auth.id || (@request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')))"
      app.save(users)
    } catch (err) {
      console.warn('Could not update users rules', err)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. AUDIT_LOGS
    //    - list/view: admin only, same tenant
    //    - create: any authed user within same tenant (the app logs audit
    //      entries from the frontend on behalf of user actions)
    //    - update/delete: nobody (superuser only) — audit trail is immutable
    // ─────────────────────────────────────────────────────────────────────
    try {
      const audit = app.findCollectionByNameOrId('audit_logs')
      audit.listRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.viewRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.createRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.updateRule = null
      audit.deleteRule = null
      app.save(audit)
    } catch (err) {
      console.warn('Could not update audit_logs rules', err)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. TENANTS (office settings)
    //    - list/view/create: stay PUBLIC (landing page reads default tenant
    //      unauthenticated; registration creates a tenant)
    //    - update/delete: admin only (office settings are administrative)
    // ─────────────────────────────────────────────────────────────────────
    try {
      const tenants = app.findCollectionByNameOrId('tenants')
      tenants.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      tenants.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      app.save(tenants)
    } catch (err) {
      console.warn('Could not update tenants rules', err)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. INTEGRATIONS — admin only (all operations)
    // ─────────────────────────────────────────────────────────────────────
    try {
      const integrations = app.findCollectionByNameOrId('integrations')
      integrations.listRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.viewRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      integrations.updateRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.deleteRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(integrations)
    } catch (err) {
      console.warn('Could not update integrations rules', err)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. INTEGRATION_CONFIGS — reinforce admin-only (already restricted,
    //    this re-applies identical rules to guarantee the current state)
    // ─────────────────────────────────────────────────────────────────────
    try {
      const ic = app.findCollectionByNameOrId('integration_configs')
      ic.listRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      ic.viewRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      ic.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
      ic.updateRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      ic.deleteRule =
        "@request.auth.id != '' && @request.auth.role = 'admin' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(ic)
    } catch (err) {
      console.warn('Could not update integration_configs rules', err)
    }
  },
  (app) => {
    // Revert: restore the looser rules from migrations 0006/0018

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule = "@request.auth.id != ''"
      users.viewRule = "@request.auth.id != ''"
      users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'"
      users.deleteRule = "id = @request.auth.id || @request.auth.role = 'admin'"
      app.save(users)
    } catch (err) {
      console.warn('revert users failed', err)
    }

    try {
      const audit = app.findCollectionByNameOrId('audit_logs')
      audit.listRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.viewRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.createRule = "@request.auth.id != ''"
      audit.updateRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      audit.deleteRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(audit)
    } catch (err) {
      console.warn('revert audit_logs failed', err)
    }

    try {
      const tenants = app.findCollectionByNameOrId('tenants')
      tenants.updateRule = "@request.auth.id != ''"
      tenants.deleteRule = "@request.auth.id != ''"
      app.save(tenants)
    } catch (err) {
      console.warn('revert tenants failed', err)
    }

    try {
      const integrations = app.findCollectionByNameOrId('integrations')
      integrations.listRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.viewRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.createRule = "@request.auth.id != ''"
      integrations.updateRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      integrations.deleteRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(integrations)
    } catch (err) {
      console.warn('revert integrations failed', err)
    }
  },
)
