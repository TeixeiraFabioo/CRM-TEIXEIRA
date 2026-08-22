/// <reference path="../pb_data/pocketbase.d.ts" />
// Migration 0019 — onboarding_completed flag on tenants.
// Idempotent: only adds the field if it isn't already present.

migrate(
  (app) => {
    const COLLECTION_NAME = 'tenants'
    if (!app.dao().hasCollection(COLLECTION_NAME)) {
      return
    }

    const collection = app.dao().findCollectionByNameOrId(COLLECTION_NAME)
    if (!collection) {
      return
    }

    // Already has the field?
    const existing = (collection.fields || []).find(
      (f) => f && f.getName && f.getName() === 'onboarding_completed',
    )
    if (existing) {
      return
    }

    collection.fields.add(
      new Field({
        name: 'onboarding_completed',
        type: 'bool',
        required: false,
        system: false,
      }),
    )

    app.dao().saveCollection(collection)
  },
  (app) => {
    const COLLECTION_NAME = 'tenants'
    if (!app.dao().hasCollection(COLLECTION_NAME)) {
      return
    }
    const collection = app.dao().findCollectionByNameOrId(COLLECTION_NAME)
    if (!collection) {
      return
    }
    const field = (collection.fields || []).find(
      (f) => f && f.getName && f.getName() === 'onboarding_completed',
    )
    if (field) {
      collection.fields.remove(field)
      app.dao().saveCollection(collection)
    }
  },
)
