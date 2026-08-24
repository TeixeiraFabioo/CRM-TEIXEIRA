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
  MessageTemplateRecord,
  CustomFieldRecord,
  AutomationRecord,
  AuditLogRecord,
  SlaConfigRecord,
  ConversionEventRecord,
  PipelineRecord,
  PipelineStageRecord,
  UserRecord,
  LeadDistributionRecord,
  SessionLogRecord,
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
      let filter = `tenant_id = "${tenantId}" && (soft_delete = false || soft_delete = null) && (deleted = false || deleted = null)`
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
    await pb.collection('leads').update(id, { soft_delete: true, deleted: true })
    await this.logAudit(
      record.tenant_id,
      'archive',
      'lead',
      id,
      { soft_delete: false, deleted: false },
      { soft_delete: true, deleted: true },
    )
  },

  async restoreLead(id: string): Promise<void> {
    const record = await pb.collection('leads').getOne<LeadRecord>(id)
    await pb.collection('leads').update(id, { soft_delete: false, deleted: false })
    await this.logAudit(
      record.tenant_id,
      'restore',
      'lead',
      id,
      { soft_delete: true, deleted: true },
      { soft_delete: false, deleted: false },
    )
  },

  async deleteLeadPermanent(id: string): Promise<boolean> {
    const record = await pb
      .collection('leads')
      .getOne<LeadRecord>(id)
      .catch(() => null)
    const res = await pb.collection('leads').delete(id)
    if (record) {
      await this.logAudit(record.tenant_id, 'delete_permanent', 'lead', id, record, null)
    }
    return res
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
    const old = await pb
      .collection('pessoas')
      .getOne<PessoaRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('pessoas').update<PessoaRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'pessoa', id, old, rec)
    }
    return rec
  },

  async deletePessoa(id: string): Promise<boolean> {
    const rec = await pb
      .collection('pessoas')
      .getOne<PessoaRecord>(id)
      .catch(() => null)
    const res = await pb.collection('pessoas').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'pessoa', id, rec, null)
    }
    return res
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
    const old = await pb
      .collection('empresas')
      .getOne<EmpresaRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('empresas').update<EmpresaRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'empresa', id, old, rec)
    }
    return rec
  },

  async deleteEmpresa(id: string): Promise<boolean> {
    const rec = await pb
      .collection('empresas')
      .getOne<EmpresaRecord>(id)
      .catch(() => null)
    const res = await pb.collection('empresas').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'empresa', id, rec, null)
    }
    return res
  },

  // --- CUSTOMERS (CLIENTES) ---
  async getCustomers(tenantId: string): Promise<CustomerRecord[]> {
    try {
      return await pb.collection('customers').getFullList<CustomerRecord>({
        filter: `tenant_id = "${tenantId}" && (deleted = false || deleted = null)`,
        sort: '-created',
        expand: 'lead_id,lead_origem_id,pessoa_id,empresa_id,responsavel_id',
      })
    } catch (e) {
      console.warn('Failed to load customers', e)
      return []
    }
  },

  async softDeleteCustomer(id: string): Promise<void> {
    const record = await pb.collection('customers').getOne<CustomerRecord>(id)
    await pb.collection('customers').update(id, { deleted: true })
    await this.logAudit(
      record.tenant_id,
      'archive',
      'customer',
      id,
      { deleted: false },
      { deleted: true },
    )
  },

  async restoreCustomer(id: string): Promise<void> {
    const record = await pb.collection('customers').getOne<CustomerRecord>(id)
    await pb.collection('customers').update(id, { deleted: false })
    await this.logAudit(
      record.tenant_id,
      'restore',
      'customer',
      id,
      { deleted: true },
      { deleted: false },
    )
  },

  async deleteCustomerPermanent(id: string): Promise<boolean> {
    const record = await pb
      .collection('customers')
      .getOne<CustomerRecord>(id)
      .catch(() => null)
    const res = await pb.collection('customers').delete(id)
    if (record) {
      await this.logAudit(record.tenant_id, 'delete_permanent', 'customer', id, record, null)
    }
    return res
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
        filter: `tenant_id = "${tenantId}" && (soft_delete = false || soft_delete = null) && (deleted = false || deleted = null)`,
        sort: '-created',
        expand: 'lead_id,customer_id,cliente_id,assigned_to,responsavel_id,stage_id,etapa_id',
      })
    } catch (e) {
      console.warn('Failed to load opportunities', e)
      return []
    }
  },

  async softDeleteOpportunity(id: string): Promise<void> {
    const record = await pb.collection('opportunities').getOne<OpportunityRecord>(id)
    await pb.collection('opportunities').update(id, { deleted: true, soft_delete: true })
    await this.logAudit(
      record.tenant_id,
      'archive',
      'opportunity',
      id,
      { deleted: false },
      { deleted: true },
    )
  },

  async restoreOpportunity(id: string): Promise<void> {
    const record = await pb.collection('opportunities').getOne<OpportunityRecord>(id)
    await pb.collection('opportunities').update(id, { deleted: false, soft_delete: false })
    await this.logAudit(
      record.tenant_id,
      'restore',
      'opportunity',
      id,
      { deleted: true },
      { deleted: false },
    )
  },

  async deleteOpportunityPermanent(id: string): Promise<boolean> {
    const record = await pb
      .collection('opportunities')
      .getOne<OpportunityRecord>(id)
      .catch(() => null)
    const res = await pb.collection('opportunities').delete(id)
    if (record) {
      await this.logAudit(record.tenant_id, 'delete_permanent', 'opportunity', id, record, null)
    }
    return res
  },

  async getTrashRecords(tenantId: string) {
    try {
      const [leads, customers, opportunities] = await Promise.all([
        pb
          .collection('leads')
          .getFullList<LeadRecord>({
            filter: `tenant_id = "${tenantId}" && (deleted = true || soft_delete = true)`,
            sort: '-updated',
            expand: 'assigned_to,responsavel_id,empresa_id',
          })
          .catch(() => []),
        pb
          .collection('customers')
          .getFullList<CustomerRecord>({
            filter: `tenant_id = "${tenantId}" && deleted = true`,
            sort: '-updated',
            expand: 'responsavel_id,empresa_id',
          })
          .catch(() => []),
        pb
          .collection('opportunities')
          .getFullList<OpportunityRecord>({
            filter: `tenant_id = "${tenantId}" && (deleted = true || soft_delete = true)`,
            sort: '-updated',
            expand: 'lead_id,customer_id,assigned_to,responsavel_id',
          })
          .catch(() => []),
      ])

      return { leads, customers, opportunities }
    } catch (e) {
      console.warn('Failed to fetch trash records', e)
      return { leads: [], customers: [], opportunities: [] }
    }
  },

  async getSessionLogs(tenantId: string, limit = 100) {
    try {
      const filter = tenantId ? `tenant_id = "${tenantId}"` : undefined
      return await pb.collection('session_logs').getList<SessionLogRecord>(1, limit, {
        filter,
        sort: '-created',
        expand: 'user_id',
      })
    } catch (e) {
      console.warn('Failed to fetch session logs', e)
      return { items: [], totalItems: 0, totalPages: 0, page: 1, perPage: limit }
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

  async getLeadsWithMessagesMap(tenantId: string): Promise<Set<string>> {
    try {
      const messages = await pb.collection('lead_messages').getFullList<{ lead_id: string }>({
        filter: `tenant_id = "${tenantId}"`,
        fields: 'lead_id',
      })
      const set = new Set<string>()
      for (const m of messages) {
        if (m.lead_id) set.add(m.lead_id)
      }
      return set
    } catch (e) {
      console.warn('Failed to load lead messages map', e)
      return new Set<string>()
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
    const old = await pb
      .collection('proposals')
      .getOne<ProposalRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('proposals').update<ProposalRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'proposal', id, old, rec)
    }
    return rec
  },

  async deleteProposal(id: string): Promise<boolean> {
    const rec = await pb
      .collection('proposals')
      .getOne<ProposalRecord>(id)
      .catch(() => null)
    const res = await pb.collection('proposals').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'proposal', id, rec, null)
    }
    return res
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

  async getContractById(id: string): Promise<ContractRecord | null> {
    try {
      return await pb.collection('contracts').getOne<ContractRecord>(id, {
        expand: 'proposta_id,cliente_id,oportunidade_id',
      })
    } catch (e) {
      console.warn('Failed to get contract by id', e)
      return null
    }
  },

  async getContractByOpportunityId(oppId: string): Promise<ContractRecord | null> {
    try {
      const list = await pb.collection('contracts').getList<ContractRecord>(1, 1, {
        filter: `oportunidade_id = "${oppId}"`,
        sort: '-created',
        expand: 'proposta_id,cliente_id,oportunidade_id',
      })
      return list.items.length > 0 ? list.items[0] : null
    } catch (e) {
      console.warn('Failed to get contract by opportunity id', e)
      return null
    }
  },

  async createContract(tenantId: string, data: Partial<ContractRecord>): Promise<ContractRecord> {
    const rec = await pb.collection('contracts').create<ContractRecord>({
      tenant_id: tenantId,
      status: data.status || 'aguardando',
      sign_status: data.sign_status || 'pending',
      plataforma: data.plataforma || 'zapsign',
      sign_provider: data.sign_provider || 'zapsign',
      historico: [{ data: new Date().toISOString(), evento: 'Contrato gerado no CRM' }],
      sign_events: [{ event: 'contract_created', date: new Date().toISOString() }],
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'contract', rec.id, null, rec)
    return rec
  },

  async updateContract(id: string, data: Partial<ContractRecord>): Promise<ContractRecord> {
    const old = await pb
      .collection('contracts')
      .getOne<ContractRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('contracts').update<ContractRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'contract', id, old, rec)
    }
    return rec
  },

  async deleteContract(id: string): Promise<boolean> {
    const rec = await pb
      .collection('contracts')
      .getOne<ContractRecord>(id)
      .catch(() => null)
    const res = await pb.collection('contracts').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'contract', id, rec, null)
    }
    return res
  },

  async sendContractForSignature(contractId: string): Promise<ContractRecord> {
    const updated = await pb.collection('contracts').update<ContractRecord>(
      contractId,
      {
        sign_status: 'sent',
        status: 'enviado',
        sent_at: new Date().toISOString(),
        data_envio: new Date().toISOString(),
      },
      {
        expand: 'proposta_id,cliente_id,oportunidade_id',
      },
    )
    return updated
  },

  // --- CALENDLY INTEGRATION HELPERS ---
  async getCalendlyConfig(
    tenantId: string,
  ): Promise<{ connected: boolean; config: any; scheduling_url?: string }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "calendly"`,
      })
      if (list.items.length > 0) {
        const item = list.items[0]
        const cfg = (item.config_json || item.config || {}) as any
        const isConnected = item.status === 'active' && item.is_active !== false
        return {
          connected: isConnected,
          config: item,
          scheduling_url: cfg.scheduling_url || '',
        }
      }
      return { connected: false, config: null, scheduling_url: '' }
    } catch (e) {
      console.warn('Failed to get Calendly config from integration_configs', e)
      return { connected: false, config: null, scheduling_url: '' }
    }
  },

  async connectCalendly(
    tenantId: string,
    token: string,
  ): Promise<{
    success: boolean
    message?: string
    error?: string
    scheduling_url?: string
    config?: any
  }> {
    try {
      // 1. Check if record already exists
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "calendly"`,
      })

      const payload = {
        tenant_id: tenantId,
        provider: 'calendly',
        api_token: token.trim(),
        api_key: token.trim(),
        is_active: true,
        config_json: {
          provider: 'calendly',
          connected_at: new Date().toISOString(),
        },
      }

      let record: any
      if (list.items.length > 0) {
        record = await pb.collection('integration_configs').update(list.items[0].id, payload)
      } else {
        record = await pb.collection('integration_configs').create(payload)
      }

      const cfg = record.config_json || record.config || {}
      if (record.status === 'error') {
        return {
          success: false,
          error: cfg.error_message || 'Token do Calendly inválido ou rejeitado pela API.',
          config: record,
        }
      }

      return {
        success: true,
        message: 'Calendly conectado com sucesso!',
        scheduling_url: cfg.scheduling_url || '',
        config: record,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao salvar integração do Calendly.',
      }
    }
  },

  async disconnectCalendly(
    tenantId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getFullList({
        filter: `tenant_id = "${tenantId}" && provider = "calendly"`,
      })
      for (const item of list) {
        await pb.collection('integration_configs').delete(item.id)
      }
      return { success: true, message: 'Calendly desconectado com sucesso.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao desconectar Calendly.' }
    }
  },

  async testCalendlyConnection(
    tenantId: string,
    token?: string,
  ): Promise<{ success: boolean; message: string; scheduling_url?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "calendly"`,
      })
      if (list.items.length === 0 && !token) {
        return {
          success: false,
          message: 'Calendly não configurado.',
          error: 'Calendly não configurado.',
        }
      }

      if (list.items.length > 0) {
        const item = list.items[0]
        const currentCfg = item.config_json || item.config || {}
        const updated = await pb.collection('integration_configs').update(item.id, {
          api_token: token || item.api_token || item.api_key,
          api_key: token || item.api_token || item.api_key,
          config_json: {
            ...currentCfg,
            test_requested: true,
            tested_at: new Date().toISOString(),
          },
        })
        const cfg = updated.config_json || updated.config || {}
        if (updated.status === 'active') {
          return {
            success: true,
            message: 'Conexão com Calendly validada com sucesso!',
            scheduling_url: cfg.scheduling_url,
          }
        } else {
          return {
            success: false,
            message: cfg.error_message || 'Falha de validação com Calendly.',
            error: cfg.error_message,
          }
        }
      }

      // Se passou token avulso, testa via criação temporária
      const tempRec = await pb.collection('integration_configs').create({
        tenant_id: tenantId,
        provider: 'calendly',
        api_token: token,
        api_key: token,
      })
      const cfg = tempRec.config_json || tempRec.config || {}
      const success = tempRec.status === 'active'
      return {
        success,
        message: success
          ? 'Calendly validado com sucesso!'
          : cfg.error_message || 'Token inválido.',
        scheduling_url: cfg.scheduling_url,
        error: success ? undefined : cfg.error_message,
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao testar Calendly.',
        error: err?.message,
      }
    }
  },

  async getCalendlySchedulingLink(tenantId: string): Promise<string> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "calendly"`,
      })
      if (list.items.length > 0) {
        const cfg = (list.items[0].config_json || list.items[0].config || {}) as any
        return cfg.scheduling_url || ''
      }
      return ''
    } catch {
      return ''
    }
  },

  // --- GOOGLE MEET INTEGRATION HELPERS ---
  async getGoogleMeetConfig(tenantId: string): Promise<{ connected: boolean; config: any }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "google_meet"`,
      })
      if (list.items.length > 0) {
        const item = list.items[0]
        const isConnected = item.status === 'active' && item.is_active !== false
        return {
          connected: isConnected,
          config: item,
        }
      }
      return { connected: false, config: null }
    } catch (e) {
      console.warn('Failed to get Google Meet config', e)
      return { connected: false, config: null }
    }
  },

  async connectGoogleMeet(
    tenantId: string,
    token: string,
  ): Promise<{
    success: boolean
    message?: string
    error?: string
    config?: any
  }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "google_meet"`,
      })

      const payload = {
        tenant_id: tenantId,
        provider: 'google_meet',
        api_key: token.trim(),
        api_token: token.trim(),
        is_active: true,
        config_json: {
          provider: 'google_meet',
          calendar_id: 'primary',
          connected_at: new Date().toISOString(),
        },
      }

      let record: any
      if (list.items.length > 0) {
        record = await pb.collection('integration_configs').update(list.items[0].id, payload)
      } else {
        record = await pb.collection('integration_configs').create(payload)
      }

      const cfg = record.config_json || record.config || {}
      if (record.status === 'error') {
        return {
          success: false,
          error: cfg.error_message || 'Credencial do Google Meet inválida.',
          config: record,
        }
      }

      return {
        success: true,
        message: 'Google Meet conectado com sucesso!',
        config: record,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao salvar integração do Google Meet.',
      }
    }
  },

  async disconnectGoogleMeet(
    tenantId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getFullList({
        filter: `tenant_id = "${tenantId}" && provider = "google_meet"`,
      })
      for (const item of list) {
        await pb.collection('integration_configs').delete(item.id)
      }
      return { success: true, message: 'Google Meet desconectado com sucesso.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao desconectar Google Meet.' }
    }
  },

  async testGoogleMeetConnection(
    tenantId: string,
    token?: string,
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "google_meet"`,
      })
      if (list.items.length === 0 && !token) {
        return {
          success: false,
          message: 'Google Meet não configurado.',
          error: 'Google Meet não configurado.',
        }
      }

      if (list.items.length > 0) {
        const item = list.items[0]
        const currentCfg = item.config_json || item.config || {}
        const updated = await pb.collection('integration_configs').update(item.id, {
          api_key: token || item.api_key || item.api_token,
          api_token: token || item.api_key || item.api_token,
          config_json: {
            ...currentCfg,
            test_requested: true,
            tested_at: new Date().toISOString(),
          },
        })
        const cfg = updated.config_json || updated.config || {}
        if (updated.status === 'active') {
          return { success: true, message: 'Configuração do Google Meet validada com sucesso!' }
        } else {
          return {
            success: false,
            message: cfg.error_message || 'Falha na validação do Google Meet.',
            error: cfg.error_message,
          }
        }
      }

      return { success: true, message: 'Chave do Google Meet aceita!' }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao testar Google Meet.',
        error: err?.message,
      }
    }
  },

  // --- ZAPSIGN INTEGRATION HELPERS ---
  async getZapSignConfig(tenantId: string): Promise<{ connected: boolean; config: any }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "zapsign"`,
      })
      if (list.items.length > 0) {
        const item = list.items[0]
        const isConnected = item.status === 'active' && item.is_active !== false
        return { connected: isConnected, config: item }
      }
      return { connected: false, config: null }
    } catch (e) {
      console.warn('Failed to get ZapSign config', e)
      return { connected: false, config: null }
    }
  },

  async connectZapSign(
    tenantId: string,
    token: string,
    sandbox = false,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "zapsign"`,
      })

      const payload = {
        tenant_id: tenantId,
        provider: 'zapsign',
        api_token: token.trim(),
        api_key: token.trim(),
        is_active: true,
        config_json: {
          provider: 'zapsign',
          sandbox: sandbox,
          connected_at: new Date().toISOString(),
        },
      }

      let record: any
      if (list.items.length > 0) {
        record = await pb.collection('integration_configs').update(list.items[0].id, payload)
      } else {
        record = await pb.collection('integration_configs').create(payload)
      }

      const cfg = record.config_json || record.config || {}
      if (record.status === 'error') {
        return {
          success: false,
          error: cfg.error_message || 'Token inválido ou rejeitado pela API do ZapSign.',
        }
      }

      return {
        success: true,
        message: 'ZapSign conectado com sucesso!',
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao salvar integração do ZapSign.',
      }
    }
  },

  async disconnectZapSign(
    tenantId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const list = await pb.collection('integration_configs').getFullList({
        filter: `tenant_id = "${tenantId}" && provider = "zapsign"`,
      })
      for (const item of list) {
        await pb.collection('integration_configs').delete(item.id)
      }
      return { success: true, message: 'ZapSign desconectado com sucesso.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao desconectar ZapSign.' }
    }
  },

  async testZapSignConnection(
    tenantId: string,
    token?: string,
    sandbox = false,
  ): Promise<{ success: boolean; status: string; message: string }> {
    try {
      const list = await pb.collection('integration_configs').getList(1, 1, {
        filter: `tenant_id = "${tenantId}" && provider = "zapsign"`,
      })
      if (list.items.length === 0 && !token) {
        return { success: false, status: 'error', message: 'ZapSign não configurado no tenant.' }
      }

      if (list.items.length > 0) {
        const item = list.items[0]
        const currentCfg = item.config_json || item.config || {}
        const updated = await pb.collection('integration_configs').update(item.id, {
          api_token: token || item.api_token || item.api_key,
          api_key: token || item.api_token || item.api_key,
          config_json: {
            ...currentCfg,
            sandbox: sandbox !== undefined ? sandbox : !!currentCfg.sandbox,
            test_requested: true,
            tested_at: new Date().toISOString(),
          },
        })
        const cfg = updated.config_json || updated.config || {}
        if (updated.status === 'active') {
          return {
            success: true,
            status: 'connected',
            message: 'Conexão com ZapSign validada com sucesso!',
          }
        } else {
          return {
            success: false,
            status: 'error',
            message: cfg.error_message || 'Falha de autenticação com a API do ZapSign.',
          }
        }
      }

      // Se passou token novo diretamente
      const tempRec = await pb.collection('integration_configs').create({
        tenant_id: tenantId,
        provider: 'zapsign',
        api_token: token,
        api_key: token,
        config_json: { sandbox },
      })
      const cfg = tempRec.config_json || tempRec.config || {}
      const success = tempRec.status === 'active'
      return {
        success,
        status: success ? 'connected' : 'error',
        message: success ? 'ZapSign validado com sucesso!' : cfg.error_message || 'Token inválido.',
      }
    } catch (err: any) {
      return { success: false, status: 'error', message: err?.message || 'Erro ao testar ZapSign.' }
    }
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

  async deleteGoal(id: string): Promise<boolean> {
    return await pb.collection('goals').delete(id)
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
    const rec = await pb.collection('commissions').create<CommissionRecord>({
      tenant_id: tenantId,
      status: data.status || 'pendente',
      data_geracao: data.data_geracao || new Date().toISOString(),
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'commission', rec.id, null, rec)
    return rec
  },

  async updateCommission(id: string, data: Partial<CommissionRecord>): Promise<CommissionRecord> {
    const old = await pb
      .collection('commissions')
      .getOne<CommissionRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('commissions').update<CommissionRecord>(id, data, {
      expand: 'usuario_id,contrato_id,oportunidade_id',
    })
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'commission', id, old, rec)
    }
    return rec
  },

  async markCommissionAsPaid(id: string): Promise<CommissionRecord> {
    return await this.updateCommission(id, {
      status: 'pago',
      data_pagamento: new Date().toISOString(),
    })
  },

  async deleteCommission(id: string): Promise<boolean> {
    const rec = await pb
      .collection('commissions')
      .getOne<CommissionRecord>(id)
      .catch(() => null)
    const res = await pb.collection('commissions').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'commission', id, rec, null)
    }
    return res
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
    const old = await pb
      .collection('services')
      .getOne<ServiceRecord>(id)
      .catch(() => null)
    const rec = await pb.collection('services').update<ServiceRecord>(id, data)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'service', id, old, rec)
    }
    return rec
  },

  async deleteService(id: string): Promise<boolean> {
    const rec = await pb
      .collection('services')
      .getOne<ServiceRecord>(id)
      .catch(() => null)
    const res = await pb.collection('services').delete(id)
    if (rec) {
      await this.logAudit(rec.tenant_id, 'delete', 'service', id, rec, null)
    }
    return res
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

  async getTagsByIds(tagIds: string[]): Promise<TagRecord[]> {
    if (!tagIds || tagIds.length === 0) return []
    try {
      const filter = tagIds.map((id) => `id = "${id}"`).join(' || ')
      return await pb.collection('tags').getFullList<TagRecord>({
        filter,
      })
    } catch (e) {
      console.warn('Failed to fetch tags by ids', e)
      return []
    }
  },

  async updateTag(id: string, data: Partial<TagRecord>): Promise<TagRecord> {
    return await pb.collection('tags').update<TagRecord>(id, data)
  },

  async deleteTag(id: string): Promise<boolean> {
    return await pb.collection('tags').delete(id)
  },

  // --- MESSAGE TEMPLATES (TEMPLATES DE MENSAGEM) ---
  async getMessageTemplates(tenantId: string): Promise<MessageTemplateRecord[]> {
    try {
      return await pb.collection('message_templates').getFullList<MessageTemplateRecord>({
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
    } catch (e) {
      console.warn('Failed to load message templates', e)
      return []
    }
  },

  async createMessageTemplate(
    tenantId: string,
    data: Partial<MessageTemplateRecord>,
  ): Promise<MessageTemplateRecord> {
    return await pb.collection('message_templates').create<MessageTemplateRecord>({
      tenant_id: tenantId,
      status: data.status || 'ativo',
      ...data,
    })
  },

  async updateMessageTemplate(
    id: string,
    data: Partial<MessageTemplateRecord>,
  ): Promise<MessageTemplateRecord> {
    return await pb.collection('message_templates').update<MessageTemplateRecord>(id, data)
  },

  async deleteMessageTemplate(id: string): Promise<boolean> {
    return await pb.collection('message_templates').delete(id)
  },

  // --- CUSTOM FIELDS (CAMPOS PERSONALIZADOS) ---
  async getCustomFields(tenantId: string, modulo?: string): Promise<CustomFieldRecord[]> {
    try {
      let filter = `tenant_id = "${tenantId}"`
      if (modulo) {
        filter += ` && modulo = "${modulo}"`
      }
      return await pb.collection('custom_fields').getFullList<CustomFieldRecord>({
        filter,
        sort: 'ordem,nome',
      })
    } catch (e) {
      console.warn('Failed to load custom fields', e)
      return []
    }
  },

  async createCustomField(
    tenantId: string,
    data: Partial<CustomFieldRecord>,
  ): Promise<CustomFieldRecord> {
    return await pb.collection('custom_fields').create<CustomFieldRecord>({
      tenant_id: tenantId,
      obrigatorio: data.obrigatorio ?? false,
      ordem: data.ordem ?? 0,
      ...data,
    })
  },

  async updateCustomField(
    id: string,
    data: Partial<CustomFieldRecord>,
  ): Promise<CustomFieldRecord> {
    return await pb.collection('custom_fields').update<CustomFieldRecord>(id, data)
  },

  async deleteCustomField(id: string): Promise<boolean> {
    return await pb.collection('custom_fields').delete(id)
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

  // --- LEAD DISTRIBUTION ---
  async getLeadDistributionConfig(tenantId: string): Promise<LeadDistributionRecord | null> {
    try {
      const list = await pb.collection('lead_distribution').getList<LeadDistributionRecord>(1, 1, {
        filter: `tenant_id = "${tenantId}" && (lead_id = "" || lead_id = null)`,
        sort: '-created',
      })
      if (list.items.length > 0) return list.items[0]

      // Fallback para qualquer registro de config
      const listAny = await pb
        .collection('lead_distribution')
        .getList<LeadDistributionRecord>(1, 1, {
          filter: `tenant_id = "${tenantId}"`,
          sort: '-created',
        })
      return listAny.items.length > 0 ? listAny.items[0] : null
    } catch (e) {
      console.warn('Failed to get lead distribution config', e)
      return null
    }
  },

  async upsertLeadDistributionConfig(
    tenantId: string,
    data: { metodo: 'round_robin' | 'manual' | string; ativo: boolean },
  ): Promise<LeadDistributionRecord> {
    const existing = await this.getLeadDistributionConfig(tenantId)
    const payload = {
      tenant_id: tenantId,
      metodo: data.metodo,
      distribution_method: data.metodo,
      ativo: data.ativo,
      is_active: data.ativo,
    }
    let record: LeadDistributionRecord
    if (existing) {
      record = await pb
        .collection('lead_distribution')
        .update<LeadDistributionRecord>(existing.id, payload)
    } else {
      record = await pb.collection('lead_distribution').create<LeadDistributionRecord>(payload)
    }
    await this.logAudit(
      tenantId,
      'update_lead_distribution_config',
      'settings',
      record.id,
      existing,
      record,
    )
    return record
  },

  async getRecentLeadDistributions(
    tenantId: string,
    limit = 20,
  ): Promise<LeadDistributionRecord[]> {
    try {
      const list = await pb
        .collection('lead_distribution')
        .getList<LeadDistributionRecord>(1, limit, {
          filter: `tenant_id = "${tenantId}" && lead_id != "" && user_id != ""`,
          sort: '-created',
          expand: 'lead_id,user_id',
        })
      if (list.items.length > 0) return list.items

      // Se não houver em lead_distribution com lead_id, tentar em lead_distribution_logs
      try {
        const logs = await pb.collection('lead_distribution_logs').getList<any>(1, limit, {
          filter: `tenant_id = "${tenantId}"`,
          sort: '-created',
          expand: 'lead_id,user_id',
        })
        return logs.items
      } catch {
        /* intentionally ignored */
      }

      return list.items
    } catch (e) {
      console.warn('Failed to get recent lead distributions', e)
      return []
    }
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

  async getActiveSlaConfig(tenantId: string): Promise<SlaConfigRecord | null> {
    try {
      const list = await pb.collection('sla_configs').getList<SlaConfigRecord>(1, 1, {
        filter: `tenant_id = "${tenantId}" && (ativo = true || is_active = true)`,
        sort: '-created',
      })
      return list.items.length > 0 ? list.items[0] : null
    } catch (e) {
      console.warn('Failed to load active SLA', e)
      return null
    }
  },

  async createSlaConfig(
    tenantId: string,
    data: Partial<SlaConfigRecord>,
  ): Promise<SlaConfigRecord> {
    const minutes = data.first_response_minutes ?? data.tempo_resposta_minutos ?? 15
    const isActive = data.is_active ?? data.ativo ?? true
    const rec = await pb.collection('sla_configs').create<SlaConfigRecord>({
      tenant_id: tenantId,
      ativo: isActive,
      is_active: isActive,
      tempo_resposta_minutos: minutes,
      first_response_minutes: minutes,
      ...data,
    })
    await this.logAudit(tenantId, 'create', 'sla_config', rec.id, null, rec)
    return rec
  },

  async updateSlaConfig(id: string, data: Partial<SlaConfigRecord>): Promise<SlaConfigRecord> {
    const old = await pb
      .collection('sla_configs')
      .getOne<SlaConfigRecord>(id)
      .catch(() => null)
    const minutes = data.first_response_minutes ?? data.tempo_resposta_minutos
    const isActive = data.is_active ?? data.ativo
    const payload: any = { ...data }
    if (minutes !== undefined) {
      payload.tempo_resposta_minutos = minutes
      payload.first_response_minutes = minutes
    }
    if (isActive !== undefined) {
      payload.ativo = isActive
      payload.is_active = isActive
    }
    const rec = await pb.collection('sla_configs').update<SlaConfigRecord>(id, payload)
    if (old) {
      await this.logAudit(rec.tenant_id, 'update', 'sla_config', id, old, rec)
    }
    return rec
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
  async getAuditLogs(
    tenantId: string,
    options: {
      limit?: number
      page?: number
      action?: string
      period?: 'today' | '7d' | '30d' | 'all'
    } = {},
  ): Promise<{ items: AuditLogRecord[]; totalItems: number; totalPages: number }> {
    try {
      const limit = options.limit || 100
      const page = options.page || 1

      const filterParts = [`tenant_id = "${tenantId}"`]

      if (options.action && options.action !== 'all') {
        filterParts.push(`action ~ "${options.action}"`)
      }

      if (options.period && options.period !== 'all') {
        const now = new Date()
        let fromDate: Date | null = null
        if (options.period === 'today') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (options.period === '7d') {
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        } else if (options.period === '30d') {
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
        if (fromDate) {
          filterParts.push(`created >= "${fromDate.toISOString().replace('T', ' ')}"`)
        }
      }

      const list = await pb.collection('audit_logs').getList<AuditLogRecord>(page, limit, {
        filter: filterParts.join(' && '),
        sort: '-created',
        expand: 'user_id',
      })
      return {
        items: list.items,
        totalItems: list.totalItems,
        totalPages: list.totalPages,
      }
    } catch (e) {
      console.warn('Failed to load audit logs', e)
      return { items: [], totalItems: 0, totalPages: 0 }
    }
  },

  // --- KNOWLEDGE BASE ---
  async getKnowledgeBase(tenantId: string) {
    try {
      const list = await pb.collection('knowledge_base').getList(1, 1, {
        filter: `tenant_id = "${tenantId}"`,
        sort: '-updated',
        expand: 'updated_by',
      })
      return list.items.length > 0 ? list.items[0] : null
    } catch (e) {
      console.warn('Failed to get knowledge base', e)
      return null
    }
  },

  async upsertKnowledgeBase(tenantId: string, content: string) {
    const user = pb.authStore.record
    const existing = await this.getKnowledgeBase(tenantId)
    if (existing) {
      const updated = await pb.collection('knowledge_base').update(
        existing.id,
        {
          content,
          updated_by: user?.id,
        },
        {
          expand: 'updated_by',
        },
      )
      await this.logAudit(
        tenantId,
        'update_knowledge_base',
        'knowledge_base',
        existing.id,
        { length: existing.content?.length },
        { length: content.length },
      )
      return updated
    } else {
      const created = await pb.collection('knowledge_base').create(
        {
          tenant_id: tenantId,
          content,
          updated_by: user?.id,
        },
        {
          expand: 'updated_by',
        },
      )
      await this.logAudit(tenantId, 'create_knowledge_base', 'knowledge_base', created.id, null, {
        length: content.length,
      })
      return created
    }
  },
}
