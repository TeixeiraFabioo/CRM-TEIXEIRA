/**
 * Meta Pixel (Facebook Pixel) Official Implementation & Tracker
 * SKIP Commercial Intelligence Platform
 */

declare global {
  interface Window {
    fbq?: {
      (...args: unknown[]): void
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      push?: (...args: unknown[]) => void
      loaded?: boolean
      version?: string
    }
    _fbq?: unknown
    __meta_pixel_events_log?: MetaPixelLogEntry[]
  }
}

export interface MetaPixelLogEntry {
  id: string
  timestamp: string
  type: 'track' | 'trackCustom' | 'init' | 'consent'
  eventName: string
  pixelId?: string
  params?: Record<string, unknown>
  status: 'sent' | 'blocked_by_consent' | 'no_pixel_id'
}

export interface MetaPixelEventPayload {
  content_name?: string
  content_category?: string
  content_ids?: string[]
  contents?: Array<{ id: string; quantity: number; item_price?: number }>
  currency?: string
  value?: number
  lead_id?: string
  opportunity_id?: string
  channel?: string
  source?: string
  status?: string
  [key: string]: unknown
}

const META_PIXEL_SCRIPT_ID = 'skip-meta-pixel-script'
const META_PIXEL_NOSCRIPT_ID = 'skip-meta-pixel-noscript'
const LGPD_CONSENT_KEY = 'skip_lgpd_pixel_consent'

class MetaPixelManager {
  private currentPixelId: string | null = null
  private isInitialized = false
  private eventLogs: MetaPixelLogEntry[] = []
  private listeners: Array<() => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.__meta_pixel_events_log = this.eventLogs
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.__meta_pixel_events_log = [...this.eventLogs]
    }
    this.listeners.forEach((listener) => listener())
  }

  public getLogs(): MetaPixelLogEntry[] {
    return [...this.eventLogs]
  }

  public clearLogs() {
    this.eventLogs = []
    this.notify()
  }

  /**
   * Check LGPD consent in localStorage (defaults to true if consent mode not explicitly rejected)
   */
  public hasConsent(): boolean {
    if (typeof window === 'undefined') return false
    const consent = localStorage.getItem(LGPD_CONSENT_KEY)
    if (consent === null) return true // Default opt-in or accepted for platform
    return consent === 'granted'
  }

  public setConsent(granted: boolean) {
    if (typeof window === 'undefined') return
    localStorage.setItem(LGPD_CONSENT_KEY, granted ? 'granted' : 'revoked')

    if (window.fbq) {
      if (granted) {
        window.fbq('consent', 'grant')
      } else {
        window.fbq('consent', 'revoke')
      }
    }

    this.logEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'consent',
      eventName: granted ? 'grant' : 'revoke',
      pixelId: this.currentPixelId || undefined,
      params: { granted },
      status: 'sent',
    })
  }

  /**
   * Official Meta Pixel Base Script Injection in <head>
   */
  public inject(pixelId: string) {
    if (typeof window === 'undefined' || !pixelId) return

    const sanitizedPixelId = pixelId.trim()
    if (!sanitizedPixelId) return

    // If already initialized with this exact pixel ID, avoid reloading
    if (this.currentPixelId === sanitizedPixelId && this.isInitialized && window.fbq) {
      return
    }

    this.currentPixelId = sanitizedPixelId

    // 1. Initialize the fbq stub if not already present
    if (!window.fbq) {
      /* eslint-disable */
      const fbq: any = function () {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, arguments)
        } else {
          fbq.queue.push(arguments)
        }
      }
      if (!window._fbq) window._fbq = fbq
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      window.fbq = fbq
      /* eslint-enable */
    }

    // 2. Remove any old script tags
    const existingScript = document.getElementById(META_PIXEL_SCRIPT_ID)
    if (existingScript) {
      existingScript.remove()
    }
    const existingNoScript = document.getElementById(META_PIXEL_NOSCRIPT_ID)
    if (existingNoScript) {
      existingNoScript.remove()
    }

    // 3. Inject the official fbevents.js script tag into <head>
    const script = document.createElement('script')
    script.id = META_PIXEL_SCRIPT_ID
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)

    // 4. Inject noscript fallback (only in production to avoid failed requests / html-to-image preview capture issues in dev/preview)
    if (import.meta.env.PROD) {
      const noscript = document.createElement('noscript')
      noscript.id = META_PIXEL_NOSCRIPT_ID
      const img = document.createElement('img')
      img.height = 1
      img.width = 1
      img.style.display = 'none'
      img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(sanitizedPixelId)}&ev=PageView&noscript=1`
      noscript.appendChild(img)
      document.body.appendChild(noscript)
    }

    // 5. Apply LGPD consent rule
    const consent = this.hasConsent()
    if (window.fbq) {
      if (!consent) {
        window.fbq('consent', 'revoke')
      }

      // 6. fbq('init', PIXEL_ID)
      window.fbq('init', sanitizedPixelId)
      this.isInitialized = true

      this.logEvent({
        id: `evt-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'init',
        eventName: 'init',
        pixelId: sanitizedPixelId,
        params: { consentGranted: consent },
        status: 'sent',
      })
    }
  }

  public remove() {
    if (typeof window === 'undefined') return
    const script = document.getElementById(META_PIXEL_SCRIPT_ID)
    if (script) script.remove()
    const noscript = document.getElementById(META_PIXEL_NOSCRIPT_ID)
    if (noscript) noscript.remove()
    this.currentPixelId = null
    this.isInitialized = false
  }

  public trackPageView(url?: string, title?: string) {
    return this.trackStandardEvent('PageView', {
      page_path: url || (typeof window !== 'undefined' ? window.location.pathname : ''),
      page_title: title || (typeof window !== 'undefined' ? document.title : ''),
    })
  }

  public trackStandardEvent(
    eventName:
      | 'PageView'
      | 'Lead'
      | 'CompleteRegistration'
      | 'Contact'
      | 'SubmitApplication'
      | 'Purchase'
      | 'ViewContent'
      | 'InitiateCheckout'
      | 'Search',
    payload?: MetaPixelEventPayload,
  ) {
    const entryId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    if (!this.currentPixelId) {
      this.logEvent({
        id: entryId,
        timestamp: new Date().toISOString(),
        type: 'track',
        eventName,
        params: payload,
        status: 'no_pixel_id',
      })
      return false
    }

    if (!this.hasConsent()) {
      this.logEvent({
        id: entryId,
        timestamp: new Date().toISOString(),
        type: 'track',
        eventName,
        pixelId: this.currentPixelId,
        params: payload,
        status: 'blocked_by_consent',
      })
      return false
    }

    if (window.fbq) {
      if (payload && Object.keys(payload).length > 0) {
        window.fbq('track', eventName, payload)
      } else {
        window.fbq('track', eventName)
      }
    }

    this.logEvent({
      id: entryId,
      timestamp: new Date().toISOString(),
      type: 'track',
      eventName,
      pixelId: this.currentPixelId,
      params: payload,
      status: 'sent',
    })

    return true
  }

  public trackCustomEvent(eventName: string, payload?: Record<string, unknown>) {
    const entryId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    if (!this.currentPixelId) {
      this.logEvent({
        id: entryId,
        timestamp: new Date().toISOString(),
        type: 'trackCustom',
        eventName,
        params: payload,
        status: 'no_pixel_id',
      })
      return false
    }

    if (!this.hasConsent()) {
      this.logEvent({
        id: entryId,
        timestamp: new Date().toISOString(),
        type: 'trackCustom',
        eventName,
        pixelId: this.currentPixelId,
        params: payload,
        status: 'blocked_by_consent',
      })
      return false
    }

    if (window.fbq) {
      if (payload && Object.keys(payload).length > 0) {
        window.fbq('trackCustom', eventName, payload)
      } else {
        window.fbq('trackCustom', eventName)
      }
    }

    this.logEvent({
      id: entryId,
      timestamp: new Date().toISOString(),
      type: 'trackCustom',
      eventName,
      pixelId: this.currentPixelId,
      params: payload,
      status: 'sent',
    })

    return true
  }

  public testPixel(testCode: string = 'TEST_' + Math.floor(10000 + Math.random() * 90000)) {
    const payload = {
      test_code: testCode,
      platform: 'SKIP Plataforma de Inteligência Comercial',
      timestamp: new Date().toISOString(),
      source: 'Admin Settings Diagnostics',
      version: '2.5.0',
    }

    const success = this.trackCustomEvent('test_event', payload)
    return {
      success,
      testCode,
      pixelId: this.currentPixelId,
      timestamp: payload.timestamp,
    }
  }

  public getCurrentPixelId(): string | null {
    return this.currentPixelId
  }

  public isReady(): boolean {
    return !!(
      this.currentPixelId &&
      this.isInitialized &&
      typeof window !== 'undefined' &&
      window.fbq
    )
  }

  private logEvent(entry: MetaPixelLogEntry) {
    this.eventLogs.unshift(entry)
    if (this.eventLogs.length > 100) {
      this.eventLogs.pop()
    }
    this.notify()
  }
}

export const metaPixel = new MetaPixelManager()
export default metaPixel
