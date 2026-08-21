import pb from '@/lib/pocketbase/client'

export interface TenantRecord {
  id: string
  name: string
  slug: string
  logo?: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'inactive' | 'suspended'
  meta_pixel_id?: string
  settings?: {
    currency?: string
    language?: string
    theme?: string
    primaryColor?: string
    timezone?: string
    meta_pixel_id?: string
    meta_pixel_active?: boolean
    lgpd_consent_required?: boolean
    oab_registro?: string
    endereco_completo?: string
    telefone_contato?: string
    email_contato?: string
    [key: string]: unknown
  }
  created?: string
  updated?: string
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user'
  role_id?: string
  tenant_id: string
  team?: 'comercial' | 'juridico' | 'financeiro' | string
  status?: 'active' | 'inactive' | 'invited'
  active?: boolean
  avatar?: string
  settings?: Record<string, unknown>
  last_login?: string
  created?: string
  updated?: string
}

export interface EmpresaRecord {
  id: string
  tenant_id: string
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  segmento?: string
  porte?: string
  endereco?: string
  cidade?: string
  estado?: string
  site?: string
  telefone?: string
  observacoes?: string
  created?: string
  updated?: string
}

export interface PessoaRecord {
  id: string
  tenant_id: string
  nome: string
  email?: string
  telefone?: string
  whatsapp?: string
  cpf?: string
  cargo?: string
  empresa_id?: string
  tags?: string[]
  observacoes?: string
  expand?: {
    empresa_id?: EmpresaRecord
  }
  created?: string
  updated?: string
}

export interface LeadRecord {
  id: string
  tenant_id: string
  name: string
  phone?: string
  whatsapp?: string
  email?: string
  company?: string
  position?: string
  city?: string
  estado?: string
  country?: string
  cpf_cnpj?: string
  pessoa_fisica_juridica?: 'PF' | 'PJ'
  empresa_id?: string
  source?: string
  origem?: string
  channel?: string
  campaign?: string
  ad_set?: string
  conjunto?: string
  ad?: string
  anuncio?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  product?: string
  service?: string
  area?: string
  assigned_to?: string
  responsavel_id?: string
  team?: string
  team_owner?: 'comercial' | 'juridico' | 'financeiro' | string
  score?: number
  temperature?: 'hot' | 'warm' | 'cold' | 'frio' | 'morno' | 'quente' | 'muito_quente'
  status?: string
  entry_date?: string
  last_contact?: string
  next_activity?: string
  proxima_acao?: string
  potential_value?: number
  valor_potencial?: number
  tags?: string[]
  observacoes?: string
  landing_page?: string
  url_origem?: string
  soft_delete?: boolean
  deleted?: string
  expand?: {
    assigned_to?: UserRecord
    responsavel_id?: UserRecord
    empresa_id?: EmpresaRecord
  }
  created?: string
  updated?: string
}

export interface CustomerRecord {
  id: string
  tenant_id: string
  lead_id?: string
  lead_origem_id?: string
  pessoa_id?: string
  empresa_id?: string
  name: string
  phone?: string
  email?: string
  company?: string
  document?: string
  address?: string
  city?: string
  state?: string
  country?: string
  source?: string
  status?: string
  active?: boolean
  lifetime_value?: number
  valor_total_contratado?: number
  servicos_contratados?: string[]
  tags?: string[]
  observacoes?: string
  responsavel_id?: string
  data_conversao?: string
  deleted?: string
  expand?: {
    lead_id?: LeadRecord
    lead_origem_id?: LeadRecord
    pessoa_id?: PessoaRecord
    empresa_id?: EmpresaRecord
    responsavel_id?: UserRecord
  }
  created?: string
  updated?: string
}

export interface PipelineRecord {
  id: string
  tenant_id: string
  name: string
  description?: string
  is_default?: boolean
  order?: number
  created?: string
  updated?: string
}

export interface PipelineStageRecord {
  id: string
  pipeline_id: string
  name: string
  order: number
  probability: number
  color?: string
  created?: string
  updated?: string
}

export interface OpportunityRecord {
  id: string
  tenant_id: string
  title: string
  value?: number
  currency?: string
  status?: 'open' | 'won' | 'lost' | 'archived' | 'aberta' | 'ganha' | 'perdida' | 'desqualificada'
  lead_id?: string
  customer_id?: string
  cliente_id?: string
  pipeline_id?: string
  funil_id?: string
  stage_id?: string
  etapa_id?: string
  assigned_to?: string
  responsavel_id?: string
  servico?: string
  area?: string
  probabilidade?: number
  origem?: string
  campanha?: string
  conjunto?: string
  anuncio?: string
  prazo?: string
  previsao_fechamento?: string
  data_ganho?: string
  data_perda?: string
  loss_reason?: string
  motivo_perda?: string
  observacoes?: string
  soft_delete?: boolean
  closed_at?: string
  deleted?: string
  expand?: {
    lead_id?: LeadRecord
    customer_id?: CustomerRecord
    cliente_id?: CustomerRecord
    assigned_to?: UserRecord
    responsavel_id?: UserRecord
    pipeline_id?: PipelineRecord
    stage_id?: PipelineStageRecord
    etapa_id?: PipelineStageRecord
  }
  created?: string
  updated?: string
}

export interface TaskRecord {
  id: string
  tenant_id: string
  titulo: string
  descricao?: string
  tipo:
    | 'ligacao'
    | 'whatsapp'
    | 'email'
    | 'reuniao'
    | 'retorno'
    | 'proposta'
    | 'documento'
    | 'acompanhamento'
    | 'outro'
  responsavel_id?: string
  lead_id?: string
  oportunidade_id?: string
  cliente_id?: string
  data?: string
  horario?: string
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  recorrencia?: string
  data_conclusao?: string
  expand?: {
    responsavel_id?: UserRecord
    lead_id?: LeadRecord
    oportunidade_id?: OpportunityRecord
    cliente_id?: CustomerRecord
  }
  created?: string
  updated?: string
}

export interface NoteRecord {
  id: string
  tenant_id: string
  conteudo: string
  autor_id?: string
  lead_id?: string
  oportunidade_id?: string
  cliente_id?: string
  conversa_id?: string
  fixada?: boolean
  categoria?: string
  expand?: {
    autor_id?: UserRecord
  }
  created?: string
  updated?: string
}

export interface LeadMessageRecord {
  id: string
  tenant_id: string
  lead_id: string
  author_id: string
  team: 'comercial' | 'juridico' | 'financeiro'
  type: 'nota' | 'sistema'
  content: string
  expand?: {
    author_id?: UserRecord
    lead_id?: LeadRecord
  }
  created?: string
  updated?: string
}

export interface ServiceRecord {
  id: string
  tenant_id: string
  nome: string
  descricao?: string
  categoria?: string
  area:
    | 'Direito Tributário'
    | 'Direito Bancário'
    | 'Direito Trabalhista'
    | 'Direito do Consumidor'
    | 'Outro'
    | string
  valor_padrao?: number
  status: 'ativo' | 'inativo' | string
  created?: string
  updated?: string
}

export interface ProposalRecord {
  id: string
  tenant_id: string
  titulo: string
  lead_id?: string
  cliente_id?: string
  oportunidade_id?: string
  responsavel_id?: string
  template_id?: string
  valor?: number
  desconto?: number
  valor_total?: number
  validade?: string
  servicos?: Array<{ nome: string; valor: number; descricao?: string }> | string[]
  condicoes?: string
  descricao?: string
  observacoes?: string
  status: 'rascunho' | 'enviada' | 'visualizada' | 'aceita' | 'recusada' | 'expirada' | string
  data_envio?: string
  data_visualizacao?: string
  data_aceite?: string
  data_recusa?: string
  expand?: {
    lead_id?: LeadRecord
    cliente_id?: CustomerRecord
    oportunidade_id?: OpportunityRecord
    responsavel_id?: UserRecord
    template_id?: TemplateRecord
  }
  created?: string
  updated?: string
}

export interface ContractSignEvent {
  event?: string
  event_type?: string
  provider?: string
  doc_id?: string
  sign_link?: string
  status?: string
  sign_status?: string
  created_at?: string
  received_at?: string
  date?: string
  payload?: any
  [key: string]: unknown
}

export interface ContractRecord {
  id: string
  tenant_id: string
  proposta_id?: string
  cliente_id?: string
  oportunidade_id?: string
  titulo: string
  valor?: number
  status?: 'aguardando' | 'enviado' | 'visualizado' | 'assinado' | 'recusado' | 'expirado' | string
  plataforma?: 'zapsign' | 'clicksign' | 'manual' | string
  documento_url?: string
  sign_url?: string
  external_id?: string
  external_provider?: 'zapsign' | 'clicksign' | string
  zapsign_doc_id?: string
  external_status?: string
  sent_at?: string
  signed_at?: string
  signing_link?: string
  sign_provider?: string
  sign_document_id?: string
  sign_link?: string
  sign_status?: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired'
  sign_events?: ContractSignEvent[]
  data_envio?: string
  data_visualizacao?: string
  data_assinatura?: string
  data_recusa?: string
  historico?: Array<{
    data?: string
    date?: string
    evento?: string
    action?: string
    usuario?: string
    doc_id?: string
    status?: string
  }>
  expand?: {
    proposta_id?: ProposalRecord
    cliente_id?: CustomerRecord
    oportunidade_id?: OpportunityRecord
  }
  created?: string
  updated?: string
}

export interface IntegrationConfigRecord {
  id: string
  tenant_id: string
  provider: 'zapsign' | 'clicksign' | 'whatsapp' | 'meta_ads' | 'google_ads' | 'calendly'
  status: 'active' | 'inactive' | 'error'
  api_token?: string
  webhook_secret?: string
  is_active?: boolean
  config?: Record<string, unknown>
  config_json?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface CampaignRecord {
  id: string
  tenant_id: string
  nome: string
  plataforma:
    | 'meta_ads'
    | 'google_ads'
    | 'tiktok_ads'
    | 'linkedin_ads'
    | 'youtube'
    | 'email'
    | 'organico'
    | 'outro'
    | string
  orcamento?: number
  investimento?: number
  data_inicio?: string
  data_fim?: string
  objetivo?: string
  responsavel_id?: string
  status: 'ativa' | 'pausada' | 'encerrada' | 'rascunho' | string
  metricas?: {
    impressoes?: number
    cliques?: number
    ctr?: number
    cpc?: number
    leads?: number
    oportunidades?: number
    contratos?: number
    receita?: number
    roas?: number
    [key: string]: unknown
  }
  expand?: {
    responsavel_id?: UserRecord
  }
  created?: string
  updated?: string
}

export interface GoalRecord {
  id: string
  tenant_id: string
  titulo: string
  tipo: 'contratos' | 'valor' | 'leads' | 'conversao' | 'receita' | string
  valor_alvo: number
  valor_atual: number
  usuario_id?: string
  equipe?: string
  periodo_inicio?: string
  periodo_fim?: string
  status?: 'em_andamento' | 'atingida' | 'cancelada' | string
  expand?: {
    usuario_id?: UserRecord
  }
  created?: string
  updated?: string
}

export interface CommissionRecord {
  id: string
  tenant_id: string
  usuario_id: string
  contrato_id?: string
  oportunidade_id?: string
  tipo: 'percentual' | 'valor_fixo' | 'faixa' | string
  valor?: number
  percentual?: number
  status: 'pendente' | 'paga' | 'cancelada' | string
  data_geracao?: string
  data_pagamento?: string
  expand?: {
    usuario_id?: UserRecord
    contrato_id?: ContractRecord
    oportunidade_id?: OpportunityRecord
  }
  created?: string
  updated?: string
}

export interface TagRecord {
  id: string
  tenant_id: string
  nome: string
  cor?: string
  modulo?: 'leads' | 'pessoas' | 'empresas' | 'oportunidades' | 'clientes' | 'tarefas' | string
  created?: string
  updated?: string
}

export interface CustomFieldRecord {
  id: string
  tenant_id: string
  modulo: 'lead' | 'customer' | 'opportunity' | string
  nome: string
  tipo: 'texto' | 'numero' | 'moeda' | 'data' | 'selecao' | 'booleano' | string
  opcoes?: string[] | { options?: string[] } | Record<string, unknown>
  obrigatorio?: boolean
  ordem?: number
  created?: string
  updated?: string
}

export interface MessageTemplateRecord {
  id: string
  tenant_id: string
  nome: string
  canal?: string
  conteudo: string
  tipo?: 'abordagem' | 'follow-up' | 'proposta' | 'objeção' | 'pós-venda' | 'outro' | string
  variaveis?: Record<string, unknown>
  status?: 'ativo' | 'inativo' | string
  created?: string
  updated?: string
}

export interface TemplateRecord {
  id: string
  tenant_id: string
  nome: string
  tipo: 'mensagem' | 'email' | 'proposta' | 'contrato' | 'follow_up' | string
  conteudo: string
  variaveis?: Record<string, string>
  modulo?: string
  created?: string
  updated?: string
}

export interface AutomationRecord {
  id: string
  tenant_id: string
  nome: string
  gatilho: string
  condicoes?: Record<string, unknown>
  acoes?: Array<Record<string, unknown>>
  ativo: boolean
  execucoes?: number
  ultima_execucao?: string
  created?: string
  updated?: string
}

export interface AuditLogRecord {
  id: string
  tenant_id: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  expand?: {
    user_id?: UserRecord
  }
  created?: string
}

export interface SlaConfigRecord {
  id: string
  tenant_id: string
  equipe?: string
  origem?: string
  prioridade?: string
  tempo_resposta_minutos?: number
  first_response_minutes?: number
  horario_inicio?: string
  horario_fim?: string
  dias_semana?: string[]
  ativo?: boolean
  is_active?: boolean
  created?: string
  updated?: string
}

export interface LeadDistributionRecord {
  id: string
  tenant_id: string
  metodo?: string
  distribution_method?: string
  equipe_id?: string
  regras?: Record<string, unknown>
  ativo?: boolean
  is_active?: boolean
  lead_id?: string
  user_id?: string
  expand?: {
    lead_id?: LeadRecord
    user_id?: UserRecord
  }
  created?: string
  updated?: string
}

export interface ConversionEventRecord {
  id: string
  tenant_id: string
  lead_id?: string
  oportunidade_id?: string
  cliente_id?: string
  tipo: string
  plataforma?: string
  status: 'pendente' | 'enviando' | 'enviado' | 'confirmado' | 'erro' | 'retry' | string
  event_id?: string
  payload?: Record<string, unknown>
  tentativas?: number
  data_envio?: string
  resposta?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface IntegrationRecord {
  id: string
  tenant_id: string
  type:
    | 'whatsapp'
    | 'instagram'
    | 'facebook'
    | 'meta_ads'
    | 'google_ads'
    | 'tiktok'
    | 'zapsign'
    | 'clicksign'
    | 'calendly'
    | 'email'
    | 'custom_webhook'
  name: string
  config: {
    pixel_id?: string
    auto_sync_events?: boolean
    account_id?: string
    access_token?: string
    api_key?: string
    webhook_secret?: string
    [key: string]: unknown
  }
  status: 'connected' | 'disconnected' | 'error'
  created?: string
  updated?: string
}

export interface KnowledgeBaseRecord {
  id: string
  tenant_id: string
  content: string
  updated_by?: string
  expand?: {
    updated_by?: UserRecord
  }
  created?: string
  updated?: string
}
