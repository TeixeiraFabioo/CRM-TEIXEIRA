// pocketbase/migrations/0034_add_google_event_id_and_task_rules.js
// Adiciona o campo google_event_id na coleção tasks e ajusta deleteRule para permitir exclusão de tarefas/reuniões apenas por admin e gestor/manager.

migrate(
  (app) => {
    try {
      const tasksCol = app.findCollectionByNameOrId('tasks')

      if (!tasksCol.fields.getByName('google_event_id')) {
        tasksCol.fields.add(
          new TextField({
            name: 'google_event_id',
            required: false,
          }),
        )
      }

      // Enforce: apenas gestor ('gestor' ou 'manager') e admin ('admin') podem excluir reuniões / tarefas
      tasksCol.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'manager') && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      // Enforce: update liberado para todos os usuários autenticados do mesmo tenant (edição irrestrita por papel)
      tasksCol.updateRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"

      app.save(tasksCol)
    } catch (err) {
      console.warn('0034: failed to update tasks collection schema/rules', err)
      throw err
    }
  },
  (app) => {
    try {
      const tasksCol = app.findCollectionByNameOrId('tasks')
      const field = tasksCol.fields.getByName('google_event_id')
      if (field) {
        tasksCol.fields.removeByName('google_event_id')
      }
      tasksCol.deleteRule =
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')"
      app.save(tasksCol)
    } catch (_) {}
  },
)
