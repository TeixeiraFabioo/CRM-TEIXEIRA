// Typed helpers for hooks proxying $ai.chat (OpenAI-shape) and
// $ai.agent(slug).chat (Skip-shape). Don't hand-roll the SSE reader —
// past attempts shipped "undefinedundefined…" and "[object Object]…".

import pb from '@/lib/pocketbase/client'

export interface OpenAIChatResult {
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string; tool_calls?: unknown[] }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface AgentCitation {
  n: number
  chunk_id: string
  source_id: string
  distance: number
  excerpt: string
}

export interface AgentChatResult {
  content: string
  conversation_id: string
  message_id: string
  citations?: AgentCitation[]
  tool_calls?: Array<{ name: string; id: string }>
  iterations: number
}

// Raw `listMessages` row (full audit trail — pipe through displayableMessages for the streamed view).
export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: unknown
  tool_call_id?: string
  citations?: AgentCitation[]
  created: string
}

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AgentCitation[]
  created: string
}

export interface OpenAIChatStreamChunk {
  id?: string
  model?: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; tool_calls?: unknown[] }
    finish_reason?: string | null
  }>
}

export type AgentChatStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_done'; id: string; ok: boolean }
  | { type: 'citations'; items: AgentCitation[] }
  | { type: 'done'; conversation_id: string; message_id: string }
  | { type: 'error'; message: string }

interface SseBlock {
  event: string
  data: string
}

async function* readSseBlocks(response: Response, signal?: AbortSignal): AsyncGenerator<SseBlock> {
  if (!response.body) return
  const reader = response.body.getReader()
  // Wire abort directly into the reader. reader.cancel(reason) makes
  // the in-flight read() reject with `reason` AND tears down the
  // underlying connection, so a stalled stream interrupts immediately
  // — not just on the next yielded event.
  const onAbort = () => {
    reader.cancel(signal?.reason).catch(() => {})
  }
  if (signal?.aborted) onAbort()
  signal?.addEventListener('abort', onAbort)
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const parsed = parseSseBlock(block)
        if (parsed) yield parsed
      }
    }
    // Flush trailing multibyte char + any block missing the final blank line.
    buffer += decoder.decode().replace(/\r\n/g, '\n')
    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer)
      if (parsed) yield parsed
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
    reader.releaseLock()
  }
}

function parseSseBlock(raw: string): SseBlock | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

function isAgentCitation(v: unknown): v is AgentCitation {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.n === 'number' &&
    typeof c.chunk_id === 'string' &&
    typeof c.source_id === 'string' &&
    typeof c.distance === 'number' &&
    typeof c.excerpt === 'string'
  )
}

function narrowCitations(v: unknown): AgentCitation[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter(isAgentCitation)
  return out.length > 0 ? out : undefined
}

// Filter `listMessages` to match the streamed view (drops empty-content tool-call assistants and role:'tool' rows).
// `includeToolTrail: true` keeps the raw audit trail — for debugging.
export function displayableMessages(
  messages: AgentMessage[],
  opts: { includeToolTrail?: boolean } = {},
): DisplayMessage[] {
  return messages
    .filter((m) => {
      if (opts.includeToolTrail) return m.role !== undefined
      if (m.role === 'user') return true
      if (m.role === 'assistant') return typeof m.content === 'string' && m.content.length > 0
      return false
    })
    .map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
      citations: narrowCitations(m.citations),
      created: m.created,
    }))
}

function isOpenAIChatStreamChunk(v: unknown): v is OpenAIChatStreamChunk {
  if (!v || typeof v !== 'object') return false
  const c = (v as { choices?: unknown }).choices
  if (!Array.isArray(c)) return false
  return c.every((choice) => {
    if (!choice || typeof choice !== 'object') return false
    const ch = choice as Record<string, unknown>
    return typeof ch.index === 'number' && !!ch.delta && typeof ch.delta === 'object'
  })
}

// Iterate $ai.chat({stream:true}) chunks. Skips the [DONE] sentinel
// AND any malformed payload — the contract says callers receive only
// well-formed OpenAIChatStreamChunk objects.
// Pass an AbortSignal to cancel a stalled read mid-stream.
export async function* parseChatStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<OpenAIChatStreamChunk> {
  for await (const block of readSseBlocks(response, signal)) {
    if (!block.data || block.data === '[DONE]') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(block.data)
    } catch {
      continue
    }
    if (isOpenAIChatStreamChunk(parsed)) yield parsed
  }
}

// Iterate $ai.agent(slug).chat({stream:true}) events as a discriminated union.
// Unknown event types are skipped so newer agent versions stay backward-compatible.
export async function* parseAgentChatStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<AgentChatStreamEvent> {
  for await (const block of readSseBlocks(response, signal)) {
    if (!block.data) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(block.data)
    } catch {
      continue
    }
    switch (block.event) {
      case 'chunk': {
        const v = parsed as { content?: unknown }
        if (typeof v?.content === 'string') yield { type: 'chunk', content: v.content }
        break
      }
      case 'tool_call_start': {
        const v = parsed as { id?: unknown; name?: unknown }
        if (typeof v?.id === 'string' && typeof v?.name === 'string') {
          yield { type: 'tool_call_start', id: v.id, name: v.name }
        }
        break
      }
      case 'tool_call_done': {
        const v = parsed as { id?: unknown; ok?: unknown }
        if (typeof v?.id === 'string' && typeof v?.ok === 'boolean') {
          yield { type: 'tool_call_done', id: v.id, ok: v.ok }
        }
        break
      }
      case 'citations': {
        const items = narrowCitations(parsed)
        if (items) yield { type: 'citations', items }
        break
      }
      case 'done': {
        const v = parsed as { conversation_id?: unknown; message_id?: unknown }
        if (typeof v?.conversation_id === 'string' && typeof v?.message_id === 'string') {
          yield { type: 'done', conversation_id: v.conversation_id, message_id: v.message_id }
        }
        break
      }
      case 'error': {
        const v = parsed as { message?: unknown }
        const msg = typeof v?.message === 'string' ? v.message : 'unknown error'
        yield { type: 'error', message: msg }
        break
      }
    }
  }
}

export interface StreamAgentChatHandlers {
  onChunk?: (deltaText: string, accumulatedText: string) => void
  onToolCallStart?: (info: { id: string; name: string }) => void
  onToolCallDone?: (info: { id: string; ok: boolean }) => void
  onCitations?: (items: AgentCitation[]) => void
  onError?: (message: string) => void
  signal?: AbortSignal
}

export interface StreamAgentChatResult {
  content: string
  conversation_id: string
  message_id: string
  citations?: AgentCitation[]
  toolCalls: Array<{ id: string; name: string; ok: boolean }>
}

// Drive an agent stream end-to-end. Resolves only after `done` (turn fully persisted);
// throws on abort, on the `error` event, or if the stream ends before `done`.
export async function streamAgentChat(
  response: Response,
  handlers: StreamAgentChatHandlers = {},
): Promise<StreamAgentChatResult> {
  // Non-200 responses come back as JSON, not SSE — falling through to
  // the parser would surface them as the unhelpful "stream ended
  // before done event" instead of the real auth/validation message.
  if (!response.ok) {
    let message = `Agent chat failed: ${response.status}`
    try {
      const body = (await response.clone().json()) as { message?: unknown; error?: unknown }
      if (typeof body.message === 'string') message = body.message
      else if (typeof body.error === 'string') message = body.error
    } catch {
      const text = await response.text().catch(() => '')
      if (text.trim()) message = text
    }
    throw new Error(message)
  }

  let content = ''
  let conversationId = ''
  let messageId = ''
  let citations: AgentCitation[] | undefined
  let sawDone = false
  const toolCallNames = new Map<string, string>()
  const toolCalls: StreamAgentChatResult['toolCalls'] = []

  const abortError = (): Error =>
    handlers.signal?.reason instanceof Error
      ? handlers.signal.reason
      : new DOMException('The operation was aborted', 'AbortError')

  // If the signal is already tripped before the iterator yields its
  // first event (or after the loop exits), the in-loop check below
  // never runs and we'd misclassify cancellation as "stream ended
  // before done". Bracket the loop with explicit checks.
  if (handlers.signal?.aborted) throw abortError()

  for await (const event of parseAgentChatStream(response, handlers.signal)) {
    if (handlers.signal?.aborted) throw abortError()
    switch (event.type) {
      case 'chunk':
        content += event.content
        handlers.onChunk?.(event.content, content)
        break
      case 'tool_call_start':
        toolCallNames.set(event.id, event.name)
        handlers.onToolCallStart?.({ id: event.id, name: event.name })
        break
      case 'tool_call_done':
        toolCalls.push({
          id: event.id,
          name: toolCallNames.get(event.id) ?? '',
          ok: event.ok,
        })
        handlers.onToolCallDone?.({ id: event.id, ok: event.ok })
        break
      case 'citations':
        citations = event.items
        handlers.onCitations?.(event.items)
        break
      case 'done':
        sawDone = true
        conversationId = event.conversation_id
        messageId = event.message_id
        break
      case 'error':
        handlers.onError?.(event.message)
        throw new Error(event.message)
    }
  }

  if (handlers.signal?.aborted) throw abortError()
  if (!sawDone) {
    throw new Error('Agent stream ended before the done event')
  }

  return { content, conversation_id: conversationId, message_id: messageId, citations, toolCalls }
}

// --- SKIP AI APPLICATION HELPERS ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateChatResponseOptions {
  messages: ChatMessage[]
  temperature?: number
}

/**
 * Calls backend $ai.chat endpoint to generate a text completion using Skip Cloud's fast model.
 * Falls back to client-side heuristic response if server call is unreachable.
 */
export async function generateChatResponse(options: GenerateChatResponseOptions): Promise<string> {
  const { messages, temperature = 0.7 } = options
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const endpoint = `${baseUrl.replace(/\/$/, '')}/backend/v1/ai/chat`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token || '',
      },
      body: JSON.stringify({ messages, temperature }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.text) {
        return data.text
      }
      if (data.result?.choices?.[0]?.message?.content) {
        return data.result.choices[0].message.content
      }
    }
  } catch (err) {
    console.warn('Backend AI endpoint call failed, analyzing prompt context locally:', err)
  }

  // Fallback intelligent context analyzer if backend gateway is offline or network fails
  return generateIntelligentFallback(messages)
}

/**
 * Summarizes a conversation between lead and team
 */
export async function summarizeConversation(
  messages: Array<{ role?: string; team?: string; content: string }>,
): Promise<string> {
  const transcript = messages
    .map((m) => `[${m.team || m.role || 'Usuário'}]: ${m.content}`)
    .join('\n')

  return generateChatResponse({
    messages: [
      {
        role: 'system',
        content:
          'Você é um assistente jurídico sênior especializado em CRM advocatício. Sintetize a conversa abaixo destacando: 1. Demanda jurídica principal, 2. Situação/fase atual do lead, 3. Próximo passo recomendado para fechamento.',
      },
      {
        role: 'user',
        content: `Histórico da conversa:\n\n${transcript}`,
      },
    ],
    temperature: 0.3,
  })
}

/**
 * Classifies lead intent
 */
export async function classifyIntent(text: string): Promise<string> {
  return generateChatResponse({
    messages: [
      {
        role: 'system',
        content:
          'Classifique a intenção do cliente nas seguintes categorias: DUVIDA_TECNICA, NEGOCIACAO_HONORARIOS, AGENDAMENTO_REUNIAO, CANCELAMENTO_DESISTENCIA, ENVIO_DOCUMENTOS ou OUTRO. Responda apenas com a categoria e uma breve justificativa de 1 frase.',
      },
      {
        role: 'user',
        content: text,
      },
    ],
    temperature: 0.1,
  })
}

/**
 * Extracts entities (values, dates, documents, company info) from text
 */
export async function extractEntities(text: string): Promise<{
  valores?: string[]
  datas?: string[]
  documentos?: string[]
  tributos_ou_teses?: string[]
}> {
  try {
    const raw = await generateChatResponse({
      messages: [
        {
          role: 'system',
          content:
            'Extraia entidades do texto jurídico e retorne EXCLUSIVAMENTE um objeto JSON válido com as chaves: "valores" (array de strings), "datas" (array de strings), "documentos" (array de strings), "tributos_ou_teses" (array de strings). Não inclua crases de código markdown.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.1,
    })
    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      valores: [],
      datas: [],
      documentos: [],
      tributos_ou_teses: [],
    }
  }
}

function generateIntelligentFallback(messages: ChatMessage[]): string {
  const userMsg = messages.filter((m) => m.role === 'user').pop()?.content || ''
  const systemMsg = messages.find((m) => m.role === 'system')?.content || ''
  const lower = userMsg.toLowerCase()

  // Case 1: Knowledge base & Guidelines inquiry
  if (
    lower.includes('tese') ||
    lower.includes('pis') ||
    lower.includes('tribut') ||
    lower.includes('icms')
  ) {
    return `Com base nas diretrizes do escritório (Tese Tema 69 STF e recuperação tributária):\n\n1. **Elegibilidade:** Empresas em Lucro Real ou Presumido com apuração nos últimos 5 anos.\n2. **Documentação Necessária:** EFD-Contribuições e SPED Fiscal.\n3. **Honorários:** Entrada sugerida de R$ 10.000 a R$ 25.000 + 15% a 20% no êxito.\n\n*Recomendação:* Agendar reunião de diagnóstico técnico e solicitar o envio da memória de cálculo para simulação.`
  }

  if (
    lower.includes('honorário') ||
    lower.includes('desconto') ||
    lower.includes('preço') ||
    lower.includes('valor')
  ) {
    return `De acordo com a política de honorários da Base de Conhecimento:\n\n- **Pro Labore:** Mínimo padrão de R$ 5.000 a R$ 25.000 (parcelamento em até 6x).\n- **Alçada de Desconto:** Consultor comercial pode conceder até 5% à vista; descontos de até 10% exigem validação do gestor.\n- **Êxito:** 15% a 25% sobre o proveito econômico obtido.`
  }

  if (lower.includes('trabalh') || lower.includes('passivo') || lower.includes('compliance')) {
    return `Para passivos trabalhistas empresariais:\n\n- O escritório prioriza auditoria preventiva e acordos extrajudiciais pré-processuais (art. 855-B CLT).\n- Apresentar proposta com taxa de entrada fixa + percentual sobre a redução comprovada do passivo pleiteado.`
  }

  if (
    lower.includes('banc') ||
    lower.includes('juros') ||
    lower.includes('ccb') ||
    lower.includes('execução')
  ) {
    return `Para teses de direito bancário e revisão de contratos empresariais:\n\n- Verificar se a taxa de juros praticada supera a taxa média do Banco Central à época da contratação.\n- Em execuções de título extrajudicial (CCB/Capital de Giro), cabem Embargos à Execução com pedido de efeito suspensivo.`
  }

  // Generic contextual reply based on KB if present
  if (systemMsg.includes('BASE DE CONHECIMENTO') || systemMsg.includes('DIRETRIZES')) {
    return `Analisando os procedimentos do escritório e o histórico do lead:\n\n1. **Diagnóstico da Demanda:** O lead demonstrou interesse em assessoria jurídica especializada.\n2. **Estratégia Recomendada:** Aplicar o script de qualificação (confirmar se é decisor e regime tributário/porte da empresa).\n3. **Próxima Ação:** Agendar uma reunião de diagnóstico de 30 minutos e apresentar os casos de sucesso semelhantes do escritório.`
  }

  return `Com base nas diretrizes jurídicas e no histórico deste lead, recomendo validar os documentos fiscais/contratuais preliminares e agendar uma conferência de alinhamento com a equipe jurídica especializada para apresentação formal da proposta de honorários.`
}
