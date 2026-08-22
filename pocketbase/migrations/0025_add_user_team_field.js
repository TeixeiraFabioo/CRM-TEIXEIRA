// 0025 — Add `team` text field to the users collection and relax the
// update/delete API rules so a gestor (manager) can manage non-admin users
// (managers and advogados) within the same tenant, mirroring the hierarchy
// enforced in the Settings UI:
//
//   admin  → update/delete any user in the tenant (and self)
//   gestor → update/delete any user in the tenant EXCEPT admins (and self)
//   advogado → only self
//
// The `team` field stores the user's equipe/time (Comercial, Jurídico,
// Financeiro) and is surfaced in the Edit User dialog. Idempotent: skips
// adding the field if it already exists.

const ADMIN = "@request.auth.role = 'admin'"
const GESTOR = "@request.auth.role = 'manager'"
const TENANT_OR_EMPTY =
  "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')

      // 1. Add the `team` text field if it does not exist yet.
      if (!users.fields.getByName('team')) {
        users.fields.add(new TextField({ name: 'team' }))
      }

      // 2. Relax update/delete rules so a gestor can manage non-admin users
      //    in the same tenant. Self-update stays allowed for everyone (so
      //    the Meu Perfil page works for advogados too). Admins keep full
      //    tenant-wide control.
      users.updateRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'

      users.deleteRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'

      app.save(users)
    } catch (err) {
      console.warn('0025: could not update users collection', err)
    }
  },
  (app) => {
    // Revert to the rules that were in place before this migration (admin or
    // self only) and drop the team field.
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.updateRule =
        "@request.auth.id != '' && (id = @request.auth.id || (" + `${ADMIN} && ${TENANT_OR_EMPTY}))`
      users.deleteRule =
        "@request.auth.id != '' && (id = @request.auth.id || (" + `${ADMIN} && ${TENANT_OR_EMPTY}))`

      const teamField = users.fields.getByName('team')
      if (teamField) {
        users.fields.remove(teamField)
      }
      app.save(users)
    } catch (err) {
      console.warn('0025 revert: users failed', err)
    }
  },
)
