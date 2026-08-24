/**
 * AI Chat with Knowledge Base Endpoint
 * Teixeira'sHub CRM
 *
 * Receives: { tenant_id, messages, lead_id }
 * Retrieves knowledge_base for tenant_id (-created, limit 1)
 * Generates response using $ai.chat
 */

routerAdd('POST', '/api/ai/chat', (c) => {
  try {
    const data = $apis.requestInfo(c).data || {}
    const tenantId = data.tenant_id
    const incomingMessages = data.messages || []
    const leadId = data.lead_id

    if (!tenantId) {
      return c.json(400, {
        success: false,
        error: 'tenant_id é obrigatório.',
      })
    }

    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return c.json(400, {
        success: false,
        error: 'messages (array) é obrigatório e não pode ser vazio.',
      })
    }

    // Search knowledge_base for tenant_id ordered by -created limit 1
    let kbContent = ''
    try {
      const kbRecords = $app.findRecordsByFilter(
        'knowledge_base',
        'tenant_id = {:tenant_id}',
        '-created',
        1,
        0,
        { tenant_id: tenantId },
      )
      if (kbRecords && kbRecords.length > 0) {
        kbContent = kbRecords[0].get('content') || ''
      }
    } catch (e) {
      // If table query throws or none found, fallback
    }

    // If lead_id is provided, optionally fetch lead profile to enrich context
    let leadContext = ''
    if (leadId) {
      try {
        const leadRec = $app.findRecordById('leads', leadId)
        if (leadRec) {
          leadContext = `\n\n=== DADOS DO LEAD ATUAL ===\nNome: ${leadRec.get('name') || 'Não informado'}\nEmpresa: ${leadRec.get('company') || 'Não informado'}\nServiço: ${leadRec.get('service') || 'Geral'}\nTelefone: ${leadRec.get('whatsapp') || leadRec.get('phone') || 'Não informado'}`
        }
      } catch (_) {}
    }

    let systemPrompt = ''
    if (kbContent) {
      systemPrompt = `Você é um assistente jurídico do escritório Teixeira & Nascimento. Use a base de conhecimento abaixo para responder:\n\n${kbContent}${leadContext}`
    } else {
      systemPrompt = `Você é um assistente jurídico do escritório Teixeira & Nascimento. Responda com profissionalismo e fundamentação jurídica alinhada aos serviços do escritório.${leadContext}`
    }

    // Build chat messages for $ai.chat
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...incomingMessages.map((m) => ({
        role: m.role || 'user',
        content: m.content || '',
      })),
    ]

    const answer = $ai.chat(fullMessages)

    return c.json(200, {
      success: true,
      response: answer,
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message || 'Erro ao processar resposta com a IA.',
    })
  }
})
