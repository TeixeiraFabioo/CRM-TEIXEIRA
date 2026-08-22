onRecordAuthWithPasswordRequest((e) => {
  e.next()

  try {
    const user = e.record
    if (!user) return

    const ip = e.realIP ? e.realIP() : ''
    const userAgent = e.requestInfo().headers ? e.requestInfo().headers['user-agent'] || '' : ''

    const collection = $app.findCollectionByNameOrId('session_logs')
    if (!collection) return

    const record = new Record(collection, {
      user_id: user.id,
      tenant_id: user.getString('tenant_id') || '',
      ip: ip || '',
      user_agent: userAgent || '',
    })

    $app.save(record)
  } catch (err) {
    console.error('[SessionLog Hook] Erro ao registrar log de sessão:', err)
  }
}, 'users')
