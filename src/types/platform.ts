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
  tenant_id: string
  status: 'active' | 'inactive' | 'invited'
  avatar?: string
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
    [key: string]: unknown
  }
  status: 'connected' | 'disconnected' | 'error'
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
  country?: string
  source?: string
  channel?: string
  campaign?: string
  ad_set?: string
  ad?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  product?: string
  service?: string
  assigned_to?: string
  score?: number
  temperature?: 'hot' | 'warm' | 'cold'
  status?: string
  potential_value?: number
  created?: string
  updated?: string
}

export interface OpportunityRecord {
  id: string
  tenant_id: string
  title: string
  value?: number
  currency?: string
  status?: 'open' | 'won' | 'lost' | 'archived'
  lead_id?: string
  pipeline_id?: string
  stage_id?: string
  assigned_to?: string
  loss_reason?: string
  created?: string
}
