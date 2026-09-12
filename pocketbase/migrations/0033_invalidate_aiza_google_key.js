/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'integration_configs',
        "provider = 'google_meet' && (api_key ~ 'AIza' || api_token ~ 'AIza')",
        '-created',
        10,
      )
      for (const record of records) {
        record.set('status', 'error')
        record.set('is_active', false)
        record.set(
          'error_message',
          'Calendar API exige OAuth 2, não API Key. Cole o client_id, client_secret e refresh token gerados no Google Cloud Console.',
        )
        app.save(record)
      }
    } catch (err) {
      console.warn('[Migration 0033] Erro ao atualizar status de integração do Google:', err)
    }
  },
  (app) => {
    // no-op revert
  },
)
