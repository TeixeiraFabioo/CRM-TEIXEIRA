// 0026 — Enforce on the PocketBase API level that managers (gestores)
// CANNOT update or delete users who have role = 'admin'.
//
// Hierarchy contract:
//   1. An authenticated user can always update their own record (id = @request.auth.id)
//   2. An admin can update/delete any user within the tenant
//   3. A gestor (role = 'manager') can update/delete users within the tenant
//      EXCEPT records where role = 'admin' (and except self-deletion, handled by app logic)
//   4. An advogado (role = 'user') can only update their own record

const ADMIN = "@request.auth.role = 'admin'"
const GESTOR = "@request.auth.role = 'manager'"
const TENANT_OR_EMPTY =
  "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')

      // Ensure `team` text field exists
      if (!users.fields.getByName('team')) {
        users.fields.add(new TextField({ name: 'team' }))
      }

      // Update rule:
      // - Self update: id = @request.auth.id
      // - Admin: can update anyone in tenant
      // - Gestor: can update non-admins in tenant
      users.updateRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'

      // Delete rule:
      // - Admin: can delete anyone in tenant
      // - Gestor: can delete non-admins in tenant (role != 'admin')
      users.deleteRule =
        "@request.auth.id != '' && (" +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'

      app.save(users)
    } catch (err) {
      console.warn('0026: could not update users collection API rules', err)
    }
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.updateRule =
        "@request.auth.id != '' && (id = @request.auth.id || (" + `${ADMIN} && ${TENANT_OR_EMPTY}))`
      users.deleteRule =
        "@request.auth.id != '' && (id = @request.auth.id || (" + `${ADMIN} && ${TENANT_OR_EMPTY}))`
      app.save(users)
    } catch (err) {
      console.warn('0026 revert: users rules failed', err)
    }
  },
)
