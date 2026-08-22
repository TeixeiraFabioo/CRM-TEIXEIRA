migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    // RG do cliente
    if (!col.fields.getByName('rg')) {
      col.fields.add(new TextField({ name: 'rg' }))
    }

    // Estado civil (Solteiro, Casado, Divorciado, Viúvo, União Estável)
    if (!col.fields.getByName('estado_civil')) {
      col.fields.add(new TextField({ name: 'estado_civil' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    const rgField = col.fields.getByName('rg')
    if (rgField) col.fields.remove(rgField)

    const ecField = col.fields.getByName('estado_civil')
    if (ecField) col.fields.remove(ecField)

    app.save(col)
  },
)
