import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Kanban,
  Target,
  CheckSquare,
  FileText,
  FileCheck,
  Megaphone,
  BarChart3,
  Brain,
  FileSpreadsheet,
  Zap,
  TrendingUp,
  Award,
  DollarSign,
  Layers,
  Settings,
  Menu,
  X,
  Search,
  Scale,
  ShieldCheck,
  Share2,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel, useMetaPixelRouteTracker } from '@/hooks/useMetaPixel'
import { GlobalSearchModal } from './GlobalSearchModal'
import { NotificationsDropdown } from './NotificationsDropdown'
import { QuickActionMenu } from './QuickActionMenu'
import pb from '@/lib/pocketbase/client'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tenant, user, logout, pixelId } = useTenant()
  const { isReady } = useMetaPixel()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true
  })

  // Route tracker for Meta Pixel
  useMetaPixelRouteTracker()

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleDarkMode = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const navGroups = [
    {
      title: 'PRINCIPAL',
      items: [
        { name: 'Dashboard Executivo', path: '/', icon: LayoutDashboard },
        { name: 'Leads Jurídicos', path: '/leads', icon: Users, badge: 'Novos' },
        { name: 'Funil & Kanban', path: '/pipeline', icon: Kanban },
        { name: 'Clientes Contratados', path: '/clientes', icon: Briefcase },
      ],
    },
    {
      title: 'CADASTROS & CONTATOS',
      items: [
        { name: 'Pessoas & Decisores', path: '/pessoas', icon: UserCheck },
        { name: 'Empresas & Contas', path: '/empresas', icon: Building2 },
        { name: 'Oportunidades', path: '/opportunities', icon: Target },
        { name: 'Tarefas & Reuniões', path: '/tarefas', icon: CheckSquare },
      ],
    },
    {
      title: 'DOCUMENTOS & HONORÁRIOS',
      items: [
        { name: 'Propostas de Honorários', path: '/propostas', icon: FileText },
        { name: 'Contratos & Assinaturas', path: '/contratos', icon: FileCheck },
        { name: 'Comissões & Repasses', path: '/comissoes', icon: DollarSign },
        { name: 'Metas Comerciais', path: '/metas', icon: TrendingUp },
        { name: 'Ranking de Vendas', path: '/ranking', icon: Award },
      ],
    },
    {
      title: 'MARKETING & INTELIGÊNCIA',
      items: [
        { name: 'Campanhas de Tráfego', path: '/campanhas', icon: Megaphone },
        { name: 'Inteligência de Anúncios', path: '/marketing', icon: BarChart3 },
        { name: 'Inteligência Comercial IA', path: '/inteligencia', icon: Brain },
        { name: 'Base de Conhecimento', path: '/base-conhecimento', icon: BookOpen, badge: 'IA' },
        { name: 'Relatórios Executivos', path: '/relatorios', icon: FileSpreadsheet },
        { name: 'Automações & Regras', path: '/automacoes', icon: Zap },
      ],
    },
    {
      title: 'SISTEMA & INTEGRAÇÕES',
      items: [
        { name: 'Central de Integrações', path: '/integrations', icon: Layers },
        { name: 'Trilha de Auditoria', path: '/auditoria', icon: ShieldCheck },
        { name: 'Configurações do Escritório', path: '/settings', icon: Settings },
      ],
    },
  ]

  const currentUser = pb.authStore.record

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Global Search Dialog */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden xl:flex flex-col w-72 bg-[#0A1F3F] text-slate-100 border-r border-[#152e59] shrink-0 z-30 sticky top-0 h-screen">
        {/* Office Branding Header */}
        <div className="p-5 border-b border-[#152e59] bg-[#07162c]/60 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md">
              <Scale className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 tracking-wide font-legal-serif">
                TEIXEIRA &amp; NASCIMENTO
              </div>
              <div className="text-[10px] text-amber-400 font-medium tracking-widest uppercase">
                Advogados Associados
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation links scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-wider">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path))
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        active
                          ? 'bg-blue-600/90 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            active ? 'text-amber-300' : 'text-slate-400 group-hover:text-amber-400'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-300 border-amber-500/30"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-[#152e59] bg-[#07162c]/80 flex items-center justify-between gap-1">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/20 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate">
                {user?.name || 'Usuário'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || 'usuario@escritorio.adv.br'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Link to="/settings" title="Configurações">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              title="Sair do CRM"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between gap-3 shadow-xs">
          {/* Left: Mobile Toggle & Quick Search */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden h-9 w-9 text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs text-muted-foreground border border-border/80 transition-colors w-48 sm:w-72 justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">Pesquisar tudo no CRM...</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Controls: Meta Pixel, Notifications, Quick Actions, Theme */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Meta Pixel Badge */}
            {pixelId ? (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400">
                <Share2 className="h-3 w-3 animate-pulse" />
                <span>Pixel:</span>
                <span className="font-mono font-bold">{pixelId}</span>
              </div>
            ) : (
              <Link to="/settings" className="hidden md:block">
                <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-500/30">
                  Pixel não vinculado
                </Badge>
              </Link>
            )}

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Notifications Dropdown */}
            <NotificationsDropdown />

            {/* Quick Actions Dropdown */}
            <QuickActionMenu />

            {/* Logout Header Button */}
            <Button
              variant="ghost"
              size="icon"
              title="Encerrar Sessão"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex flex-col w-72 bg-[#0A1F3F] text-slate-100 h-full p-4 z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#152e59]">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-sm font-legal-serif">
                    TEIXEIRA &amp; NASCIMENTO
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <div className="text-[10px] font-bold text-slate-400 mb-1 px-2">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="h-4 w-4 text-amber-400" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY OUTLET */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="border-t bg-card/40 py-4 px-6 text-xs text-muted-foreground mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Teixeira &amp; Nascimento – Advogados
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Segurança &amp; LGPD Jurídica
              </span>
            </div>
            <div className="text-[11px]">CRM Jurídico Corporativo • Meta Conversions API Ativa</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
