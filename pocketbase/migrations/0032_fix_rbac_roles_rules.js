// 0032_fix_rbac_roles_rules.js
// Corrige regras RBAC nas coleções knowledge_base, sla_configs, commissions e lead_distribution,
// substituindo '@request.auth.role = 'manager'' pelos papéis canônicos ('admin', 'gestor', 'advogado')
// mantendo compatibilidade com 'manager' e 'user'.
// Também adiciona os campos meet_link e participantes à coleção tasks para suportar as reuniões Google Meet e participantes adicionais.

migrate(
  (app) => {
    const TENANT_OR_EMPTY =
      "(tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

    const IS_ADMIN = "@request.auth.role = 'admin'"
    const IS_GESTOR_OR_ADMIN =
      "(@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'manager')"
    const IS_AUTH = "@request.auth.id != ''"

    // 1. knowledge_base
    try {
      const kb = app.findCollectionByNameOrId('knowledge_base')
      kb.listRule = `${IS_AUTH} && ${TENANT_OR_EMPTY}`
      kb.viewRule = `${IS_AUTH} && ${TENANT_OR_EMPTY}`
      kb.createRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN}`
      kb.updateRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      kb.deleteRule = `${IS_AUTH} && ${IS_ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(kb)
    } catch (err) {
      console.warn('0032: failed to update knowledge_base rules', err)
      throw err
    }

    // 2. sla_configs
    try {
      const sla = app.findCollectionByNameOrId('sla_configs')
      sla.listRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.viewRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.createRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN}`
      sla.updateRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      sla.deleteRule = `${IS_AUTH} && ${IS_ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(sla)
    } catch (err) {
      console.warn('0032: failed to update sla_configs rules', err)
      throw err
    }

    // 3. commissions
    try {
      const comms = app.findCollectionByNameOrId('commissions')
      comms.listRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.viewRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.createRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN}`
      comms.updateRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      comms.deleteRule = `${IS_AUTH} && ${IS_ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(comms)
    } catch (err) {
      console.warn('0032: failed to update commissions rules', err)
      throw err
    }

    // 4. lead_distribution
    try {
      const ld = app.findCollectionByNameOrId('lead_distribution')
      ld.listRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.viewRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.createRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN}`
      ld.updateRule = `${IS_AUTH} && ${IS_GESTOR_OR_ADMIN} && ${TENANT_OR_EMPTY}`
      ld.deleteRule = `${IS_AUTH} && ${IS_ADMIN} && ${TENANT_OR_EMPTY}`
      app.save(ld)
    } catch (err) {
      console.warn('0032: failed to update lead_distribution rules', err)
      throw err
    }

    // 5. Adicionar campos 'meet_link' e 'participantes' à coleção tasks se não existirem
    try {
      const tasksCol = app.findCollectionByNameOrId('tasks')
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

      if (!tasksCol.fields.getByName('meet_link')) {
        tasksCol.fields.add(
          new TextField({
            name: 'meet_link',
            required: false,
          }),
        )
      }

      if (!tasksCol.fields.getByName('participantes')) {
        tasksCol.fields.add(
          new RelationField({
            name: 'participantes',
            collectionId: usersCol.id,
            maxSelect: 20,
            required: false,
          }),
        )
      }

      app.save(tasksCol)
    } catch (err) {
      console.warn('0032: failed to update tasks fields', err)
      throw err
    }
  },
  (app) => {
    try {
      const kb = app.findCollectionByNameOrId('knowledge_base')
      kb.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      kb.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      kb.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      app.save(kb)
    } catch (_) {}

    try {
      const sla = app.findCollectionByNameOrId('sla_configs')
      sla.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      app.save(sla)
    } catch (_) {}

    try {
      const comms = app.findCollectionByNameOrId('commissions')
      comms.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      app.save(comms)
    } catch (_) {}

    try {
      const ld = app.findCollectionByNameOrId('lead_distribution')
      ld.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')"
      app.save(ld)
    } catch (_) {}
  },
)
