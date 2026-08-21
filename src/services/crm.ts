import pb from '@/lib/pocketbase/client'
import {
  LeadRecord,
  OpportunityRecord,
  CustomerRecord,
  PessoaRecord,
  EmpresaRecord,
  TaskRecord,
  NoteRecord,
  LeadMessageRecord,
  ProposalRecord,
  ContractRecord,
  CampaignRecord,
  GoalRecord,
  CommissionRecord,
  ServiceRecord,
  TagRecord,
  TemplateRecord,
  AutomationRecord,
  AuditLogRecord,
  SlaConfigRecord,
  ConversionEventRecord,
  PipelineRecord,
  PipelineStageRecord,
  UserRecord,
} from '@/types/platform'

export const CrmService = {
  // --- AUDIT LOG ---
  async logAudit(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValue?: any,
    newValue?: any,
  ) {
    try {
      const user = pb.authStore.record
      await pb.collection('audit_logs').create<AuditLogRecord>({
        tenant_id: tenantId,
        user_id: user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_value: oldValue,
        new_value: newValue,
        user_agent: navigator.userAgent,
      })
    } catch (e) {
      console.warn('Audit log failed', e)
    }
  },

  // --- USERS ---
  async getUsers(tenantId: string): Promise<UserRecord[]> {
    try {
      const list = await pb.collection('users').getFullList<UserRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'name',
      })
      return list
    } catch (e) {
      console.warn('Failed to get users', e)
      return []
    }
  },

  // --- LEADS ---
  async getLeads(tenantId: string, filterStr?: string): Promise<LeadRecord[]> {
    try {
      let filter = `tenant_id = "${tenantId}" && (soft_delete = false || soft_delete = null)`
      if (filterStr) filter += ` && (${filterStr})`
      const list = await pb.collection('leads').getFullList<LeadRecord>({
        filter,
        sort: '-created',
        expand: 'assigned_to,responsavel_id,empresa_id',
      })
      return list
    } catch (e) {
      console.warn('Failed to load leads', e)
      return []
    }
  },

  async getLeadById(id: string): Promise<LeadRecord | null> {
    try {
      return await pb.collection('leads').getOne<LeadRecord>(id, {
        expand: 'assigned_to,responsavel_id,empresa_id',
      })
    } catch (e) {
      console.warn('Failed to get lead by id', e)
      return null
    }
  },

  async createLead(tenantId: string, data: Partial<LeadRecord>): Promise<LeadRecord> {
    // Score calculation
    let calculatedScore = data.score || 50
    if (data.source === 'Meta Ads' || data.origem === 'Meta Ads') calculatedScore += 15
    if (data.source === 'Indicação' || data.origem === 'Indicação') calculatedScore += 25
    if (data.temperature === 'hot' || data.temperature === 'muito_quente') calculatedScore += 20

    const record = await pb.collection('leads').create<LeadRecord>({
      tenant_id: tenantId,
      name: data.name || 'Novo Lead',
      score: calculatedScore,
      temperature: data.temperature || 'warm',
      status: data.status || 'Novo Lead',
      source: data.source || data.origem || 'Meta Ads',
      origem: data.origem || data.source || 'Meta Ads',
      potential_value: data.potential_value || data.valor_potencial || 10000,
      valor_potencial: data.valor_potencial || data.potential_value || 10000,
      entry_date: new Date().toISOString(),
      soft_delete: false,
      ...data,
    })

    await this.logAudit(tenantId, 'create', 'lead', record.id, null, record)
    return record
  },

  async updateLead(id: string, data: Partial<LeadRecord>): Promise<LeadRecord> {
    const old = await pb
      .collection('leads')
      .getOne<LeadRecord>(id)
      .catch(() => null)
    const record = await pb.collection('leads').update<LeadRecord>(id, data)
    if (old) {
      await this.logAudit(record.tenant_id, 'update', 'lead', id, old, record)
    }
    return record
  },

  async softDeleteLead(id: string): Promise<void> {
    const record = await pb.collection('leads').getOne<LeadRecord>(id)
    await pb
      .collection('leads')
      .update(id, { soft_delete: true, deleted: new Date().toISOString() })
    await this.logAudit(
      record.tenant_id,
      'archive',
      'lead',
      id,
      { soft_delete: false },
      { soft_delete: true },
    )
  },

  // --- PESSOAS & EMPRESAS ---
  async getPessoas(tenantId: string): Promise<PessoaRecord[]> {
    try {
      return await pb.collection('pessoas').getFullList<PessoaRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'empresa_id',
      })
    } catch (e) {
      console.warn('Failed to load pessoas', e)
      return []
    }
  },

  async createPessoa(tenantId: string, data: Partial<PessoaRecord>): Promise<PessoaRecord> {
    const rec = await pb.collection('pessoas').create<PessoaRecord>({
      tenant_id: tenantId,
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'pessoa', rec.id, null, rec)
    return rec
  },

  async updatePessoa(id: string, data: Partial<PessoaRecord>): Promise<PessoaRecord> {
    return await pb.collection('pessoas').update<PessoaRecord>(id, data)
  },

  async getEmpresas(tenantId: string): Promise<EmpresaRecord[]> {
    try {
      return await pb.collection('empresas').getFullList<EmpresaRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
    } catch (e) {
      console.warn('Failed to load empresas', e)
      return []
    }
  },

  async createEmpresa(tenantId: string, data: Partial<EmpresaRecord>): Promise<EmpresaRecord> {
    const rec = await pb.collection('empresas').create<EmpresaRecord>({
      tenant_id: tenantId,
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'empresa', rec.id, null, rec)
    return rec
  },

  async updateEmpresa(id: string, data: Partial<EmpresaRecord>): Promise<EmpresaRecord> {
    return await pb.collection('empresas').update<EmpresaRecord>(id, data)
  },

  // --- CUSTOMERS (CLIENTES) ---
  async getCustomers(tenantId: string): Promise<CustomerRecord[]> {
    try {
      return await pb.collection('customers').getFullList<CustomerRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'lead_id,lead_origem_id,pessoa_id,empresa_id,responsavel_id',
      })
    } catch (e) {
      console.warn('Failed to load customers', e)
      return []
    }
  },

  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    try {
      return await pb.collection('customers').getOne<CustomerRecord>(id, {
        expand: 'lead_id,lead_origem_id,pessoa_id,empresa_id,responsavel_id',
      })
    } catch (e) {
      console.warn('Failed to get customer by id', e)
      return null
    }
  },

  async createCustomer(tenantId: string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
    const rec = await pb.collection('customers').create<CustomerRecord>({
      tenant_id: tenantId,
      status: 'Ativo',
      active: true,
      data_conversao: new Date().toISOString(),
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'customer', rec.id, null, rec)
    return rec
  },

  async updateCustomer(id: string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
    const old = await pb
      .collection('customers')
      .getOne<CustomerRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('customers').update<CustomerRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'customer', id, old, rec)
    }
    return rec
  },

  async toggleCustomerStatus(id: string, active: boolean): Promise<CustomerRecord> {
    const status = active ? 'Ativo' : 'Inativo'
    const rec = await pb.collection('customers').update<CustomerRecord>(id, {
      active,
      status,
    })
    await this.logAudit(rec.tenant_id, active ? 'activate' : 'deactivate', 'customer', id, null, {
      active,
      status,
    })
    return rec
  },

  // --- PIPELINES & STAGES ---
  async getPipelines(tenantId: string): Promise<PipelineRecord[]> {
    try {
      return await pb.collection('pipelines').getFullList<PipelineRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'order',
      })
    } catch (e) {
      console.warn('Failed to load pipelines', e)
      return []
    }
  },

  async getStages(pipelineId: string): Promise<PipelineStageRecord[]> {
    try {
      return await pb.collection('pipeline_stages').getFullList<PipelineStageRecord>({
        filter: `pipeline_id = "${pipelineId}"`,
        sort: 'order',
      })
    } catch (e) {
      console.warn('Failed to load stages', e)
      return []
    }
  },

  // --- OPPORTUNITIES (OPORTUNIDADES) ---
  async getOpportunities(tenantId: string): Promise<OpportunityRecord[]> {
    try {
      return await pb.collection('opportunities').getFullList<OpportunityRecord>({
        filter: `tenant_id = "${tenantId}" && (soft_delete = false || soft_delete = null)`,
        sort: '-created',
        expand: 'lead_id,customer_id,cliente_id,assigned_to,responsavel_id,stage_id,etapa_id',
      })
    } catch (e) {
      console.warn('Failed to load opportunities', e)
      return []
    }
  },

  async getOpportunityById(id: string): Promise<OpportunityRecord | null> {
    try {
      return await pb.collection('opportunities').getOne<OpportunityRecord>(id, {
        expand: 'lead_id,customer_id,cliente_id,assigned_to,responsavel_id,stage_id,etapa_id',
      })
    } catch (e) {
      console.warn('Failed to get opportunity', e)
      return null
    }
  },

  async createOpportunity(
    tenantId: string,
    data: Partial<OpportunityRecord>,
  ): Promise<OpportunityRecord> {
    const rec = await pb.collection('opportunities').create<OpportunityRecord>({
      tenant_id: tenantId,
      title: data.title || 'Nova Oportunidade',
      value: data.value || 15000,
      currency: 'BRL',
      status: data.status || 'open',
      probabilidade: data.probabilidade || 30,
      soft_delete: false,
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'opportunity', rec.id, null, rec)
    return rec
  },

  async updateOpportunity(
    id: string,
    data: Partial<OpportunityRecord>,
  ): Promise<OpportunityRecord> {
    const old = await pb
      .collection('opportunities')
      .getOne<OpportunityRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('opportunities').update<OpportunityRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'opportunity', id, old, rec)
    }
    return rec
  },

  async markOpportunityWon(
    id: string,
    finalData: { value?: number; servico?: string; observacoes?: string; paymentMethod?: string },
  ): Promise<OpportunityRecord> {
    const opp = await pb.collection('opportunities').getOne<OpportunityRecord>(id, {
      expand: 'lead_id,customer_id,cliente_id',
    })

    const updatedOpp = await pb.collection('opportunities').update<OpportunityRecord>(id, {
      status: 'won',
      data_ganho: new Date().toISOString(),
      closed_at: new Date().toISOString(),
      value: finalData.value || opp.value,
      servico: finalData.servico || opp.servico,
      observacoes: (opp.observacoes || '') + `\n[GANHO]: ${finalData.observacoes || ''}`,
    })

    // Auto-create / update customer if not exists
    let customerId = opp.customer_id || opp.cliente_id
    if (!customerId && opp.lead_id) {
      try {
        const lead = await pb.collection('leads').getOne<LeadRecord>(opp.lead_id)
        const customer = await pb.collection('customers').create<CustomerRecord>({
          tenant_id: opp.tenant_id,
          lead_id: lead.id,
          lead_origem_id: lead.id,
          name: lead.name,
          phone: lead.phone || lead.whatsapp,
          email: lead.email,
          company: lead.company,
          document: lead.cpf_cnpj,
          city: lead.city,
          state: lead.estado,
          source: lead.source || lead.origem || 'Meta Ads',
          status: 'Ativo - Contratado',
          active: true,
          lifetime_value: updatedOpp.value,
          valor_total_contratado: updatedOpp.value,
          servicos_contratados: updatedOpp.servico ? [updatedOpp.servico] : ['Assessoria Jurídica'],
          data_conversao: new Date().toISOString(),
        })
        customerId = customer.id
        await pb
          .collection('opportunities')
          .update(id, { customer_id: customerId, cliente_id: customerId })
        // Mark lead as converted
        await pb.collection('leads').update(lead.id, { status: 'Convertido / Ganho' })
      } catch (err) {
        console.warn('Auto customer creation error', err)
      }
    }

    // Register Meta Conversion Event
    try {
      await pb.collection('conversion_events').create<ConversionEventRecord>({
        tenant_id: opp.tenant_id,
        oportunidade_id: id,
        cliente_id: customerId,
        lead_id: opp.lead_id,
        tipo: 'Purchase',
        plataforma: 'meta',
        status: 'enviado',
        event_id: `purchase_${id}_${Date.now()}`,
        payload: {
          value: updatedOpp.value,
          currency: 'BRL',
          content_name: updatedOpp.servico || 'Honorários Advocatícios',
        },
        data_envio: new Date().toISOString(),
      })
    } catch {
      /* intentionally ignored */
    }

    await this.logAudit(opp.tenant_id, 'won', 'opportunity', id, opp, updatedOpp)
    return updatedOpp
  },

  async markOpportunityLost(
    id: string,
    lossReason: string,
    observations?: string,
  ): Promise<OpportunityRecord> {
    const opp = await pb.collection('opportunities').getOne<OpportunityRecord>(id)
    const updated = await pb.collection('opportunities').update<OpportunityRecord>(id, {
      status: 'lost',
      loss_reason: lossReason,
      motivo_perda: lossReason,
      data_perda: new Date().toISOString(),
      closed_at: new Date().toISOString(),
      observacoes: (opp.observacoes || '') + `\n[PERDA]: ${lossReason} - ${observations || ''}`,
    })
    await this.logAudit(opp.tenant_id, 'lost', 'opportunity', id, opp, updated)
    return updated
  },

  // --- TASKS (TAREFAS) ---
  async getTasks(tenantId: string): Promise<TaskRecord[]> {
    try {
      return await pb.collection('tasks').getFullList<TaskRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'data,horario,-created',
        expand: 'responsavel_id,lead_id,oportunidade_id,cliente_id',
      })
    } catch (e) {
      console.warn('Failed to load tasks', e)
      return []
    }
  },

  async createTask(tenantId: string, data: Partial<TaskRecord>): Promise<TaskRecord> {
    const rec = await pb.collection('tasks').create<TaskRecord>({
      tenant_id: tenantId,
      status: 'pendente',
      prioridade: 'media',
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'task', rec.id, null, rec)
    return rec
  },

  async updateTask(id: string, data: Partial<TaskRecord>): Promise<TaskRecord> {
    return await pb.collection('tasks').update<TaskRecord>(id, data)
  },

  // --- NOTES (NOTAS INTERNAS) ---
  async getNotes(tenantId: string, relatedFilter?: string): Promise<NoteRecord[]> {
    try {
      let filter = `tenant_id = "${tenantId}"`
      if (relatedFilter) filter += ` && (${relatedFilter})`
      return await pb.collection('notes').getFullList<NoteRecord>({
        filter,
        sort: '-fixada,-created',
        expand: 'autor_id',
      })
    } catch (e) {
      console.warn('Failed to load notes', e)
      return []
    }
  },

  async createNote(tenantId: string, data: Partial<NoteRecord>): Promise<NoteRecord> {
    const user = pb.authStore.record
    const rec = await pb.collection('notes').create<NoteRecord>({
      tenant_id: tenantId,
      autor_id: user?.id,
      ...data,
    })
    return rec
  },

  async updateNote(id: string, data: Partial<NoteRecord>): Promise<NoteRecord> {
    return await pb.collection('notes').update<NoteRecord>(id, data)
  },

  // --- LEAD MESSAGES (CHAT / NOTAS DO LEAD) ---
  async getLeadMessages(leadId: string): Promise<LeadMessageRecord[]> {
    try {
      return await pb.collection('lead_messages').getFullList<LeadMessageRecord>({
        filter: `lead_id = "${leadId}"`,
        sort: '+created',
        expand: 'author_id',
      })
    } catch (e) {
      console.warn('Failed to load lead messages', e)
      return []
    }
  },

  async createLeadMessage(data: {
    tenant_id: string
    lead_id: string
    author_id: string
    team: 'comercial' | 'juridico' | 'financeiro'
    type: 'nota' | 'sistema'
    content: string
  }): Promise<LeadMessageRecord> {
    return await pb.collection('lead_messages').create<LeadMessageRecord>(data)
  },

  // --- PROPOSALS (PROPOSTAS) ---
  async getProposals(tenantId: string): Promise<ProposalRecord[]> {
    try {
      return await pb.collection('proposals').getFullList<ProposalRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'lead_id,cliente_id,oportunidade_id,responsavel_id,template_id',
      })
    } catch (e) {
      console.warn('Failed to load proposals', e)
      return []
    }
  },

  async createProposal(tenantId: string, data: Partial<ProposalRecord>): Promise<ProposalRecord> {
    const rec = await pb.collection('proposals').create<ProposalRecord>({
      tenant_id: tenantId,
      status: 'rascunho',
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'proposal', rec.id, null, rec)
    return rec
  },

  async updateProposal(id: string, data: Partial<ProposalRecord>): Promise<ProposalRecord> {
    return await pb.collection('proposals').update<ProposalRecord>(id, data)
  },

  // --- CONTRACTS (CONTRATOS) ---
  async getContracts(tenantId: string): Promise<ContractRecord[]> {
    try {
      return await pb.collection('contracts').getFullList<ContractRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'proposta_id,cliente_id,oportunidade_id',
      })
    } catch (e) {
      console.warn('Failed to load contracts', e)
      return []
    }
  },

  async createContract(tenantId: string, data: Partial<ContractRecord>): Promise<ContractRecord> {
    const rec = await pb.collection('contracts').create<ContractRecord>({
      tenant_id: tenantId,
      status: 'aguardando',
      plataforma: 'zapsign',
      historico: [{ data: new Date().toISOString(), evento: 'Contrato gerado no CRM' }],
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'contract', rec.id, null, rec)
    return rec
  },

  async updateContract(id: string, data: Partial<ContractRecord>): Promise<ContractRecord> {
    return await pb.collection('contracts').update<ContractRecord>(id, data)
  },

  // --- CAMPAIGNS (CAMPANHAS) ---
  async getCampaigns(tenantId: string): Promise<CampaignRecord[]> {
    try {
      return await pb.collection('campaigns').getFullList<CampaignRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'responsavel_id',
      })
    } catch (e) {
      console.warn('Failed to load campaigns', e)
      return []
    }
  },

  async createCampaign(tenantId: string, data: Partial<CampaignRecord>): Promise<CampaignRecord> {
    const rec = await pb.collection('campaigns').create<CampaignRecord>({
      tenant_id: tenantId,
      status: 'ativa',
      ...data,
    })
    return rec
  },

  async updateCampaign(id: string, data: Partial<CampaignRecord>): Promise<CampaignRecord> {
    return await pb.collection('campaigns').update<CampaignRecord>(id, data)
  },

  // --- GOALS (METAS) ---
  async getGoals(tenantId: string): Promise<GoalRecord[]> {
    try {
      return await pb.collection('goals').getFullList<GoalRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'usuario_id',
      })
    } catch (e) {
      console.warn('Failed to load goals', e)
      return []
    }
  },

  async createGoal(tenantId: string, data: Partial<GoalRecord>): Promise<GoalRecord> {
    return await pb.collection('goals').create<GoalRecord>({
      tenant_id: tenantId,
      status: 'em_andamento',
      ...data,
    })
  },

  async updateGoal(id: string, data: Partial<GoalRecord>): Promise<GoalRecord> {
    return await pb.collection('goals').update<GoalRecord>(id, data)
  },

  // --- COMMISSIONS (COMISSÕES) ---
  async getCommissions(tenantId: string): Promise<CommissionRecord[]> {
    try {
      return await pb.collection('commissions').getFullList<CommissionRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'usuario_id,contrato_id,oportunidade_id',
      })
    } catch (e) {
      console.warn('Failed to load commissions', e)
      return []
    }
  },

  async createCommission(
    tenantId: string,
    data: Partial<CommissionRecord>,
  ): Promise<CommissionRecord> {
    return await pb.collection('commissions').create<CommissionRecord>({
      tenant_id: tenantId,
      status: 'pendente',
      data_geracao: new Date().toISOString(),
      ...data,
    })
  },

  async updateCommission(id: string, data: Partial<CommissionRecord>): Promise<CommissionRecord> {
    return await pb.collection('commissions').update<CommissionRecord>(id, data)
  },

  // --- SERVICES (SERVIÇOS JURÍDICOS) ---
  async getServices(tenantId: string): Promise<ServiceRecord[]> {
    try {
      return await pb.collection('services').getFullList<ServiceRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'area,nome',
      })
    } catch (e) {
      console.warn('Failed to load services', e)
      return []
    }
  },

  async createService(tenantId: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    return await pb.collection('services').create<ServiceRecord>({
      tenant_id: tenantId,
      status: 'ativo',
      ...data,
    })
  },

  async updateService(id: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    return await pb.collection('services').update<ServiceRecord>(id, data)
  },

  // --- TAGS ---
  async getTags(tenantId: string): Promise<TagRecord[]> {
    try {
      return await pb.collection('tags').getFullList<TagRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'nome',
      })
    } catch (e) {
      console.warn('Failed to load tags', e)
      return []
    }
  },

  async createTag(tenantId: string, data: Partial<TagRecord>): Promise<TagRecord> {
    return await pb.collection('tags').create<TagRecord>({
      tenant_id: tenantId,
      ...data,
    })
  },

  // --- TEMPLATES ---
  async getTemplates(tenantId: string): Promise<TemplateRecord[]> {
    try {
      return await pb.collection('templates').getFullList<TemplateRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: 'tipo,nome',
      })
    } catch (e) {
      console.warn('Failed to load templates', e)
      return []
    }
  },

  async createTemplate(tenantId: string, data: Partial<TemplateRecord>): Promise<TemplateRecord> {
    return await pb.collection('templates').create<TemplateRecord>({
      tenant_id: tenantId,
      ...data,
    })
  },

  async updateTemplate(id: string, data: Partial<TemplateRecord>): Promise<TemplateRecord> {
    return await pb.collection('templates').update<TemplateRecord>(id, data)
  },

  // --- AUTOMATIONS ---
  async getAutomations(tenantId: string): Promise<AutomationRecord[]> {
    try {
      return await pb.collection('automations').getFullList<AutomationRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
    } catch (e) {
      console.warn('Failed to load automations', e)
      return []
    }
  },

  async createAutomation(
    tenantId: string,
    data: Partial<AutomationRecord>,
  ): Promise<AutomationRecord> {
    return await pb.collection('automations').create<AutomationRecord>({
      tenant_id: tenantId,
      ativo: true,
      execucoes: 0,
      ...data,
    })
  },

  async updateAutomation(id: string, data: Partial<AutomationRecord>): Promise<AutomationRecord> {
    return await pb.collection('automations').update<AutomationRecord>(id, data)
  },

  // --- SLAs & REGRAS ---
  async getSlaConfigs(tenantId: string): Promise<SlaConfigRecord[]> {
    try {
      return await pb.collection('sla_configs').getFullList<SlaConfigRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
    } catch (e) {
      console.warn('Failed to load SLAs', e)
      return []
    }
  },

  async createSlaConfig(
    tenantId: string,
    data: Partial<SlaConfigRecord>,
  ): Promise<SlaConfigRecord> {
    return await pb.collection('sla_configs').create<SlaConfigRecord>({
      tenant_id: tenantId,
      ativo: true,
      ...data,
    })
  },

  async updateSlaConfig(id: string, data: Partial<SlaConfigRecord>): Promise<SlaConfigRecord> {
    return await pb.collection('sla_configs').update<SlaConfigRecord>(id, data)
  },

  // --- CONVERSION EVENTS ---
  async getConversionEvents(tenantId: string): Promise<ConversionEventRecord[]> {
    try {
      return await pb.collection('conversion_events').getFullList<ConversionEventRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
    } catch (e) {
      console.warn('Failed to load conversion events', e)
      return []
    }
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(tenantId: string, limit = 50): Promise<AuditLogRecord[]> {
    try {
      const list = await pb.collection('audit_logs').getList<AuditLogRecord>(1, limit, {
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
        expand: 'user_id',
      })
      return list.items
    } catch (e) {
      console.warn('Failed to load audit logs', e)
      return []
    }
  },
}
