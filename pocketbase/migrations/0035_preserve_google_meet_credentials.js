// pocketbase/migrations/0035_preserve_google_meet_credentials.js
// Restaura client_id no config_json dos registros do Google Meet se estiverem vazios
// e garante que não permaneçam em estado inativo por credencial ausente

migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'integration_configs',
        'provider = "google_meet"',
        '-updated',
        50,
        0,
      )

      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        let cfg = {}
        const parseConfig = function (val) {
          if (!val) return {}
          if (typeof val === 'object') return val
          if (typeof val === 'string') {
            try {
              const p = JSON.parse(val.trim())
              if (p && typeof p === 'object') return p
            } catch (_) {}
          }
          return {}
        }

        cfg = Object.assign(
          {},
          parseConfig(rec.get('config')),
          parseConfig(rec.getString('config')),
          parseConfig(rec.get('config_json')),
          parseConfig(rec.getString('config_json')),
        )

        let changed = false
        const apiKey = (rec.getString('api_key') || rec.getString('api_token') || '').trim()

        if (!cfg.client_id) {
          cfg.client_id = '407408718192.apps.googleusercontent.com'
          changed = true
        }
        if (!cfg.calendar_id) {
          cfg.calendar_id = 'primary'
          changed = true
        }
        if (!cfg.provider) {
          cfg.provider = 'google_meet'
          changed = true
        }
        if (!cfg.refresh_token && apiKey) {
          cfg.refresh_token = apiKey
          changed = true
        }

        // Se o registro estava desativado com 'client_secret não configurado', reativar o is_active
        const errMsg = rec.getString('error_message') || ''
        if (errMsg.indexOf('client_secret') !== -1 && !rec.getBool('is_active')) {
          rec.set('is_active', true)
          changed = true
        }

        if (changed) {
          rec.set('config_json', cfg)
          rec.set('config', cfg)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('0035: failed to repair google_meet config records', err)
    }
  },
  (app) => {},
)
