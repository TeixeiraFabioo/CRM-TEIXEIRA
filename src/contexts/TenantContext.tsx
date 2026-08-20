import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { TenantRecord, UserRecord } from '@/types/platform'
import { TenantService } from '@/services/tenant'
import { metaPixel } from '@/lib/metaPixel'

interface TenantContextType {
  tenant: TenantRecord | null
  user: UserRecord | null
  isLoading: boolean
  pixelId: string
  updatePixelId: (newPixelId: string) => Promise<void>
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const DEFAULT_USER: UserRecord = {
  id: 'j4jhvhrh9flxvsc',
  name: 'Fabio Santos',
  email: 'fabio.saantost@gmail.com',
  role: 'admin',
  tenant_id: 'jg95y0vbaums0ql',
  status: 'active',
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantRecord | null>(null)
  const [user, setUser] = useState<UserRecord | null>(DEFAULT_USER)
  const [isLoading, setIsLoading] = useState(true)

  const loadTenantData = useCallback(async () => {
    try {
      setIsLoading(true)
      const tenantData = await TenantService.getDefaultTenant()
      setTenant(tenantData)

      // Injetar o Meta Pixel imediatamente conforme o tenant configurado
      const activePixelId = tenantData.meta_pixel_id || tenantData.settings?.meta_pixel_id || ''
      if (activePixelId) {
        metaPixel.inject(activePixelId)
      } else {
        metaPixel.remove()
      }
    } catch (error) {
      console.error('Error loading tenant context:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTenantData()
  }, [loadTenantData])

  const updatePixelId = async (newPixelId: string) => {
    if (!tenant) return
    const sanitized = newPixelId.trim()

    // Save to PocketBase database
    const updated = await TenantService.updateMetaPixelId(tenant.id, sanitized)
    setTenant(updated)

    // Synchronize script injection dynamically
    if (sanitized) {
      metaPixel.inject(sanitized)
    } else {
      metaPixel.remove()
    }
  }

  const refreshTenant = async () => {
    await loadTenantData()
  }

  const pixelId = tenant?.meta_pixel_id || tenant?.settings?.meta_pixel_id || ''

  return (
    <TenantContext.Provider
      value={{
        tenant,
        user,
        isLoading,
        pixelId,
        updatePixelId,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
