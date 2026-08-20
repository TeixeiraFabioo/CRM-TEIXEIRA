import pb from '@/lib/pocketbase/client'
import { LeadRecord, OpportunityRecord } from '@/types/platform'

export const CrmService = {
  async getLeads(tenantId: string): Promise<LeadRecord[]> {
    try {
      const list = await pb.collection('leads').getList<LeadRecord>(1, 50, {
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
      return list.items
    } catch (e) {
      console.warn('Failed to load leads', e)
      return []
    }
  },

  async createLead(tenantId: string, data: Partial<LeadRecord>): Promise<LeadRecord> {
    return await pb.collection('leads').create<LeadRecord>({
      tenant_id: tenantId,
      name: data.name || 'Novo Lead',
      score: 85,
      temperature: 'hot',
      status: 'Novo Lead',
      source: 'Meta Ads',
      channel: 'Meta Ads',
      ...data,
    })
  },

  async getOpportunities(tenantId: string): Promise<OpportunityRecord[]> {
    try {
      const list = await pb.collection('opportunities').getList<OpportunityRecord>(1, 50, {
        filter: `tenant_id = "${tenantId}"`,
        sort: '-created',
      })
      return list.items
    } catch (e) {
      console.warn('Failed to load opportunities', e)
      return []
    }
  },

  async createOpportunity(
    tenantId: string,
    data: Partial<OpportunityRecord>,
  ): Promise<OpportunityRecord> {
    return await pb.collection('opportunities').create<OpportunityRecord>({
      tenant_id: tenantId,
      title: data.title || 'Nova Oportunidade',
      value: data.value || 10000,
      currency: 'BRL',
      status: 'open',
      ...data,
    })
  },

  async updateOpportunityStatus(
    id: string,
    status: 'open' | 'won' | 'lost' | 'archived',
  ): Promise<OpportunityRecord> {
    return await pb.collection('opportunities').update<OpportunityRecord>(id, {
      status,
      closed_at: status === 'won' ? new Date().toISOString() : undefined,
    })
  },
}
