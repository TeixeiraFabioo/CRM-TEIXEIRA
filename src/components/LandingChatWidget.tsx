import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { generateChatResponse } from '@/lib/skipAi'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: string
}

interface LandingChatWidgetProps {
  onScheduleClick?: () => void
}

export function LandingChatWidget({ onScheduleClick }: LandingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content:
        'Olá! Sou o assistente virtual do escritório Teixeira & Nascimento Advogados. Como posso orientar sua demanda jurídica hoje?',
      timestamp: new Date().toISOString(),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      setHasOpenedBefore(true)
      scrollToBottom()
    }
  }, [isOpen, messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const userText = inputMessage.trim()
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setLoading(true)

    try {
      const systemPrompt = `Você é o assistente virtual de triagem e acolhimento do renomado escritório de advocacia "Teixeira & Nascimento Advogados".
Áreas de atuação:
1. Direito Tributário (Recuperação de créditos, teses tributárias, planejamento fiscal, Tema 69 STF, defesa em execuções fiscais).
2. Direito Bancário (Revisão de contratos bancários, juros abusivos, CCBs empresariais, renegociação de passivo bancário).
3. Direito Trabalhista Empresarial e Individual (Compliance, passivo trabalhista, defesas e auditoria preventiva).
4. Direito do Consumidor de Alto Impacto (Danos morais, negativação indevida, contratos de prestação de serviços).

Diretrizes:
- Seja extremamente polido, ético, formal mas acessível e acolhedor.
- NUNCA dê garantia de resultado ou promessa de ganho de causa (conforme código de ética da OAB).
- Esclareça brevemente o conceito jurídico e SEMPRE convide o visitante a preencher o formulário de contato da página ou agendar uma análise inicial com a equipe de advogados especialistas.
- Responda sempre em Português do Brasil com excelente redação.`

      const conversation: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText },
      ]

      const reply = await generateChatResponse({
        messages: conversation,
        temperature: 0.6,
        public: true,
      })

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content:
          reply ||
          'Agradecemos a consulta. Nossos advogados especialistas podem analisar seu caso detalhadamente. Por favor, preencha o formulário nesta página para que possamos entrar em contato.',
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.warn('Erro no chat da landing page:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: `fallback_${Date.now()}`,
          role: 'assistant',
          content:
            'Para uma análise precisa dos seus documentos e do seu caso, recomendamos preencher o formulário ao lado. Nosso time jurídico retornará em minutos!',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Modal Window */}
      {isOpen && (
        <div className="mb-4 w-[92vw] max-w-[380px] h-[520px] max-h-[80vh] bg-card border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#0A1F3F] text-white p-4 flex items-center justify-between border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#0A1F3F] shadow-sm">
                <Scale className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-legal-serif tracking-wide text-white flex items-center gap-1.5">
                  Teixeira & Nascimento <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                </h4>
                <p className="text-[11px] text-amber-200/80 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{' '}
                  Atendimento Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Notice */}
          <div className="bg-amber-500/10 px-3 py-1.5 border-b border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Atendimento sigiloso sob as diretrizes da OAB.</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${
                    isAssistant ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback
                      className={`text-[10px] font-bold ${
                        isAssistant ? 'bg-[#0A1F3F] text-amber-400' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isAssistant ? 'TN' : 'VC'}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`p-3 rounded-2xl max-w-[82%] text-xs leading-relaxed shadow-xs ${
                      isAssistant
                        ? 'bg-card border border-border text-foreground rounded-tl-xs'
                        : 'bg-[#0A1F3F] text-white rounded-tr-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span
                      className={`text-[9px] block mt-1 ${
                        isAssistant ? 'text-muted-foreground' : 'text-white/70'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
            {loading && (
              <div className="flex items-start gap-2">
                <Avatar className="h-7 w-7 border shrink-0">
                  <AvatarFallback className="bg-[#0A1F3F] text-amber-400 text-[10px] font-bold">
                    TN
                  </AvatarFallback>
                </Avatar>
                <div className="p-3 bg-card border border-border rounded-2xl rounded-tl-xs text-xs text-muted-foreground flex items-center gap-2 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span>Consultando teses jurídicas...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick CTA inside chat */}
          <div className="p-2 bg-amber-500/5 border-t border-amber-500/15 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">
              Quer falar com um advogado agora?
            </span>
            <button
              onClick={() => {
                setIsOpen(false)
                if (onScheduleClick) {
                  onScheduleClick()
                } else {
                  document.getElementById('contato-form')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Preencher formulário <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t bg-card flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua dúvida jurídica..."
              className="h-9 text-xs focus-visible:ring-amber-500"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !inputMessage.trim()}
              className="h-9 w-9 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4 text-amber-400" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#0A1F3F] to-[#133363] text-white px-4 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-amber-400/40"
        aria-label="Abrir assistente jurídico"
      >
        <div className="relative">
          <MessageSquare className="h-5 w-5 text-amber-400" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0A1F3F] animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <span className="block text-xs font-bold font-legal-serif text-amber-300 tracking-wide">
            Dúvida Jurídica?
          </span>
          <span className="block text-[10px] text-white/80">Fale com nosso assistente</span>
        </div>
      </button>
    </div>
  )
}
export default LandingChatWidget
