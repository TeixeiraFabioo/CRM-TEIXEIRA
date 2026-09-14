// pocketbase/migrations/0036_repair_meet_record.js
migrate(
  (app) => {
    try {
      const q = app
        .db()
        .newQuery(
          'UPDATE integration_configs SET config_json = \'{"client_id":"407408718192.apps.googleusercontent.com","calendar_id":"primary","provider":"google_meet"}\', is_active = 1 WHERE provider = \'google_meet\' AND (config_json IS NULL OR config_json = \'\' OR config_json = \'{}\')',
        )
      q.execute()
    } catch (err) {
      console.warn('0036: failed to update meet record via sql', err)
    }
  },
  (app) => {},
)
