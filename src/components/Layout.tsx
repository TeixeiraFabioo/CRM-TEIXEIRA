import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Target,
  Share2,
  ShieldCheck,
  Building2,
  Activity,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel, useMetaPixelRouteTracker } from '@/hooks/useMetaPixel'

export default function Layout() {
  const location = useLocation()
  const { tenant, pixelId } = useTenant()
  const { isReady, hasConsent, setConsent } = useMetaPixel()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Injetar rastreamento de PageView a cada mudança de rota
  useMetaPixelRouteTracker()

  const navItems = [
    { name: 'Visão Geral & Pixel', path: '/', icon: LayoutDashboard },
    { name: 'Central de Integrações', path: '/integrations', icon: Layers },
    { name: 'Leads & CRM', path: '/leads', icon: Users },
    { name: 'Oportunidades & Conversões', path: '/opportunities', icon: Target },
    { name: 'Configurações Tenant', path: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Bar with Tenant & Meta Pixel live indicator */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Abrir Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md">
                S
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight">SKIP</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  >
                    Inteligência Comercial
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                  {tenant?.name || 'SKIP Tecnologia Comercial'}
                </div>
              </div>
            </Link>
          </div>

          {/* Center Navigation for Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.path
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`h-9 px-3 gap-2 text-xs font-medium ${
                      active
                        ? 'bg-muted font-semibold text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-blue-500' : ''}`} />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Header Right: Pixel Status & Tenant Info */}
          <div className="flex items-center gap-2.5">
            {pixelId ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400">
                <Share2 className="h-3 w-3 animate-pulse" />
                <span className="hidden sm:inline">Meta Pixel:</span>
                <code className="font-mono font-semibold">{pixelId}</code>
              </div>
            ) : (
              <Link to="/settings">
                <Badge
                  variant="outline"
                  className="text-[11px] text-amber-600 dark:text-amber-400 border-amber-500/30"
                >
                  Pixel não configurado
                </Badge>
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border-l pl-2.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{tenant?.plan || 'Enterprise'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t bg-card px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-blue-500' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <Outlet />
      </main>

      {/* Footer & LGPD Banner */}
      <footer className="border-t bg-card/50 py-6 text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} SKIP Inteligência Comercial.</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> LGPD Ativa
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>Meta Ads Conversions API &amp; Web SDK</span>
            <span>•</span>
            <span>Tenant: {tenant?.slug || 'skip-enterprise'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
