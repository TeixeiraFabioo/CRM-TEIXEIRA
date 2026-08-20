import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { metaPixel, MetaPixelEventPayload, MetaPixelLogEntry } from '@/lib/metaPixel'

export interface UseMetaPixelReturn {
  pixelId: string | null
  isReady: boolean
  hasConsent: boolean
  setConsent: (granted: boolean) => void
  trackPageView: (url?: string, title?: string) => boolean
  trackLead: (data?: MetaPixelEventPayload) => boolean
  trackCompleteRegistration: (data?: MetaPixelEventPayload) => boolean
  trackContact: (data?: MetaPixelEventPayload) => boolean
  trackSubmitApplication: (data?: MetaPixelEventPayload) => boolean
  trackPurchase: (value: number, currency?: string, data?: MetaPixelEventPayload) => boolean
  trackCustom: (eventName: string, data?: Record<string, unknown>) => boolean
  testPixel: (testCode?: string) => {
    success: boolean
    testCode: string
    pixelId: string | null
    timestamp: string
  }
  logs: MetaPixelLogEntry[]
  clearLogs: () => void
}

export function useMetaPixel(): UseMetaPixelReturn {
  const [logs, setLogs] = useState<MetaPixelLogEntry[]>(() => metaPixel.getLogs())
  const [hasConsent, setHasConsentState] = useState<boolean>(() => metaPixel.hasConsent())
  const [pixelId, setPixelId] = useState<string | null>(() => metaPixel.getCurrentPixelId())
  const [isReady, setIsReady] = useState<boolean>(() => metaPixel.isReady())

  useEffect(() => {
    const unsubscribe = metaPixel.subscribe(() => {
      setLogs(metaPixel.getLogs())
      setHasConsentState(metaPixel.hasConsent())
      setPixelId(metaPixel.getCurrentPixelId())
      setIsReady(metaPixel.isReady())
    })
    return () => unsubscribe()
  }, [])

  const setConsent = useCallback((granted: boolean) => {
    metaPixel.setConsent(granted)
    setHasConsentState(granted)
  }, [])

  const trackPageView = useCallback((url?: string, title?: string) => {
    return metaPixel.trackPageView(url, title)
  }, [])

  const trackLead = useCallback((data?: MetaPixelEventPayload) => {
    return metaPixel.trackStandardEvent('Lead', {
      content_name: 'Lead Qualificado SKIP',
      content_category: 'Commercial Intelligence',
      currency: 'BRL',
      ...data,
    })
  }, [])

  const trackCompleteRegistration = useCallback((data?: MetaPixelEventPayload) => {
    return metaPixel.trackStandardEvent('CompleteRegistration', {
      content_name: 'Cadastro de Usuário Plataforma SKIP',
      status: 'active',
      ...data,
    })
  }, [])

  const trackContact = useCallback((data?: MetaPixelEventPayload) => {
    return metaPixel.trackStandardEvent('Contact', {
      content_name: 'Contato Comercial Iniciado',
      ...data,
    })
  }, [])

  const trackSubmitApplication = useCallback((data?: MetaPixelEventPayload) => {
    return metaPixel.trackStandardEvent('SubmitApplication', {
      content_name: 'Proposta Comercial Enviada',
      ...data,
    })
  }, [])

  const trackPurchase = useCallback(
    (value: number, currency: string = 'BRL', data?: MetaPixelEventPayload) => {
      return metaPixel.trackStandardEvent('Purchase', {
        value,
        currency,
        content_name: 'Oportunidade Fechada / Venda',
        ...data,
      })
    },
    [],
  )

  const trackCustom = useCallback((eventName: string, data?: Record<string, unknown>) => {
    return metaPixel.trackCustomEvent(eventName, data)
  }, [])

  const testPixel = useCallback((testCode?: string) => {
    return metaPixel.testPixel(testCode)
  }, [])

  const clearLogs = useCallback(() => {
    metaPixel.clearLogs()
  }, [])

  return {
    pixelId,
    isReady,
    hasConsent,
    setConsent,
    trackPageView,
    trackLead,
    trackCompleteRegistration,
    trackContact,
    trackSubmitApplication,
    trackPurchase,
    trackCustom,
    testPixel,
    logs,
    clearLogs,
  }
}

/**
 * Route-change PageView Auto-Tracker Hook
 */
export function useMetaPixelRouteTracker() {
  const location = useLocation()
  const { trackPageView, pixelId } = useMetaPixel()

  useEffect(() => {
    if (pixelId) {
      // Delay slightly so document.title updates
      const timer = setTimeout(() => {
        trackPageView(location.pathname + location.search, document.title)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, location.search, pixelId, trackPageView])
}
