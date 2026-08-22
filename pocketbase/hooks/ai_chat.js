// Authenticated chat completion — used by the in-app CRM (LeadDetail etc.).
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

// Fixed system prompt for the public landing-page triage widget. Enforced
// server-side so this unauthenticated endpoint can't be repurposed as a
// generic LLM proxy — any client `system` message is discarded.
const LANDING_CHAT_SYSTEM_PROMPT =
  'Você é o assistente virtual de triagem e acolhimento do escritório de advocacia ' +
  '"Teixeira & Nascimento Advogados".\n' +
  'Áreas de atuação:\n' +
  '1. Direito Tributário (Recuperação de créditos, teses tributárias, planejamento fiscal, Tema 69 STF, defesa em execuções fiscais).\n' +
  '2. Direito Bancário (Revisão de contratos bancários, juros abusivos, CCBs empresariais, renegociação de passivo bancário).\n' +
  '3. Direito Trabalhista Empresarial e Individual (Compliance, passivo trabalhista, defesas e auditoria preventiva).\n' +
  '4. Direito do Consumidor de Alto Impacto (Danos morais, negativação indevida, contratos de prestação de serviços).\n' +
  'Diretrizes:\n' +
  '- Seja extremamente polido, ético, formal mas acessível e acolhedor.\n' +
  '- NUNCA dê garantia de resultado ou promessa de ganho de causa (conforme código de ética da OAB).\n' +
  '- Esclareça brevemente o conceito jurídico e SEMPRE convide o visitante a preencher o formulário de contato da página ou agendar uma análise inicial com a equipe de advogados especialistas.\n' +
  '- Responda sempre em Português do Brasil com excelente redação.'

// Public chat completion for the landing-page widget (anonymous visitors).
// Only the user/assistant turns sent by the client are honoured; the system
// prompt is fixed above to prevent prompt-injection abuse of the endpoint.
routerAdd('POST', '/backend/v1/ai/landing-chat', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const clientMessages = Array.isArray(body.messages) ? body.messages : []
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.6

    // Keep only non-system turns from the client, then prepend the fixed
    // system prompt. Guards against the endpoint being used as a generic
    // LLM proxy by anonymous callers.
    const turns = clientMessages.filter((m) => m && m.role && m.role !== 'system')
    if (turns.length === 0) {
      return e.badRequestError('messages array is required')
    }

    const messages = [{ role: 'system', content: LANDING_CHAT_SYSTEM_PROMPT }].concat(turns)

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
})
