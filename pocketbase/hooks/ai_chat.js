routerAdd(
  'POST',
  '/backend/v1/ai/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const messages = body.messages || []
      const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7

      if (!Array.isArray(messages) || messages.length === 0) {
        return e.badRequestError('messages array is required')
      }

      const reply = $ai.chat({
        model: 'fast',
        messages: messages,
        temperature: temperature,
      })

      const text =
        reply.choices && reply.choices[0] && reply.choices[0].message
          ? reply.choices[0].message.content
          : ''

      return e.json(200, {
        text: text,
        result: reply,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'AI gateway not configured' })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, { error: err.message || 'AI request failed' })
      }
      return e.json(500, { error: err.message || 'Internal server error' })
    }
  },
  $apis.requireAuth(),
)
