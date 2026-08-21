import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Flame,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Send,
  Pin,
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  Target,
  Share2,
  Edit,
  Tag,
  AlertTriangle,
  Scale,
  Sparkles,
  MessageSquare,
  ArrowRightLeft,
  Bot,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { generateChatResponse } from '@/lib/skipAi'
import { useTenant } from '@/contexts/TenantContext'
import { useRealtime } from '@/hooks/use-realtime'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { TimelineView, TimelineItem } from '@/components/TimelineView'
import {
  LeadRecord,
  NoteRecord,
  LeadMessageRecord,
  TaskRecord,
  OpportunityRecord,
  ProposalRecord,
  ContractRecord,
  UserRecord,
  PipelineStageRecord,
  TagRecord,
  CustomFieldRecord,
  MessageTemplateRecord,
} from '@/types/platform'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MessageSquareText, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

type TeamType = 'comercial' | 'juridico' | 'financeiro'

const formatMessageDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    return `Hoje às ${timeStr}`
  }
  if (isYesterday) {
    return `Ontem às ${timeStr}`
  }
  return `${date.toLocaleDateString('pt-BR')} às ${timeStr}`
}

const getTeamBadge = (team: string) => {
  switch (team?.toLowerCase()) {
    case 'comercial':
      return {
        label: 'Comercial',
        className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      }
    case 'juridico':
    case 'jurídico':
      return {
        label: 'Jurídico',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      }
    case 'financeiro':
      return {
        label: 'Financeiro',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      }
    default:
      return {
        label: team || 'Geral',
        className: 'bg-muted text-muted-foreground border-border',
      }
  }
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant, user } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [messages, setMessages] = useState<LeadMessageRecord[]>([])
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [stages, setStages] = useState<PipelineStageRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Tags and Custom Fields State
  const [availableTags, setAvailableTags] = useState<TagRecord[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldRecord[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [savingCustomFields, setSavingCustomFields] = useState(false)

  // Message Templates State
  const [activeMessageTemplates, setActiveMessageTemplates] = useState<MessageTemplateRecord[]>([])
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)

  // Chat message input state
  const defaultUserTeam: TeamType =
    (user?.team as TeamType) || ((user?.settings as any)?.team as TeamType) || 'comercial'
  const [selectedTeam, setSelectedTeam] = useState<TeamType>(defaultUserTeam)
  const [messageContent, setMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Transfer Team Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [targetTeam, setTargetTeam] = useState<TeamType>('juridico')
  const [transferring, setTransferring] = useState(false)

  // AI Assistant Sheet state
  const [aiSheetOpen, setAiSheetOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiChatHistory, setAiChatHistory] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>
  >([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou o Assistente IA do Teixeira & Nascimento Advogados. Estou alimentado com a Base de Conhecimento técnico do escritório e o histórico recente deste lead. Como posso ajudar? Você pode me perguntar sobre teses aplicáveis, valores de honorários recomendados, ou pedir para redigir uma resposta/argumento.',
      timestamp: new Date().toISOString(),
    },
  ])
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
  const aiChatBottomRef = useRef<HTMLDivElement>(null)

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [notePinned, setNotePinned] = useState(false)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskData, setTaskData] = useState<Partial<TaskRecord>>({
    titulo: 'Reunião de Alinhamento Jurídico',
    tipo: 'reuniao',
    prioridade: 'alta',
    data: new Date().toISOString().slice(0, 10),
    horario: '14:00',
    descricao: '',
  })

  const [oppModalOpen, setOppModalOpen] = useState(false)
  const [oppData, setOppData] = useState<Partial<OpportunityRecord>>({
    title: '',
    value: 20000,
    servico: 'Recuperação Tributária e Teses Fiscais',
    probabilidade: 50,
  })

  const [wonModalOpen, setWonModalOpen] = useState(false)
  const [wonData, setWonData] = useState({
    value: 25000,
    servico: 'Honorários Advocatícios Especializados',
    observacoes: 'Contratação aprovada pela diretoria.',
  })

  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [lostData, setLostData] = useState({
    loss_reason: 'preço',
    observacoes: '',
  })

  const loadMessages = async (leadId: string) => {
    try {
      const msgs = await CrmService.getLeadMessages(leadId)
      setMessages(msgs)
    } catch (e) {
      console.warn('Erro ao carregar mensagens do lead:', e)
    }
  }

  // Realtime subscription for lead_messages
  useRealtime(
    'lead_messages',
    (e) => {
      const rec = e.record as unknown as LeadMessageRecord
      if (rec.lead_id !== id) return
      if (e.action === 'create') {
        // Fetch fresh message to ensure expand author_id is populated
        pb.collection('lead_messages')
          .getOne<LeadMessageRecord>(rec.id, { expand: 'author_id' })
          .then((freshMsg) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === freshMsg.id)) return prev
              return [...prev, freshMsg]
            })
            setTimeout(() => {
              chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          })
          .catch(() => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === rec.id)) return prev
              return [...prev, rec]
            })
          })
      } else if (e.action === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== rec.id))
      } else if (e.action === 'update') {
        pb.collection('lead_messages')
          .getOne<LeadMessageRecord>(rec.id, { expand: 'author_id' })
          .then((freshMsg) => {
            setMessages((prev) => prev.map((m) => (m.id === freshMsg.id ? freshMsg : m)))
          })
          .catch(() => {
            setMessages((prev) => prev.map((m) => (m.id === rec.id ? rec : m)))
          })
      }
    },
    !!id,
  )

  // Realtime subscription for lead updates (e.g. team_owner changes)
  useRealtime(
    'leads',
    (e) => {
      const rec = e.record as unknown as LeadRecord
      if (rec.id === id && e.action === 'update') {
        setLead((prev) => (prev ? { ...prev, ...rec } : rec))
      }
    },
    !!id,
  )
  const loadAll = async () => {
    if (!id || !tenant?.id) return
    setLoading(true)
    try {
      const [
        leadData,
        leadMsgs,
        allNotes,
        allTasks,
        allOpps,
        allProps,
        allUsers,
        allTags,
        leadCustomFields,
        allTemplates,
      ] = await Promise.all([
        CrmService.getLeadById(id),
        CrmService.getLeadMessages(id),
        CrmService.getNotes(tenant.id, `lead_id = "${id}"`),
        CrmService.getTasks(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getProposals(tenant.id),
        CrmService.getUsers(tenant.id),
        CrmService.getTags(tenant.id),
        CrmService.getCustomFields(tenant.id, 'lead'),
        CrmService.getMessageTemplates(tenant.id),
      ])

      setLead(leadData)
      setMessages(leadMsgs)
      setNotes(allNotes)
      setTasks(allTasks.filter((t) => t.lead_id === id))
      setOpportunities(allOpps.filter((o) => o.lead_id === id))
      setProposals(allProps.filter((p) => p.lead_id === id))
      setUsers(allUsers)
      setAvailableTags(allTags)
      setCustomFields(leadCustomFields)
      setActiveMessageTemplates(allTemplates.filter((t) => t.status === 'ativo'))

      if (leadData && leadData.custom_fields) {
        setCustomFieldValues(leadData.custom_fields)
      } else {
        setCustomFieldValues({})
      }

      if (leadData) {
        setOppData((prev) => ({
          ...prev,
          title: `Assessoria: ${leadData.name}`,
          value: leadData.potential_value || leadData.valor_potencial || 20000,
          servico: leadData.service || 'Recuperação Tributária e Teses Fiscais',
        }))
        setWonData((prev) => ({
          ...prev,
          value: leadData.potential_value || leadData.valor_potencial || 25000,
          servico: leadData.service || 'Assessoria Jurídica',
        }))
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar detalhes do lead', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [id, tenant?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() || !id || !tenant?.id) return
    const authorId = user?.id || pb.authStore.record?.id
    if (!authorId) {
      toast({
        title: 'Usuário não identificado',
        description: 'Faça login novamente para enviar mensagens.',
        variant: 'destructive',
      })
      return
    }

    setSendingMessage(true)
    try {
      await pb.collection('lead_messages').create({
        lead_id: id,
        tenant_id: tenant.id,
        author_id: authorId,
        team: selectedTeam,
        type: 'nota',
        content: messageContent.trim(),
      })
      setMessageContent('')
      loadMessages(id)
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao enviar mensagem',
        description: err?.message || 'Falha ao registrar no chat',
        variant: 'destructive',
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim() || aiLoading || !tenant?.id || !lead) return

    const userQuestion = aiPrompt.trim()
    const newMsgId = `user_${Date.now()}`
    const userMsg = {
      id: newMsgId,
      role: 'user' as const,
      content: userQuestion,
      timestamp: new Date().toISOString(),
    }

    setAiChatHistory((prev) => [...prev, userMsg])
    setAiPrompt('')
    setAiLoading(true)
    setAiError(null)

    setTimeout(() => {
      aiChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    try {
      // 1. Fetch recent lead messages thread (up to last 20)
      const recentMsgs = messages.slice(-20)
      const formattedHistory =
        recentMsgs.length > 0
          ? recentMsgs
              .map((m) => {
                const teamName = getTeamBadge(m.team).label
                const author =
                  m.expand?.author_id?.name || (m.type === 'sistema' ? 'Sistema' : 'Membro')
                return `[${teamName} - ${author}]: ${m.content}`
              })
              .join('\n')
          : 'Nenhuma mensagem ou nota anterior registrada neste lead.'

      // 2. Fetch knowledge base content for the tenant
      let kbContent = ''
      try {
        const kb = await CrmService.getKnowledgeBase(tenant.id)
        kbContent = kb?.content || ''
      } catch (e) {
        console.warn('Could not load knowledge base', e)
      }

      // 3. Construct system prompt with lead profile, KB, conversation history
      const systemInstruction = `Você é o Assistente de Inteligência Jurídica e Comercial do escritório "Teixeira & Nascimento - Advogados Associados".
Seu objetivo é orientar o time interno (Comercial, Jurídico e Financeiro) com respostas precisas, fundamentadas e alinhadas às diretrizes do escritório.

=== PERFIL DO LEAD ATUAL ===
- Nome: ${lead.name}
- Empresa / Razão: ${lead.company || 'Pessoa Física'}
- Telefone/WhatsApp: ${lead.whatsapp || lead.phone || 'Não informado'}
- E-mail: ${lead.email || 'Não informado'}
- Serviço / Interesse: ${lead.service || 'Assessoria Jurídica'}
- Origem / Canal: ${lead.origem || lead.source || 'Meta Ads'} (Campanha: ${lead.campaign || 'Geral'})
- Equipe Responsável Atual: ${getTeamBadge(lead.team_owner || lead.team || 'comercial').label}
- Temperatura / Status: ${lead.temperature || 'Quente'} / ${lead.status || 'Em Atendimento'}
- Valor Potencial Estimado: R$ ${Number(lead.potential_value || lead.valor_potencial || 0).toLocaleString('pt-BR')}
- Observações Iniciais: ${lead.observacoes || 'Nenhuma'}

=== BASE DE CONHECIMENTO & POLÍTICAS DO ESCRITÓRIO ===
${kbContent || 'Diretrizes padrão: Foco em recuperação tributária, direito bancário empresarial e passivos trabalhistas. Pro Labore médio de R$ 10.000 a R$ 25.000 com êxito de 15% a 25%.'}

=== HISTÓRICO RECENTE DA THREAD DO LEAD (Últimas 20 mensagens) ===
${formattedHistory}

=== INSTRUÇÕES DE RESPOSTA ===
- Responda em português brasileiro de forma profissional, direta e executiva.
- Fundamente com base nas teses, jurisprudências e alçadas de honorários da Base de Conhecimento do escritório.
- Se for sugerido um próximo passo ou mensagem para o cliente, forneça um modelo pronto para envio.
- Sempre respeite a governança e alçadas de desconto definidas na base de conhecimento.`

      // 4. Call generateChatResponse from src/lib/skipAi.ts
      const responseText = await generateChatResponse({
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userQuestion },
        ],
        temperature: 0.7,
      })

      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: responseText,
        timestamp: new Date().toISOString(),
      }

      setAiChatHistory((prev) => [...prev, assistantMsg])
      setTimeout(() => {
        aiChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch (err: any) {
      console.error('Erro no Assistente IA:', err)
      setAiError(err?.message || 'Falha ao processar solicitação com a IA. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAiAsNote = async (aiMessageContent: string, messageId: string) => {
    if (!id || !tenant?.id) return
    const authorId = user?.id || pb.authStore.record?.id
    if (!authorId) {
      toast({
        title: 'Usuário não identificado',
        description: 'Faça login para registrar notas.',
        variant: 'destructive',
      })
      return
    }

    setSavingNoteId(messageId)
    try {
      // Create message of type 'nota' in lead_messages with AI content
      await pb.collection('lead_messages').create({
        lead_id: id,
        tenant_id: tenant.id,
        author_id: authorId,
        team: selectedTeam,
        type: 'nota',
        content: `🤖 [Assistente IA / Parecer]\n${aiMessageContent}`,
      })

      toast({
        title: 'Resposta da IA salva como nota!',
        description: 'Registrada com sucesso na thread de mensagens do lead.',
      })

      loadMessages(id)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar como nota',
        description: err?.message || 'Falha ao persistir na thread',
        variant: 'destructive',
      })
    } finally {
      setSavingNoteId(null)
    }
  }

  const handleToggleTag = async (tagId: string) => {
    if (!lead || !id) return
    try {
      const currentTags = Array.isArray(lead.tags) ? [...lead.tags] : []
      let newTags: string[]
      if (currentTags.includes(tagId)) {
        newTags = currentTags.filter((t) => t !== tagId)
      } else {
        newTags = [...currentTags, tagId]
      }
      const updated = await pb.collection('leads').update<LeadRecord>(id, { tags: newTags })
      setLead(updated)
      toast({ title: 'Tags atualizadas com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar tags', description: e?.message, variant: 'destructive' })
    }
  }

  const handleSaveCustomFieldValues = async () => {
    if (!id || !lead) return
    setSavingCustomFields(true)
    try {
      const updated = await pb.collection('leads').update<LeadRecord>(id, {
        custom_fields: customFieldValues,
      })
      setLead(updated)
      toast({ title: 'Campos personalizados salvos!' })
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar campos personalizados',
        description: e?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingCustomFields(false)
    }
  }

  const handleApplyTemplate = (conteudo: string) => {
    setMessageContent((prev) => (prev ? `${prev}\n${conteudo}` : conteudo))
    setTemplatePopoverOpen(false)
    toast({ title: 'Template inserido no campo de mensagem!' })
  }

  const handleTransferTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !tenant?.id) return
    const authorId = user?.id || pb.authStore.record?.id
    const authorName = user?.name || pb.authStore.record?.name || 'Usuário'

    const currentTeam = (lead?.team_owner || lead?.team || 'comercial') as TeamType
    if (currentTeam === targetTeam) {
      toast({
        title: 'Equipe já selecionada',
        description: `O lead já está atribuído à equipe ${getTeamBadge(targetTeam).label}.`,
      })
      setTransferModalOpen(false)
      return
    }

    setTransferring(true)
    try {
      // 1. Atualizar lead com novo team_owner
      const updatedLead = await pb.collection('leads').update<LeadRecord>(id, {
        team_owner: targetTeam,
        team: targetTeam,
      })
      setLead(updatedLead)

      // 2. Formatar data e hora atual
      const nowFormatted = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const teamOriginLabel = getTeamBadge(currentTeam).label
      const teamDestLabel = getTeamBadge(targetTeam).label

      const systemContent = `🔁 ${authorName} transferiu este lead da equipe ${teamOriginLabel} para ${teamDestLabel} em ${nowFormatted}`

      // 3. Inserir mensagem de sistema na thread
      await pb.collection('lead_messages').create({
        lead_id: id,
        tenant_id: tenant.id,
        author_id: authorId,
        team: targetTeam,
        type: 'sistema',
        content: systemContent,
      })

      toast({
        title: 'Lead repassado com sucesso!',
        description: `Transferido para a equipe ${teamDestLabel}.`,
      })

      setTransferModalOpen(false)
      loadMessages(id)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao transferir lead',
        description: err?.message || 'Não foi possível repassar o lead.',
        variant: 'destructive',
      })
    } finally {
      setTransferring(false)
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim() || !tenant?.id || !id) return
    const authorId = user?.id || pb.authStore.record?.id || ''
    try {
      // 1. Create in lead_messages so it appears in the chat thread
      await pb.collection('lead_messages').create({
        lead_id: id,
        tenant_id: tenant.id,
        author_id: authorId,
        team: selectedTeam,
        type: 'nota',
        content: noteContent.trim(),
      })

      // 2. Also keep legacy note record if needed for historical notes
      await CrmService.createNote(tenant.id, {
        conteudo: noteContent,
        lead_id: id,
        fixada: notePinned,
        categoria: 'Atendimento Jurídico',
      })

      setNoteContent('')
      setNotePinned(false)
      setNoteModalOpen(false)
      toast({ title: 'Nota interna registrada com sucesso na thread' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao criar nota', variant: 'destructive' })
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      await CrmService.createTask(tenant.id, {
        ...taskData,
        lead_id: id,
      })
      setTaskModalOpen(false)
      toast({ title: 'Tarefa jurídica agendada com sucesso' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao agendar tarefa', variant: 'destructive' })
    }
  }

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      const opp = await CrmService.createOpportunity(tenant.id, {
        ...oppData,
        lead_id: id,
        status: 'open',
      })
      setOppModalOpen(false)
      toast({ title: 'Oportunidade criada no Kanban!' })
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao criar oportunidade', variant: 'destructive' })
    }
  }

  const handleMarkWon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      // Create opportunity if none exists, then mark won
      let targetOppId = opportunities[0]?.id
      if (!targetOppId) {
        const opp = await CrmService.createOpportunity(tenant.id, {
          title: `Contrato Fechado: ${lead?.name}`,
          value: wonData.value,
          servico: wonData.servico,
          lead_id: id,
          status: 'open',
        })
        targetOppId = opp.id
      }
      await CrmService.markOpportunityWon(targetOppId, wonData)
      toast({ title: 'Parabéns! Lead convertido em CLIENTE contratado!' })
      setWonModalOpen(false)
      navigate('/clientes')
    } catch (err: any) {
      toast({ title: 'Erro ao marcar como ganho', variant: 'destructive' })
    }
  }

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !id) return
    try {
      if (opportunities.length > 0) {
        await CrmService.markOpportunityLost(
          opportunities[0].id,
          lostData.loss_reason,
          lostData.observacoes,
        )
      }
      await CrmService.updateLead(id, {
        status: 'Perdido',
        observacoes:
          (lead?.observacoes || '') +
          `\n[MOTIVO PERDA]: ${lostData.loss_reason} - ${lostData.observacoes}`,
      })
      toast({ title: 'Lead registrado como perda com justificativa' })
      setLostModalOpen(false)
      loadAll()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar perda', variant: 'destructive' })
    }
  }

  // Build timeline events
  const timelineItems: TimelineItem[] = []
  if (lead) {
    timelineItems.push({
      id: 'lead_create',
      type: 'creation',
      title: 'Lead Jurídico Captado',
      description: `Lead entrou via ${lead.origem || lead.source || 'Meta Ads'}${lead.campaign ? ` (Campanha: ${lead.campaign})` : ''}. Valor Potencial: R$ ${Number(lead.potential_value || lead.valor_potencial || 0).toLocaleString('pt-BR')}`,
      date: lead.created || '',
      badge: lead.temperature,
    })
  }

  messages.forEach((m) => {
    timelineItems.push({
      id: `msg_${m.id}`,
      type: m.type === 'sistema' ? 'task' : 'note',
      title:
        m.type === 'sistema'
          ? 'Transferência / Sistema'
          : `Mensagem (${getTeamBadge(m.team).label})`,
      description: m.content,
      date: m.created || '',
      author: m.expand?.author_id?.name || (m.type === 'sistema' ? 'Sistema' : 'Usuário'),
    })
  })

  notes.forEach((n) => {
    timelineItems.push({
      id: n.id,
      type: 'note',
      title: n.fixada ? '📌 Nota Fixada de Atendimento' : 'Nota Interna Registrada',
      description: n.conteudo,
      date: n.created || '',
      author: n.expand?.autor_id?.name || 'Advogado',
    })
  })

  tasks.forEach((t) => {
    timelineItems.push({
      id: t.id,
      type: 'task',
      title: `Tarefa: ${t.titulo}`,
      description: `Tipo: ${t.tipo} • Status: ${t.status} • Agendado para ${t.data || ''} ${t.horario || ''}`,
      date: t.created || '',
    })
  })

  opportunities.forEach((o) => {
    timelineItems.push({
      id: o.id,
      type: o.status === 'won' ? 'won' : o.status === 'lost' ? 'lost' : 'proposal',
      title: `Oportunidade: ${o.title}`,
      description: `Valor: R$ ${Number(o.value || 0).toLocaleString('pt-BR')} • Status: ${o.status} • Serviço: ${o.servico || 'Não informado'}`,
      date: o.created || '',
    })
  })

  // Sort timeline newest first
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-16 space-y-3">
        <h2 className="text-lg font-bold">Lead não encontrado</h2>
        <Button onClick={() => navigate('/leads')}>Voltar para Lista de Leads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate('/leads')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
                {lead.name}
              </h1>
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                <Flame className="h-3 w-3" /> {lead.temperature || 'Quente'}
              </Badge>
              <Badge variant="outline">{lead.status || 'Em Atendimento'}</Badge>
              {(() => {
                const currentTeam = lead.team_owner || lead.team || 'comercial'
                const tBadge = getTeamBadge(currentTeam)
                return (
                  <Badge variant="outline" className={`gap-1 font-medium ${tBadge.className}`}>
                    Equipe Responsável: {tBadge.label}
                  </Badge>
                )
              })()}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              <span>
                Origem: <strong>{lead.origem || lead.source || 'Meta Ads'}</strong>
              </span>
              <span>•</span>
              <span>
                Serviço: <strong>{lead.service || 'Recuperação Tributária'}</strong>
              </span>
              <span>•</span>
              <span>
                Valor Potencial:{' '}
                <strong>
                  R${' '}
                  {Number(lead.potential_value || lead.valor_potencial || 0).toLocaleString(
                    'pt-BR',
                  )}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setAiSheetOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" /> Assistente IA
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const cur = (lead.team_owner || lead.team || 'comercial') as TeamType
              // set default target to next team
              if (cur === 'comercial') setTargetTeam('juridico')
              else if (cur === 'juridico') setTargetTeam('financeiro')
              else setTargetTeam('comercial')
              setTransferModalOpen(true)
            }}
            className="h-9 gap-1.5 text-xs font-semibold border-primary/40 hover:bg-primary/5 text-primary"
          >
            <ArrowRightLeft className="h-4 w-4" /> Repassar Equipe
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNoteModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="h-4 w-4 text-blue-500" /> Nova Nota
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTaskModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Calendar className="h-4 w-4 text-amber-500" /> Nova Tarefa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOppModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <Target className="h-4 w-4 text-purple-500" /> Criar Oportunidade
          </Button>
          <Button
            size="sm"
            onClick={() => setWonModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" /> Marcar Ganho (Cliente)
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLostModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <XCircle className="h-4 w-4" /> Marcar Perda
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Details Card & Right 360 Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1-col: Lead Profile Details */}
        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">
              Dados do Contato Jurídico
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Telefone / WhatsApp:
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  {lead.whatsapp || lead.phone || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">E-mail Corporativo:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  {lead.email || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Empresa / Razão Social:
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-500" />
                  {lead.company || 'Pessoa Física / Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">CPF / CNPJ:</span>
                <span className="font-mono font-medium text-foreground">
                  {lead.cpf_cnpj || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Localização:</span>
                <span className="font-medium text-foreground">
                  {lead.city || 'São Paulo'} {lead.estado ? `- ${lead.estado}` : ''}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Equipe &amp; Responsável:
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-foreground">
                    {lead.expand?.assigned_to?.name ||
                      lead.expand?.responsavel_id?.name ||
                      'Equipe Geral'}
                  </span>
                  {(() => {
                    const curTeam = lead.team_owner || lead.team || 'comercial'
                    const tb = getTeamBadge(curTeam)
                    return (
                      <Badge variant="outline" className={`text-[10px] h-4.5 ${tb.className}`}>
                        {tb.label}
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Lead Score de Conversão:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${lead.score || 80}%` }}
                    />
                  </div>
                  <span className="font-bold text-emerald-600 text-xs">{lead.score || 80}/100</span>
                </div>
              </div>
            </div>

            {lead.observacoes && (
              <div className="pt-3 border-t">
                <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                  Observações Iniciais:
                </span>
                <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg whitespace-pre-line leading-relaxed">
                  {lead.observacoes}
                </p>
              </div>
            )}

            {/* SEÇÃO DE TAGS DO LEAD */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Tags &amp; Marcadores
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] gap-1 text-primary"
                    >
                      <Plus className="h-3 w-3" /> Gerenciar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="text-xs font-semibold mb-2 px-1">Atribuir Tags:</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableTags.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">
                          Nenhuma tag cadastrada no tenant.
                        </div>
                      ) : (
                        availableTags.map((tag) => {
                          const isAssigned = Array.isArray(lead.tags) && lead.tags.includes(tag.id)
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleToggleTag(tag.id)}
                              className="w-full flex items-center justify-between p-1.5 rounded hover:bg-muted text-xs transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: tag.cor || '#2563eb' }}
                                />
                                <span className="truncate">{tag.nome}</span>
                              </div>
                              {isAssigned && (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                {Array.isArray(lead.tags) && lead.tags.length > 0 ? (
                  lead.tags.map((tagId) => {
                    const tagObj = availableTags.find((t) => t.id === tagId)
                    const label = tagObj ? tagObj.nome : tagId
                    const color = tagObj?.cor || '#2563eb'
                    return (
                      <Badge
                        key={tagId}
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                          borderColor: `${color}40`,
                        }}
                        className="text-[10px] px-2 py-0.5 border flex items-center gap-1 font-medium group"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tagId)}
                          className="hover:opacity-75 ml-0.5"
                        >
                          ×
                        </button>
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Nenhuma tag atribuída a este lead.
                  </span>
                )}
              </div>
            </div>

            {/* SEÇÃO DE CAMPOS PERSONALIZADOS DO LEAD */}
            {customFields.length > 0 && (
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
                    Campos Personalizados
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveCustomFieldValues}
                    disabled={savingCustomFields}
                    className="h-6 px-2 text-[11px] text-primary"
                  >
                    {savingCustomFields ? 'Salvando...' : 'Salvar Campos'}
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {customFields.map((cf) => {
                    const fieldVal = customFieldValues[cf.id] ?? customFieldValues[cf.nome] ?? ''
                    const opts: string[] = Array.isArray(cf.opcoes)
                      ? cf.opcoes
                      : typeof cf.opcoes === 'object' &&
                          cf.opcoes !== null &&
                          'options' in cf.opcoes
                        ? (cf.opcoes as any).options || []
                        : []

                    return (
                      <div key={cf.id} className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                          <span>
                            {cf.nome} {cf.obrigatorio && <span className="text-red-500">*</span>}
                          </span>
                          <span className="text-[10px] capitalize opacity-60 font-mono">
                            ({cf.tipo})
                          </span>
                        </Label>

                        {cf.tipo === 'selecao' ? (
                          <Select
                            value={String(fieldVal || '')}
                            onValueChange={(val) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: val,
                                [cf.nome]: val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {opts.map((op, i) => (
                                <SelectItem key={i} value={op}>
                                  {op}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : cf.tipo === 'booleano' ? (
                          <div className="flex items-center gap-2 pt-0.5">
                            <Switch
                              checked={Boolean(fieldVal)}
                              onCheckedChange={(val) =>
                                setCustomFieldValues((prev) => ({
                                  ...prev,
                                  [cf.id]: val,
                                  [cf.nome]: val,
                                }))
                              }
                            />
                            <span className="text-xs">{fieldVal ? 'Sim' : 'Não'}</span>
                          </div>
                        ) : cf.tipo === 'data' ? (
                          <Input
                            type="date"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            className="h-8 text-xs font-mono"
                          />
                        ) : cf.tipo === 'numero' || cf.tipo === 'moeda' ? (
                          <Input
                            type="number"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            placeholder={cf.tipo === 'moeda' ? 'R$ 0,00' : '0'}
                            className="h-8 text-xs font-mono"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            placeholder={`Inserir ${cf.nome.toLowerCase()}...`}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tráfego & UTMs Card */}
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-blue-500" /> Rastreamento &amp; Tráfego
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Origem / Canal:</span>
                <span className="font-medium flex items-center gap-1">
                  {lead.origem === 'landing_page'
                    ? 'Landing Page'
                    : lead.channel || lead.source || 'Meta Ads'}
                  {lead.origem === 'landing_page' && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      Site
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Área Jurídica:</span>
                <span className="font-medium">
                  {lead.area || lead.service || 'Direito Tributário'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Campanha:</span>
                <span className="font-medium truncate max-w-[150px]">
                  {lead.campaign || lead.utm_campaign || 'Orgânico / Landing Page'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">UTM Source:</span>
                <span className="font-mono text-[11px]">{lead.utm_source || '—'}</span>
              </div>
              {lead.utm_medium && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">UTM Medium:</span>
                  <span className="font-mono text-[11px]">{lead.utm_medium}</span>
                </div>
              )}
              {lead.utm_campaign && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">UTM Campaign:</span>
                  <span className="font-mono text-[11px]">{lead.utm_campaign}</span>
                </div>
              )}
              {lead.utm_content && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">UTM Content:</span>
                  <span className="font-mono text-[11px]">{lead.utm_content}</span>
                </div>
              )}
              {lead.utm_term && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">UTM Term:</span>
                  <span className="font-mono text-[11px]">{lead.utm_term}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Data Captura:</span>
                <span className="font-mono text-[11px]">
                  {lead.created ? new Date(lead.created).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2-cols: 360 View Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4">
              <TabsTrigger
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat / Notas do Lead ({messages.length})
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Linha do Tempo 360º ({timelineItems.length})
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Tarefas &amp; Reuniões ({tasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="opportunities"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Oportunidades ({opportunities.length})
              </TabsTrigger>
              <TabsTrigger
                value="proposals"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Propostas &amp; Contratos ({proposals.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB CHAT / NOTAS DO LEAD */}
            <TabsContent value="chat" className="pt-4 space-y-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex flex-col min-h-[460px]">
                {/* Chat Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Thread de Comunicação e Notas do Lead
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Troca de mensagens entre equipes (Comercial, Jurídico e Financeiro) com
                      sincronização em tempo real.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cur = (lead.team_owner || lead.team || 'comercial') as TeamType
                        if (cur === 'comercial') setTargetTeam('juridico')
                        else if (cur === 'juridico') setTargetTeam('financeiro')
                        else setTargetTeam('comercial')
                        setTransferModalOpen(true)
                      }}
                      className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Repassar para outra equipe
                    </Button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 max-h-[480px] pr-1">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground space-y-2">
                      <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-muted-foreground/70" />
                      </div>
                      <p className="text-xs font-medium">
                        Nenhuma mensagem registrada neste lead ainda.
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 max-w-sm">
                        Seja o primeiro a adicionar uma nota de alinhamento ou repassar o lead entre
                        equipes.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.type === 'sistema'
                      const isCurrentUser =
                        (user?.id && msg.author_id === user.id) ||
                        (pb.authStore.record?.id && msg.author_id === pb.authStore.record.id)
                      const teamInfo = getTeamBadge(msg.team)
                      const authorName =
                        msg.expand?.author_id?.name || (isSystem ? 'Sistema' : 'Membro da Equipe')

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3 text-center">
                            <div className="bg-muted/70 text-foreground/85 border border-border/60 text-xs px-4 py-2 rounded-xl max-w-lg shadow-2xs">
                              <p className="font-medium leading-relaxed">{msg.content}</p>
                              <span className="text-[10px] text-muted-foreground block mt-1">
                                {formatMessageDate(msg.created)}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${
                            isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Avatar className="h-8 w-8 shrink-0 mt-0.5 border">
                            <AvatarFallback
                              className={`text-[11px] font-bold ${
                                msg.team === 'comercial'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : msg.team === 'juridico'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {authorName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div
                            className={`max-w-[78%] rounded-2xl p-3.5 space-y-1.5 shadow-2xs border ${
                              isCurrentUser
                                ? 'bg-primary/10 border-primary/20 text-foreground rounded-tr-xs'
                                : 'bg-card border-border/80 text-foreground rounded-tl-xs'
                            }`}
                          >
                            {/* Message Bubble Header */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-foreground">
                                {authorName}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 font-medium border ${teamInfo.className}`}
                              >
                                {teamInfo.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {formatMessageDate(msg.created)}
                              </span>
                            </div>

                            {/* Message Content */}
                            <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/90">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="pt-3 border-t border-border/60 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 min-w-[190px]">
                      <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Enviar como:
                      </Label>
                      <Select
                        value={selectedTeam}
                        onValueChange={(val: TeamType) => setSelectedTeam(val)}
                      >
                        <SelectTrigger className="h-8 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comercial">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                              Comercial
                            </span>
                          </SelectItem>
                          <SelectItem value="juridico">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Jurídico
                            </span>
                          </SelectItem>
                          <SelectItem value="financeiro">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              Financeiro
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                          >
                            <MessageSquareText className="h-3.5 w-3.5" />
                            Templates ({activeMessageTemplates.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2 shadow-lg" align="end">
                          <div className="text-xs font-bold pb-2 mb-1 border-b flex items-center justify-between">
                            <span>Modelos de Mensagem</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              Clique para aplicar
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {activeMessageTemplates.length === 0 ? (
                              <div className="p-3 text-xs text-center text-muted-foreground">
                                Nenhum template ativo cadastrado em Configurações.
                              </div>
                            ) : (
                              activeMessageTemplates.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleApplyTemplate(t.conteudo)}
                                  className="w-full text-left p-2 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-colors space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs text-foreground truncate">
                                      {t.nome}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] uppercase px-1 py-0 h-4"
                                    >
                                      {t.tipo || 'outro'}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                    {t.conteudo}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="text-[11px] text-muted-foreground hidden sm:block">
                        Pressione <strong>Enter</strong> para enviar
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <Textarea
                      required
                      rows={2}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (messageContent.trim()) {
                            handleSendMessage(e)
                          }
                        }
                      }}
                      placeholder="Escreva uma nota interna ou mensagem para as equipes..."
                      className="text-xs resize-none min-h-[60px]"
                    />
                    <Button
                      type="submit"
                      disabled={sendingMessage || !messageContent.trim()}
                      className="h-10 px-4 bg-primary text-primary-foreground gap-1.5 shrink-0 text-xs font-semibold"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendingMessage ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* TAB TIMELINE */}
            <TabsContent value="timeline" className="pt-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
                <TimelineView items={timelineItems} />
              </div>
            </TabsContent>

            {/* TAB TASKS */}
            <TabsContent value="tasks" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Tarefas e Compromissos</h4>
                <Button
                  size="sm"
                  onClick={() => setTaskModalOpen(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Agendar Tarefa
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma tarefa agendada para este lead.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-2">
                          {task.titulo}
                          <Badge variant="outline" className="text-[10px] h-4">
                            {task.tipo}
                          </Badge>
                          <Badge
                            className={`text-[10px] h-4 ${
                              task.prioridade === 'urgente'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {task.prioridade}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Data:{' '}
                          <strong>
                            {task.data || 'Hoje'} às {task.horario || '14:00'}
                          </strong>{' '}
                          • Status: {task.status}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await CrmService.updateTask(task.id, {
                            status: task.status === 'concluida' ? 'pendente' : 'concluida',
                            data_conclusao:
                              task.status === 'concluida' ? undefined : new Date().toISOString(),
                          })
                          toast({ title: 'Status da tarefa atualizado' })
                          loadAll()
                        }}
                        className="h-8 text-xs"
                      >
                        {task.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB OPPORTUNITIES */}
            <TabsContent value="opportunities" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Oportunidades de Negócio</h4>
                <Button
                  size="sm"
                  onClick={() => setOppModalOpen(true)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova Oportunidade
                </Button>
              </div>

              <div className="space-y-3">
                {opportunities.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma oportunidade criada para este lead.
                  </div>
                ) : (
                  opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/oportunidades/${opp.id}`)}
                    >
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {opp.title}
                          <Badge variant="outline">{opp.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Serviço: <strong>{opp.servico || 'Não definido'}</strong> • Probabilidade:{' '}
                          {opp.probabilidade || 50}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Ver detalhes →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB PROPOSALS */}
            <TabsContent value="proposals" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold">Propostas e Minutas de Honorários</h4>
                <Button
                  size="sm"
                  onClick={() => navigate(`/propostas?lead_id=${id}`)}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Gerar Proposta
                </Button>
              </div>

              <div className="space-y-3">
                {proposals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                    Nenhuma proposta enviada ainda.
                  </div>
                ) : (
                  proposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {prop.titulo}
                          <Badge variant="outline">{prop.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Validade até{' '}
                          {prop.validade
                            ? new Date(prop.validade).toLocaleDateString('pt-BR')
                            : '30 dias'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          R$ {Number(prop.valor_total || prop.valor || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* TRANSFER TEAM MODAL */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Repassar Lead para Outra Equipe
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferTeam} className="space-y-4 pt-2">
            <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1.5 border border-border/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead:</span>
                <span className="font-semibold text-foreground">{lead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipe atual:</span>
                {(() => {
                  const currentTeam = lead.team_owner || lead.team || 'comercial'
                  const tb = getTeamBadge(currentTeam)
                  return (
                    <Badge variant="outline" className={`text-[10px] h-4.5 ${tb.className}`}>
                      {tb.label}
                    </Badge>
                  )
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Selecione a Equipe Destino *</Label>
              <Select value={targetTeam} onValueChange={(val: TeamType) => setTargetTeam(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      Comercial (Prospecção, Atendimento Inicial e Propostas)
                    </span>
                  </SelectItem>
                  <SelectItem value="juridico">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Jurídico (Análise Técnica, Pareceres e Contratos)
                    </span>
                  </SelectItem>
                  <SelectItem value="financeiro">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      Financeiro (Faturamento, Cobrança e Comissões)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ao confirmar, o responsável de equipe do lead será atualizado e uma mensagem de
                sistema será registrada automaticamente no chat para notificar os membros.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={transferring}
                className="bg-[#0A1F3F] text-white"
              >
                {transferring ? 'Transferindo...' : 'Confirmar Transferência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE NOTE MODAL */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Nova Nota Interna de Atendimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Conteúdo da Nota / Parecer *</Label>
              <Textarea
                required
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ex: Cliente tem interesse no protocolo imediato do Mandado de Segurança..."
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-note"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
                className="rounded text-primary"
              />
              <Label htmlFor="pin-note" className="text-xs cursor-pointer">
                Fixar nota no topo do histórico
              </Label>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Nota
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE TASK MODAL */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Agendar Tarefa / Reunião
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Compromisso *</Label>
              <Input
                required
                value={taskData.titulo}
                onChange={(e) => setTaskData({ ...taskData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={taskData.tipo}
                  onValueChange={(val: any) => setTaskData({ ...taskData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reuniao">Reunião / Demo</SelectItem>
                    <SelectItem value="whatsapp">Mensagem WhatsApp</SelectItem>
                    <SelectItem value="ligacao">Ligação Telefônica</SelectItem>
                    <SelectItem value="proposta">Enviar Proposta</SelectItem>
                    <SelectItem value="acompanhamento">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select
                  value={taskData.prioridade}
                  onValueChange={(val: any) => setTaskData({ ...taskData, prioridade: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">🚨 Urgente</SelectItem>
                    <SelectItem value="alta">⚡ Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={taskData.data}
                  onChange={(e) => setTaskData({ ...taskData, data: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horário</Label>
                <Input
                  type="time"
                  value={taskData.horario}
                  onChange={(e) => setTaskData({ ...taskData, horario: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTaskModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Agendar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE OPPORTUNITY MODAL */}
      <Dialog open={oppModalOpen} onOpenChange={setOppModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Criar Oportunidade no Funil Kanban
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOpportunity} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título da Oportunidade *</Label>
              <Input
                required
                value={oppData.title}
                onChange={(e) => setOppData({ ...oppData, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
              <Input
                type="number"
                value={oppData.value}
                onChange={(e) => setOppData({ ...oppData, value: Number(e.target.value) })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço Jurídico</Label>
              <Input
                value={oppData.servico}
                onChange={(e) => setOppData({ ...oppData, servico: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOppModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Criar Oportunidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MARK WON MODAL */}
      <Dialog open={wonModalOpen} onOpenChange={setWonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-600 font-legal-serif flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Converter Lead em Cliente Ganho
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkWon} className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Esta ação converterá o lead em um <strong>Cliente Ativo</strong> com histórico
              permanente e disparará o evento de conversão Purchase para o Meta Ads.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Valor Total do Contrato Fechado (R$) *
              </Label>
              <Input
                required
                type="number"
                value={wonData.value}
                onChange={(e) => setWonData({ ...wonData, value: Number(e.target.value) })}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço Jurídico Contratado</Label>
              <Input
                value={wonData.servico}
                onChange={(e) => setWonData({ ...wonData, servico: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações do Fechamento</Label>
              <Textarea
                rows={3}
                value={wonData.observacoes}
                onChange={(e) => setWonData({ ...wonData, observacoes: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWonModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar Contratação (Ganho)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MARK LOST MODAL */}
      <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 font-legal-serif flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Registrar Motivo de Perda
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkLost} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo Principal da Perda *</Label>
              <Select
                value={lostData.loss_reason}
                onValueChange={(val) => setLostData({ ...lostData, loss_reason: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preço">Preço / Honorários Elevados</SelectItem>
                  <SelectItem value="sem_interesse">Sem Interesse no Momento</SelectItem>
                  <SelectItem value="sem_retorno">Não Respondeu / Sem Contato</SelectItem>
                  <SelectItem value="concorrente">Fechou com Concorrente</SelectItem>
                  <SelectItem value="sem_viabilidade">Caso Sem Viabilidade Jurídica</SelectItem>
                  <SelectItem value="desistencia">Desistência do Cliente</SelectItem>
                  <SelectItem value="outro">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Detalhadas</Label>
              <Textarea
                rows={3}
                value={lostData.observacoes}
                onChange={(e) => setLostData({ ...lostData, observacoes: e.target.value })}
                placeholder="Explique o feedback recebido para enriquecer os relatórios de inteligência comercial..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLostModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" variant="destructive">
                Salvar Perda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI ASSISTANT SHEET (SLIDE OVER) */}
      <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background">
          {/* Sheet Header */}
          <div className="p-5 border-b bg-gradient-to-r from-[#0A1F3F] to-[#152e59] text-white space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold font-legal-serif text-white">
                    Assistente IA Jurídico
                  </SheetTitle>
                  <SheetDescription className="text-[11px] text-slate-300">
                    Contextualizado com a Base de Conhecimento e o Lead
                  </SheetDescription>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                {lead.name}
              </Badge>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="px-5 py-2.5 bg-muted/40 border-b text-[11px] flex items-center justify-between gap-2 text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span>
                Serviço: <strong className="text-foreground">{lead.service || 'Geral'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>
                Equipe:{' '}
                <strong className="text-foreground">
                  {getTeamBadge(lead.team_owner || lead.team || 'comercial').label}
                </strong>
              </span>
            </div>
            <Link
              to="/base-conhecimento"
              className="text-primary hover:underline font-medium flex items-center gap-1"
            >
              Ver Base de Conhecimento →
            </Link>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {aiChatHistory.map((item) => {
              const isAi = item.role === 'assistant'
              const isWelcome = item.id === 'welcome'

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAi
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs ${
                      isAi
                        ? 'bg-card border border-border text-foreground rounded-tl-xs'
                        : 'bg-primary/10 border border-primary/20 text-foreground rounded-tr-xs font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[11px] text-muted-foreground">
                        {isAi ? 'Assistente IA' : 'Você'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="whitespace-pre-line leading-relaxed text-foreground/90">
                      {item.content}
                    </div>

                    {/* Button to save response as note in lead_messages */}
                    {isAi && !isWelcome && (
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={savingNoteId === item.id}
                          onClick={() => handleSaveAiAsNote(item.content, item.id)}
                          className="h-7 px-2.5 text-[11px] gap-1.5 hover:bg-primary/10 text-primary border-primary/30"
                        >
                          <FileText className="h-3 w-3" />
                          {savingNoteId === item.id ? 'Salvando...' : 'Salvar como nota na thread'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Loading Indicator */}
            {aiLoading && (
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-xs p-3.5 text-xs text-muted-foreground flex items-center gap-2 shadow-2xs">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Consultando Base de Conhecimento e histórico do lead...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {aiError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs space-y-1">
                <strong>Falha na resposta:</strong>
                <p>{aiError}</p>
              </div>
            )}

            <div ref={aiChatBottomRef} />
          </div>

          {/* Prompt Suggestion Chips */}
          <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-1.5 overflow-x-auto text-[11px] custom-scrollbar">
            <span className="text-muted-foreground whitespace-nowrap text-[10px] font-bold uppercase">
              Sugestões:
            </span>
            <button
              type="button"
              onClick={() =>
                setAiPrompt(
                  'Quais as teses jurídicas e documentos necessários para qualificar este lead?',
                )
              }
              className="px-2 py-1 rounded-md bg-background border hover:border-primary text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              Teses e Documentos
            </button>
            <button
              type="button"
              onClick={() =>
                setAiPrompt(
                  'Qual faixa de honorários e alçada de desconto recomendada pela base de conhecimento?',
                )
              }
              className="px-2 py-1 rounded-md bg-background border hover:border-primary text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              Honorários e Descontos
            </button>
            <button
              type="button"
              onClick={() =>
                setAiPrompt(
                  'Redija uma mensagem executiva de follow-up para WhatsApp com base na conversa anterior.',
                )
              }
              className="px-2 py-1 rounded-md bg-background border hover:border-primary text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              Script de Follow-up
            </button>
          </div>

          {/* Sheet Footer Input */}
          <form onSubmit={handleSendAiPrompt} className="p-4 border-t bg-card space-y-2">
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={aiPrompt}
                disabled={aiLoading}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (aiPrompt.trim() && !aiLoading) {
                      handleSendAiPrompt(e)
                    }
                  }
                }}
                placeholder="Pergunte sobre teses, alçadas de honorários, ou peça uma minuta..."
                className="text-xs resize-none min-h-[60px]"
              />
              <Button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="h-10 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shrink-0 text-xs font-semibold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {aiLoading ? 'Pensando...' : 'Enviar'}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground text-center">
              A IA responde com base na <strong>Base de Conhecimento</strong> do escritório e nas{' '}
              <strong>últimas 20 mensagens</strong> do lead.
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
export default LeadDetailPage
