// Reinforce role-based API rules for the remaining sensitive collections
// that 0020 did not cover (roles, permissions, commissions, sla_configs,
// lead_distribution). The product's RBAC contract is:
//
//   admin  → unrestricted (within tenant)
//   gestor → read/create/edit across the tenant, but NEVER delete
//   advogado → only records under their own responsibility
//            (responsavel_id / assigned_to = @request.auth.id); no deletes,
//            no config/admin collections at all.
//
// Delete is restricted to admin for every collection touched here — the
// frontend already hides delete actions from non-admins, and these rules
// make the backend enforce the same so a direct API call cannot bypass it.

// PocketBase auth role values stored on users.role: 'admin' | 'manager' | 'user'.
// 'manager' is the gestor, 'user' is the advogado/consultor.
const ADMIN = "@request.auth.role = 'admin'"
const GESTOR_OR_ADMIN = "(@request.auth.role = 'admin' || @request.auth.role = 'manager')"
const TENANT_OR_EMPTY =
  "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

migrate(
  (app) => {
    // ─── roles ───────────────────────────────────────────────────────────
    // Read: any auth user in the same tenant (so advogados can resolve their
    //   own role record). Write/delete: admin only — roles are an admin
    //   concern (creating/renaming a role changes what every gestor/advogado
    //   can do).
    try {
      const roles = app.findCollectionByNameOrId('roles')
      roles.listRule = `@request.auth.id != '' && ${TENANT_OR_EMPTY}`
      roles.viewRule = `@request.auth.id != '' && ${TENANT_OR_EMPTY}`
      roles.createRule = `@request.auth.id != '' && ${ADMIN}`
      roles.updateRule = `@request.auth.id != '' && ${ADMIN} && ${TENANT_OR_EMPTY}`
      roles.deleteRule = `@request.auth.id != '' && ${ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(roles)
    } catch (err) {
      console.warn('0021: could not update roles rules', err)
    }

    // ─── permissions ─────────────────────────────────────────────────────
    // Read: any auth user in the same tenant (so the TenantContext can fetch
    //   the current user's permission set). Write/delete: admin only —
    //   permissions directly control what gestor/advogado can do, so only
    //   admins may grant or revoke them.
    try {
      const perms = app.findCollectionByNameOrId('permissions')
      perms.listRule = `@request.auth.id != ''`
      perms.viewRule = `@request.auth.id != ''`
      perms.createRule = `@request.auth.id != '' && ${ADMIN}`
      perms.updateRule = `@request.auth.id != '' && ${ADMIN}`
      perms.deleteRule = `@request.auth.id != '' && ${ADMIN}`
      app.save(perms)
    } catch (err) {
      console.warn('0021: could not update permissions rules', err)
    }

    // ─── commissions ─────────────────────────────────────────────────────
    // Gestor manages commissions (view/create/edit) but cannot delete them;
    // delete is admin-only. Advogado cannot touch this collection at all
    // (it is a finance/management concern).
    try {
      const comms = app.findCollectionByNameOrId('commissions')
      comms.listRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.viewRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.createRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN}`
      comms.updateRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.deleteRule = `@request.auth.id != '' && ${ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(comms)
    } catch (err) {
      console.warn('0021: could not update commissions rules', err)
    }

    // ─── sla_configs ─────────────────────────────────────────────────────
    // SLA configuration is a management concern: gestor can view/create/edit,
    // admin-only delete. Advogado has no access.
    try {
      const sla = app.findCollectionByNameOrId('sla_configs')
      sla.listRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.viewRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.createRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN}`
      sla.updateRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.deleteRule = `@request.auth.id != '' && ${ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(sla)
    } catch (err) {
      console.warn('0021: could not update sla_configs rules', err)
    }

    // ─── lead_distribution ───────────────────────────────────────────────
    // Distribution rules are a management concern (gestor redistributes
    // leads). Gestor can view/create/edit, admin-only delete. Advogado has
    // no access to distribution configuration.
    try {
      const ld = app.findCollectionByNameOrId('lead_distribution')
      ld.listRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.viewRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.createRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN}`
      ld.updateRule = `@request.auth.id != '' && ${GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.deleteRule = `@request.auth.id != '' && ${ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(ld)
    } catch (err) {
      console.warn('0021: could not update lead_distribution rules', err)
    }

    // ─── users (reinforce) ───────────────────────────────────────────────
    // 0020 left users.create PUBLIC (needed for self-registration) and let
    // any auth user LIST/VIEW within the tenant. Tighten list/view so
    // advogados can only see their own user record — they don't need the
    // full user directory. Gestor and admin keep tenant-wide visibility
    // (gestor manages the team). Create/update/delete already enforce
    // admin-or-self, so they stay as 0020 left them.
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        "@request.auth.role = 'admin' || " +
        "@request.auth.role = 'manager'" +
        ") && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      users.viewRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        "@request.auth.role = 'admin' || " +
        "@request.auth.role = 'manager'" +
        ") && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(users)
    } catch (err) {
      console.warn('0021: could not reinforce users rules', err)
    }
  },
  (app) => {
    // Revert to the looser rules that were in place before this migration.
    const TENANT = `@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')`

    try {
      const roles = app.findCollectionByNameOrId('roles')
      roles.listRule = TENANT
      roles.viewRule = TENANT
      roles.createRule = "@request.auth.id != ''"
      roles.updateRule = TENANT
      roles.deleteRule = TENANT
      app.save(roles)
    } catch (err) {
      console.warn('0021 revert: roles failed', err)
    }

    try {
      const perms = app.findCollectionByNameOrId('permissions')
      perms.listRule = "@request.auth.id != ''"
      perms.viewRule = "@request.auth.id != ''"
      perms.createRule = "@request.auth.id != ''"
      perms.updateRule = "@request.auth.id != ''"
      perms.deleteRule = "@request.auth.id != ''"
      app.save(perms)
    } catch (err) {
      console.warn('0021 revert: permissions failed', err)
    }

    try {
      const comms = app.findCollectionByNameOrId('commissions')
      comms.listRule = TENANT
      comms.viewRule = TENANT
      comms.createRule = "@request.auth.id != ''"
      comms.updateRule = TENANT
      comms.deleteRule = TENANT
      app.save(comms)
    } catch (err) {
      console.warn('0021 revert: commissions failed', err)
    }

    try {
      const sla = app.findCollectionByNameOrId('sla_configs')
      sla.listRule = TENANT
      sla.viewRule = TENANT
      sla.createRule = "@request.auth.id != ''"
      sla.updateRule = TENANT
      sla.deleteRule = TENANT
      app.save(sla)
    } catch (err) {
      console.warn('0021 revert: sla_configs failed', err)
    }

    try {
      const ld = app.findCollectionByNameOrId('lead_distribution')
      ld.listRule = TENANT
      ld.viewRule = TENANT
      ld.createRule = "@request.auth.id != ''"
      ld.updateRule = TENANT
      ld.deleteRule = TENANT
      app.save(ld)
    } catch (err) {
      console.warn('0021 revert: lead_distribution failed', err)
    }

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule = TENANT
      users.viewRule = TENANT
      app.save(users)
    } catch (err) {
      console.warn('0021 revert: users failed', err)
    }
  },
)
