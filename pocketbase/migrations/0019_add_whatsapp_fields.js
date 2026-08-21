migrate(
  (app) => {
    // 1. Expandir lead_messages com campos para WhatsApp (type, channel, status, media, etc.)
    const leadMessages = app.findCollectionByNameOrId('lead_messages')

    // Modificar type para aceitar 'nota' | 'sistema' | 'mensagem' | 'whatsapp'
    if (leadMessages.fields.getByName('type')) {
      const typeField = leadMessages.fields.getByName('type')
      typeField.values = ['nota', 'sistema', 'mensagem', 'whatsapp']
      typeField.maxSelect = 1
    }

    // Adicionar channel: 'internal' | 'whatsapp' | 'email' | 'sms'
    if (!leadMessages.fields.getByName('channel')) {
      leadMessages.fields.add(
        new SelectField({
          name: 'channel',
          values: ['internal', 'whatsapp', 'email', 'sms'],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar direction: 'inbound' | 'outbound'
    if (!leadMessages.fields.getByName('direction')) {
      leadMessages.fields.add(
        new SelectField({
          name: 'direction',
          values: ['inbound', 'outbound'],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar status_delivery: 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
    if (!leadMessages.fields.getByName('status_delivery')) {
      leadMessages.fields.add(
        new SelectField({
          name: 'status_delivery',
          values: ['pending', 'sent', 'delivered', 'read', 'failed'],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar external_id (ex: wamid da Meta)
    if (!leadMessages.fields.getByName('external_id')) {
      leadMessages.fields.add(new TextField({ name: 'external_id' }))
    }

    // Adicionar media_type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'location'
    if (!leadMessages.fields.getByName('media_type')) {
      leadMessages.fields.add(
        new SelectField({
          name: 'media_type',
          values: [
            'text',
            'image',
            'audio',
            'document',
            'video',
            'sticker',
            'location',
            'template',
          ],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar media_url
    if (!leadMessages.fields.getByName('media_url')) {
      leadMessages.fields.add(new TextField({ name: 'media_url' }))
    }

    // Adicionar media_caption
    if (!leadMessages.fields.getByName('media_caption')) {
      leadMessages.fields.add(new TextField({ name: 'media_caption' }))
    }

    // Adicionar metadata (json para payload detalhado)
    if (!leadMessages.fields.getByName('metadata')) {
      leadMessages.fields.add(new JSONField({ name: 'metadata' }))
    }

    // Tornar author_id opcional (pois mensagens inbound do cliente não têm usuário PB associado)
    if (leadMessages.fields.getByName('author_id')) {
      const authorField = leadMessages.fields.getByName('author_id')
      authorField.required = false
    }

    // Tornar content opcional ou aceitar string vazia se houver apenas mídia
    if (leadMessages.fields.getByName('content')) {
      const contentField = leadMessages.fields.getByName('content')
      contentField.required = false
    }

    // Tornar team opcional (default comercial)
    if (leadMessages.fields.getByName('team')) {
      const teamField = leadMessages.fields.getByName('team')
      teamField.required = false
    }

    app.save(leadMessages)

    // Adicionar índice para external_id em lead_messages
    leadMessages.addIndex('idx_lead_messages_external_id', false, 'external_id', '')
    app.save(leadMessages)

    // 2. Garantir campos de WhatsApp e última interação no lead
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('last_inbound_message_at')) {
      leadsCol.fields.add(new DateField({ name: 'last_inbound_message_at' }))
    }
    if (!leadsCol.fields.getByName('last_outbound_message_at')) {
      leadsCol.fields.add(new DateField({ name: 'last_outbound_message_at' }))
    }
    if (!leadsCol.fields.getByName('whatsapp_conversation_id')) {
      leadsCol.fields.add(new TextField({ name: 'whatsapp_conversation_id' }))
    }
    app.save(leadsCol)
  },
  (app) => {
    try {
      const leadMessages = app.findCollectionByNameOrId('lead_messages')
      leadMessages.removeIndex('idx_lead_messages_external_id')
      app.save(leadMessages)
    } catch (_) {}
  },
)
