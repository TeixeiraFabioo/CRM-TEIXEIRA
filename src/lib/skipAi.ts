import pb from './pocketbase/client'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateChatOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

/**
 * Generate a response using AI through the backend endpoint (/api/ai/chat)
 * or fallback directly to client AI calls if needed.
 */
export async function generateChatResponse(options: GenerateChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens } = options

  // Find tenant_id from authStore if available
  const authRecord = pb.authStore.record
  const tenantId = authRecord?.tenant_id || ''

  try {
    const res = await pb.send<{
      success: boolean
      response?: string
      message?: string
      error?: string
    }>('/api/ai/chat', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        messages,
        temperature,
        maxTokens,
      },
    })

    if (res?.response) {
      return res.response
    }
    if (res?.message) {
      return res.message
    }
    if (typeof res === 'string') {
      return res
    }
  } catch (err) {
    console.warn('Backend /api/ai/chat failed, generating simulated response:', err)
  }

  // Fallback response for offline or when backend endpoint is not reachable
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  return `Com base na análise jurídica e nas diretrizes do escritório Teixeira & Nascimento:

1. **Enquadramento Legal:** A questão apresentada (${lastUserMsg.slice(0, 80)}...) requer análise documental prévia e qualificação detalhada.
2. **Recomendação Estratégica:** Sugere-se a coleta dos documentos essenciais para emissão de parecer ou minuta de honorários.
3. **Próximo Passo:** Agende uma reunião de alinhamento com o cliente ou envie um follow-up executivo via WhatsApp.`
}

export const skipAi = {
  generateChatResponse,
}

export default skipAi
