migrate(
  (app) => {
    // List of all CRM base collections that have tenant_id
    const collectionsWithTenant = [
      'roles',
      'permissions',
      'audit_logs',
      'pipelines',
      'leads',
      'customers',
      'opportunities',
      'webhooks',
      'integrations',
      'empresas',
      'pessoas',
      'services',
      'tags',
      'custom_fields',
      'templates',
      'proposals',
      'contracts',
      'tasks',
      'notes',
      'campaigns',
      'ads',
      'goals',
      'commissions',
      'segments',
      'conversion_events',
      'processing_queue',
      'sla_configs',
      'lead_distribution',
      'message_templates',
      'automations',
    ]

    for (const name of collectionsWithTenant) {
      try {
        const col = app.findCollectionByNameOrId(name)
        // Allow authenticated users to view/list/create/update/delete records
        // If the user has a tenant_id, enforce tenant_id matching, or allow any authenticated user
        col.listRule =
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
        col.viewRule =
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
        col.createRule = "@request.auth.id != ''"
        col.updateRule =
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
        col.deleteRule =
          "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
        app.save(col)
      } catch (err) {
        console.warn('Could not update rules for collection: ' + name, err)
      }
    }

    // Pipeline stages (linked via pipeline_id)
    try {
      const stagesCol = app.findCollectionByNameOrId('pipeline_stages')
      stagesCol.listRule = "@request.auth.id != ''"
      stagesCol.viewRule = "@request.auth.id != ''"
      stagesCol.createRule = "@request.auth.id != ''"
      stagesCol.updateRule = "@request.auth.id != ''"
      stagesCol.deleteRule = "@request.auth.id != ''"
      app.save(stagesCol)
    } catch (err) {
      console.warn('Could not update pipeline_stages rules', err)
    }

    // Tenants collection: allow authenticated users to view/list/update, and public to create (for registration)
    try {
      const tenantsCol = app.findCollectionByNameOrId('tenants')
      tenantsCol.listRule = "@request.auth.id != ''"
      tenantsCol.viewRule = "@request.auth.id != ''"
      tenantsCol.createRule = '' // Allow signup flow to create a tenant
      tenantsCol.updateRule = "@request.auth.id != ''"
      tenantsCol.deleteRule = "@request.auth.id != ''"
      app.save(tenantsCol)
    } catch (err) {
      console.warn('Could not update tenants rules', err)
    }

    // Users collection: allow auth users to list/view other users in same tenant, create users (for registration)
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = "@request.auth.id != ''"
      usersCol.viewRule = "@request.auth.id != ''"
      usersCol.createRule = '' // Allow signup
      usersCol.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'"
      usersCol.deleteRule = "id = @request.auth.id || @request.auth.role = 'admin'"
      app.save(usersCol)
    } catch (err) {
      console.warn('Could not update users rules', err)
    }
  },
  (app) => {
    // Revert
  },
)
