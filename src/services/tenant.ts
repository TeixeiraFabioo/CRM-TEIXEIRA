import pb from '@/lib/pocketbase/client'
import { TenantRecord, UserRecord, IntegrationRecord } from '@/types/platform'

export const TenantService = {
  async getTenant(tenantId: string): Promise<TenantRecord> {
    const res = await pb.collection('tenants').getOne<TenantRecord>(tenantId)
    return res
  },

  async getDefaultTenant(): Promise<TenantRecord> {
    try {
      const records = await pb.collection('tenants').getList<TenantRecord>(1, 1, {
        sort: 'created',
      })
      if (records.items.length > 0) {
        return records.items[0]
      }
    } catch (e) {
      console.warn('Failed to fetch default tenant', e)
    }

    // Fallback default
    return {
      id: 'jg95y0vbaums0ql',
      name: 'SKIP Tecnologia Comercial',
      slug: 'skip-enterprise',
      plan: 'enterprise',
      status: 'active',
      meta_pixel_id: '98127391823',
      settings: {
        currency: 'BRL',
        language: 'pt-BR',
        meta_pixel_id: '98127391823',
        meta_pixel_active: true,
      },
    }
  },

  async updateMetaPixelId(tenantId: string, pixelId: string): Promise<TenantRecord> {
    const cleanId = pixelId.trim()

    // 1. Update tenant record
    const updatedTenant = await pb.collection('tenants').update<TenantRecord>(tenantId, {
      meta_pixel_id: cleanId,
      settings: {
        meta_pixel_id: cleanId,
        meta_pixel_active: !!cleanId,
      },
    })

    // 2. Sync with Meta Ads integration if present
    try {
      const integrations = await pb.collection('integrations').getList<IntegrationRecord>(1, 10, {
        filter: `tenant_id = "${tenantId}" && type = "meta_ads"`,
      })
      if (integrations.items.length > 0) {
        const metaIntegration = integrations.items[0]
        await pb.collection('integrations').update(metaIntegration.id, {
          config: {
            ...metaIntegration.config,
            pixel_id: cleanId,
          },
          status: cleanId ? 'connected' : 'disconnected',
        })
      } else if (cleanId) {
        // Create Meta Ads integration if not found
        await pb.collection('integrations').create({
          tenant_id: tenantId,
          type: 'meta_ads',
          name: 'Meta Ads & Conversions API',
          config: {
            pixel_id: cleanId,
            auto_sync_events: true,
          },
          status: 'connected',
        })
      }
    } catch (e) {
      console.warn('Could not sync integration record:', e)
    }

    return updatedTenant
  },

  async updateTenantSettings(tenantId: string, data: Partial<TenantRecord>): Promise<TenantRecord> {
    return await pb.collection('tenants').update<TenantRecord>(tenantId, data)
  },
}

export const IntegrationService = {
  async getIntegrations(tenantId: string): Promise<IntegrationRecord[]> {
    try {
      const list = await pb.collection('integrations').getList<IntegrationRecord>(1, 50, {
        filter: `tenant_id = "${tenantId}"`,
        sort: 'created',
      })
      return list.items
    } catch (e) {
      console.warn('Failed to load integrations', e)
      return []
    }
  },

  async updateIntegration(
    id: string,
    data: Partial<IntegrationRecord>,
  ): Promise<IntegrationRecord> {
    return await pb.collection('integrations').update<IntegrationRecord>(id, data)
  },

  async saveMetaPixelIntegration(tenantId: string, pixelId: string): Promise<IntegrationRecord> {
    const cleanId = pixelId.trim()
    const integrations = await pb.collection('integrations').getList<IntegrationRecord>(1, 10, {
      filter: `tenant_id = "${tenantId}" && type = "meta_ads"`,
    })

    let integration: IntegrationRecord
    if (integrations.items.length > 0) {
      integration = await pb
        .collection('integrations')
        .update<IntegrationRecord>(integrations.items[0].id, {
          config: {
            ...integrations.items[0].config,
            pixel_id: cleanId,
          },
          status: cleanId ? 'connected' : 'disconnected',
        })
    } else {
      integration = await pb.collection('integrations').create<IntegrationRecord>({
        tenant_id: tenantId,
        type: 'meta_ads',
        name: 'Meta Ads & Conversions API',
        config: {
          pixel_id: cleanId,
          auto_sync_events: true,
        },
        status: cleanId ? 'connected' : 'disconnected',
      })
    }

    // Also sync to Tenant
    try {
      await pb.collection('tenants').update(tenantId, {
        meta_pixel_id: cleanId,
      })
    } catch (e) {
      console.warn('Could not update tenant record from integration', e)
    }

    return integration
  },
}
