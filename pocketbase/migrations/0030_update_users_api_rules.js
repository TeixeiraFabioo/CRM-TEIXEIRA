// 0030_update_users_api_rules.js
// Atualiza as regras de API (listRule, viewRule, updateRule, deleteRule) da coleção users
// para incluir os papéis canônicos ('admin', 'gestor', 'advogado') e de compatibilidade ('manager', 'user'),
// mantendo a restrição de tenant (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')
// e id = @request.auth.id para auto-visualização e auto-atualização.

migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')

      const TENANT_CHECK =
        "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      const IS_ADMIN = "@request.auth.role = 'admin'"
      const IS_GESTOR = "(@request.auth.role = 'gestor' || @request.auth.role = 'manager')"
      const IS_ADVOGADO = "(@request.auth.role = 'advogado' || @request.auth.role = 'user')"

      // List e View:
      // Qualquer usuário autenticado pode ver seu próprio perfil (id = @request.auth.id)
      // Admins e Gestores podem listar/ver membros do mesmo tenant.
      // Advogados podem ver membros do mesmo tenant para colaboração e atribuição (ou seu próprio id)
      users.listRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `${IS_ADMIN} || ` +
        `${IS_GESTOR} || ` +
        `${IS_ADVOGADO}` +
        `) && ${TENANT_CHECK}`

      users.viewRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `${IS_ADMIN} || ` +
        `${IS_GESTOR} || ` +
        `${IS_ADVOGADO}` +
        `) && ${TENANT_CHECK}`

      // Update rule:
      // - O próprio usuário pode atualizar seu próprio perfil
      // - Admin pode atualizar qualquer usuário do tenant
      // - Gestor pode atualizar usuários do mesmo tenant, exceto administradores (role != 'admin')
      users.updateRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `(${IS_ADMIN} && ${TENANT_CHECK}) || ` +
        `(${IS_GESTOR} && role != 'admin' && ${TENANT_CHECK})` +
        ')'

      // Delete rule:
      // - Admin pode deletar qualquer usuário do tenant
      // - Gestor pode deletar qualquer usuário do tenant exceto administradores (role != 'admin')
      users.deleteRule =
        "@request.auth.id != '' && (" +
        `(${IS_ADMIN} && ${TENANT_CHECK}) || ` +
        `(${IS_GESTOR} && role != 'admin' && ${TENANT_CHECK})` +
        ')'

      app.save(users)
    } catch (err) {
      console.warn('0030: failed to update users api rules', err)
      throw err
    }
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const ADMIN = "@request.auth.role = 'admin'"
      const GESTOR = "@request.auth.role = 'manager'"
      const TENANT_OR_EMPTY =
        "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      users.listRule =
        "@request.auth.id != '' && (id = @request.auth.id || " +
        `${ADMIN} || ${GESTOR}) && ${TENANT_OR_EMPTY}`
      users.viewRule =
        "@request.auth.id != '' && (id = @request.auth.id || " +
        `${ADMIN} || ${GESTOR}) && ${TENANT_OR_EMPTY}`
      users.updateRule =
        "@request.auth.id != '' && (" +
        'id = @request.auth.id || ' +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'
      users.deleteRule =
        "@request.auth.id != '' && (" +
        `(${ADMIN} && ${TENANT_OR_EMPTY}) || ` +
        `(${GESTOR} && role != 'admin' && ${TENANT_OR_EMPTY})` +
        ')'

      app.save(users)
    } catch (err) {
      console.warn('0030 revert: failed to revert users api rules', err)
    }
  },
)
