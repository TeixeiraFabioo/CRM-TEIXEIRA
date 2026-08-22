/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      name: 'session_logs',
      type: 'base',
      system: false,
      schema: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          presentable: false,
          options: {
            collectionId: usersCollection ? usersCollection.id : '_pb_users_auth_',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          name: 'tenant_id',
          type: 'text',
          required: false,
          presentable: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          name: 'ip',
          type: 'text',
          required: false,
          presentable: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
          presentable: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
      ],
      indexes: [],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: null,
      options: {},
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('session_logs')
    if (collection) {
      app.delete(collection)
    }
  },
)
