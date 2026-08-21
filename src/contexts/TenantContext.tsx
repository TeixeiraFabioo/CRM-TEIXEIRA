import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { TenantRecord, UserRecord } from '@/types/platform'
import { TenantService } from '@/services/tenant'
import { metaPixel } from '@/lib/metaPixel'
import pb from '@/lib/pocketbase/client'

interface TenantContextType {
  tenant: TenantRecord | null
  user: UserRecord | null
  isAuthenticated: boolean
  isLoading: boolean
  pixelId: string
  login: (email: string, pass: string) => Promise<void>
  register: (params: {
    officeName: string
    name: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => void
  updatePixelId: (newPixelId: string) => Promise<void>
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantRecord | null>(null)
  const [user, setUser] = useState<UserRecord | null>(() => {
    return (pb.authStore.record as unknown as UserRecord) || null
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => pb.authStore.isValid)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadTenantAndUser = useCallback(async () => {
    setIsLoading(true)
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const authUser = pb.authStore.record as unknown as UserRecord
        setUser(authUser)
        setIsAuthenticated(true)

        // If user has a tenant_id, load it. Otherwise load default tenant or first tenant
        if (authUser.tenant_id) {
          try {
            const t = await TenantService.getTenant(authUser.tenant_id)
            setTenant(t)
            const activePixelId = t.meta_pixel_id || t.settings?.meta_pixel_id || ''
            if (activePixelId) {
              metaPixel.inject(activePixelId)
            } else {
              metaPixel.remove()
            }
          } catch (err) {
            console.warn('Failed to load user tenant, fetching fallback default', err)
            const defaultTenant = await TenantService.getDefaultTenant()
            setTenant(defaultTenant)
          }
        } else {
          const defaultTenant = await TenantService.getDefaultTenant()
          setTenant(defaultTenant)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setTenant(null)
        metaPixel.remove()
      }
    } catch (error) {
      console.error('Error loading tenant context:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTenantAndUser()

    // Listen to PocketBase authStore changes
    const unsubscribe = pb.authStore.onChange((token, record) => {
      const isValid = pb.authStore.isValid && !!record
      setIsAuthenticated(isValid)
      setUser((record as unknown as UserRecord) || null)

      if (isValid && record?.tenant_id) {
        TenantService.getTenant(record.tenant_id)
          .then((t) => {
            setTenant(t)
            const activePixel = t.meta_pixel_id || t.settings?.meta_pixel_id || ''
            if (activePixel) metaPixel.inject(activePixel)
            else metaPixel.remove()
          })
          .catch(() => {
            TenantService.getDefaultTenant().then(setTenant)
          })
      } else if (!isValid) {
        setTenant(null)
        metaPixel.remove()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [loadTenantAndUser])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email.trim(), pass)
    const authUser = authData.record as unknown as UserRecord
    setUser(authUser)
    setIsAuthenticated(true)

    if (authUser.tenant_id) {
      try {
        const t = await TenantService.getTenant(authUser.tenant_id)
        setTenant(t)
        const activePixel = t.meta_pixel_id || t.settings?.meta_pixel_id || ''
        if (activePixel) metaPixel.inject(activePixel)
      } catch {
        const t = await TenantService.getDefaultTenant()
        setTenant(t)
      }
    }
  }

  const register = async ({
    officeName,
    name,
    email,
    password,
  }: {
    officeName: string
    name: string
    email: string
    password: string
  }) => {
    // 1. Generate slug
    const cleanOffice = officeName.trim()
    const slug =
      cleanOffice
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 7)

    // 2. Create tenant
    const createdTenant = await pb.collection('tenants').create<TenantRecord>({
      name: cleanOffice,
      slug,
      plan: 'pro',
      status: 'active',
      settings: {
        currency: 'BRL',
        language: 'pt-BR',
        notifications: { email: true, push: true, weekly_digest: true },
        primaryColor: '#0A1F3F',
        theme: 'dark',
        timezone: 'America/Sao_Paulo',
      },
    })

    // 3. Create role for admin
    let roleId = ''
    try {
      const roleRec = await pb.collection('roles').create({
        name: 'Administrador',
        description: 'Acesso total a todos os módulos e configurações',
        tenant_id: createdTenant.id,
        is_default: true,
      })
      roleId = roleRec.id
    } catch (e) {
      console.warn('Could not create role for tenant', e)
    }

    // 4. Create user record
    await pb.collection('users').create({
      email: email.trim(),
      password,
      passwordConfirm: password,
      name: name.trim(),
      role: 'admin',
      role_id: roleId || undefined,
      tenant_id: createdTenant.id,
      status: 'active',
      verified: true,
      settings: { dark_mode: true, language: 'pt-BR' },
    })

    // 5. Authenticate user
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    const authUser = authData.record as unknown as UserRecord
    setUser(authUser)
    setIsAuthenticated(true)
    setTenant(createdTenant)

    // 6. Create default pipeline and stages for the new tenant so CRM is immediately functional
    try {
      const pipeline = await pb.collection('pipelines').create({
        tenant_id: createdTenant.id,
        name: 'Pipeline Comercial Principal',
        description: 'Fluxo padrão de aquisição e fechamento jurídico',
        is_default: true,
        order: 1,
      })

      const defaultStages = [
        { name: 'Novo Lead', order: 1, probability: 10, color: '#94a3b8' },
        { name: 'Qualificação IA', order: 2, probability: 30, color: '#60a5fa' },
        { name: 'Reunião / Demo', order: 3, probability: 50, color: '#a855f7' },
        { name: 'Proposta Enviada', order: 4, probability: 75, color: '#f59e0b' },
        { name: 'Negociação / Contrato', order: 5, probability: 90, color: '#3b82f6' },
        { name: 'Ganho / Fechado', order: 6, probability: 100, color: '#10b981' },
      ]

      for (const stg of defaultStages) {
        await pb.collection('pipeline_stages').create({
          pipeline_id: pipeline.id,
          name: stg.name,
          order: stg.order,
          probability: stg.probability,
          color: stg.color,
        })
      }

      // Seed standard services
      const servicesData = [
        {
          nome: 'Recuperação Tributária e Teses Fiscais',
          categoria: 'Consultoria',
          area: 'Direito Tributário',
          valor_padrao: 25000,
        },
        {
          nome: 'Planejamento Tributário Estruturado',
          categoria: 'Consultoria',
          area: 'Direito Tributário',
          valor_padrao: 18000,
        },
        {
          nome: 'Revisão de Contratos Bancários e Juros Abusivos',
          categoria: 'Contencioso',
          area: 'Direito Bancário',
          valor_padrao: 12000,
        },
        {
          nome: 'Auditoria e Compliance Trabalhista B2B',
          categoria: 'Consultoria',
          area: 'Direito Trabalhista',
          valor_padrao: 15000,
        },
      ]

      for (const srv of servicesData) {
        await pb.collection('services').create({
          tenant_id: createdTenant.id,
          nome: srv.nome,
          categoria: srv.categoria,
          area: srv.area,
          valor_padrao: srv.valor_padrao,
          status: 'ativo',
        })
      }

      // Seed standard tags
      const tagsData = [
        { nome: 'VIP', cor: '#e11d48', modulo: 'leads' },
        { nome: 'Urgente', cor: '#dc2626', modulo: 'tarefas' },
        { nome: 'Decisor', cor: '#2563eb', modulo: 'pessoas' },
        { nome: 'Contrato Ativo', cor: '#16a34a', modulo: 'clientes' },
      ]

      for (const tg of tagsData) {
        await pb.collection('tags').create({
          tenant_id: createdTenant.id,
          nome: tg.nome,
          cor: tg.cor,
          modulo: tg.modulo,
        })
      }
    } catch (seedErr) {
      console.warn('Initial tenant seeding warning:', seedErr)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setIsAuthenticated(false)
    setTenant(null)
    metaPixel.remove()
  }

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
    await loadTenantAndUser()
  }

  const pixelId = tenant?.meta_pixel_id || tenant?.settings?.meta_pixel_id || ''

  return (
    <TenantContext.Provider
      value={{
        tenant,
        user,
        isAuthenticated,
        isLoading,
        pixelId,
        login,
        register,
        logout,
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
