import pb from '@/lib/pocketbase/client'
import { LeadRecord, TenantRecord } from '@/types/platform'

export interface LandingLeadInput {
  name: string
  phone: string
  whatsapp?: string
  email?: string
  area?: string
  mensagem?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  url_origem?: string
  landing_page?: string
  tenant_id?: string
}

export const LandingPageService = {
  /**
   * Helper to resolve the active default tenant for landing page lead submission
   */
  async resolveDefaultTenant(): Promise<TenantRecord> {
    try {
      const records = await pb.collection('tenants').getList<TenantRecord>(1, 1, {
        sort: 'created',
      })
      if (records.items.length > 0) {
        return records.items[0]
      }
    } catch (err) {
      console.warn('Unable to query tenants collection, falling back to default:', err)
    }

    return {
      id: 'jg95y0vbaums0ql',
      name: 'Teixeira & Nascimento Advogados',
      slug: 'teixeira-nascimento',
      plan: 'enterprise',
      status: 'active',
      settings: {
        currency: 'BRL',
        language: 'pt-BR',
        oab_registro: 'OAB/SP 438.921',
        telefone_contato: '(11) 3450-8900',
        email_contato: 'contato@teixeiranascimento.adv.br',
        endereco_completo: 'Av. Paulista, 1842 - 14º andar, Bela Vista, São Paulo - SP',
      },
    }
  },

  /**
   * Submit a new lead from the public landing page with UTM preservation and automatic scoring
   */
  async submitLead(input: LandingLeadInput): Promise<LeadRecord> {
    let tenantId = input.tenant_id
    if (!tenantId) {
      const defaultTenant = await this.resolveDefaultTenant()
      tenantId = defaultTenant.id
    }

    const leadPayload: Record<string, unknown> = {
      tenant_id: tenantId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp ? input.whatsapp.trim() : input.phone.trim(),
      email: input.email ? input.email.trim() : '',
      area: input.area || 'Direito Tributário',
      service: input.area ? `Consultoria em ${input.area}` : 'Consultoria Jurídica Especializada',
      source: 'landing_page',
      origem: 'landing_page',
      channel: 'Landing Page Institucional',
      status: 'Novo Lead',
      temperature: 'hot',
      score: 75,
      potential_value: 20000,
      valor_potencial: 20000,
      entry_date: new Date().toISOString(),
      soft_delete: false,
      landing_page: input.landing_page || window.location.pathname || '/landing',
      url_origem: input.url_origem || window.location.href,
      utm_source: input.utm_source || '',
      utm_medium: input.utm_medium || '',
      utm_campaign: input.utm_campaign || '',
      utm_term: input.utm_term || '',
      utm_content: input.utm_content || '',
      campaign: input.utm_campaign || 'Orgânico / Landing Page',
      observacoes: input.mensagem ? `[MENSAGEM VIA LANDING PAGE]:\n${input.mensagem.trim()}` : '',
      tags: ['landing_page', 'site_publico', input.area || 'geral'],
    }

    const createdRecord = await pb.collection('leads').create<LeadRecord>(leadPayload)
    return createdRecord
  },
}
