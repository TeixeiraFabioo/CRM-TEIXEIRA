import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Activity,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  RefreshCw,
  Info,
  Laptop,
  Globe,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { AuditLogRecord, SessionLogRecord } from '@/types/platform'

export function AuditLogPage() {
  const { tenant, user } = useTenant()
  const { toast } = useToast()

  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [sessionLogs, setSessionLogs] = useState<SessionLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  const loadLogs = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [auditRes, sessRes] = await Promise.all([
        CrmService.getAuditLogs(tenant.id, {
          limit: 100,
          action: actionFilter,
          period: periodFilter,
        }),
        CrmService.getSessionLogs(tenant.id, 100),
      ])
      setLogs(auditRes.items)
      setSessionLogs(sessRes.items || [])
    } catch (e: any) {
      toast({
        title: 'Erro ao carregar registros de auditoria e sessões',
        description: e?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [tenant?.id, actionFilter, periodFilter])

  // Helper to summarize user agent
  const formatUserAgent = (ua?: string) => {
    if (!ua) return 'Navegador Padrão'
    if (ua.includes('Windows')) {
      if (ua.includes('Chrome')) return 'Chrome / Windows'
      if (ua.includes('Firefox')) return 'Firefox / Windows'
      if (ua.includes('Edg')) return 'Edge / Windows'
      return 'Windows'
    }
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) {
      if (ua.includes('Chrome')) return 'Chrome / macOS'
      if (ua.includes('Safari')) return 'Safari / macOS'
      if (ua.includes('Firefox')) return 'Firefox / macOS'
      return 'macOS'
    }
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'Safari / iOS'
    if (ua.includes('Android')) return 'Chrome / Android'
    if (ua.includes('Linux')) return 'Linux'
    return ua.slice(0, 45) + (ua.length > 45 ? '...' : '')
  }

  // Filtragem local por busca
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const actionMatch = (log.action || '').toLowerCase().includes(term)
    const resourceTypeMatch = (log.resource_type || '').toLowerCase().includes(term)
    const resourceIdMatch = (log.resource_id || '').toLowerCase().includes(term)
    const userNameMatch = (log.expand?.user_id?.name || '').toLowerCase().includes(term)
    const userEmailMatch = (log.expand?.user_id?.email || '').toLowerCase().includes(term)
    return actionMatch || resourceTypeMatch || resourceIdMatch || userNameMatch || userEmailMatch
  })

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase()
    if (act.includes('create') || act.includes('criou') || act.includes('distribut')) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-mono">
          {action}
        </Badge>
      )
    }
    if (
      act.includes('update') ||
      act.includes('edit') ||
      act.includes('atualiz') ||
      act.includes('alter')
    ) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] uppercase font-mono">
          {action}
        </Badge>
      )
    }
    if (act.includes('delete') || act.includes('remov') || act.includes('exclui')) {
      return (
        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] uppercase font-mono">
          {action}
        </Badge>
      )
    }
    if (act.includes('export') || act.includes('login') || act.includes('auth')) {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] uppercase font-mono">
          {action}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-[10px] uppercase font-mono">
        {action}
      </Badge>
    )
  }

  const formatJson = (val: any) => {
    if (!val) return '—'
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val)
      } catch (_) {
        return val
      }
    }
    return JSON.stringify(val, null, 2)
  }

  // Se não for admin, exibe tela de acesso restrito
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold font-legal-serif">Acesso Restrito ao Administrador</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A trilha de auditoria e conformidade LGPD é exclusiva para usuários com perfil de
            Administrador do escritório.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Trilha de Auditoria
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Últimas 100 entradas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro imutável de conformidade, segurança, alterações de dados e distribuição do
            escritório.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="audit" className="w-full space-y-4">
        <TabsList className="bg-card border p-1 rounded-xl">
          <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Trilha de Ações ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs font-semibold gap-1.5">
            <Key className="h-3.5 w-3.5" /> Sessões &amp; Logins ({sessionLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AUDITORIA DE AÇÕES */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por usuário, ação ou recurso..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Action Filter */}
              <div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tipo de Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="create">Criação (create / distribute)</SelectItem>
                    <SelectItem value="update">Atualização / Edição</SelectItem>
                    <SelectItem value="delete">Exclusão</SelectItem>
                    <SelectItem value="export">Exportação</SelectItem>
                    <SelectItem value="lead">Ações de Leads</SelectItem>
                    <SelectItem value="user">Ações de Usuários</SelectItem>
                    <SelectItem value="settings">Configurações</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Filter */}
              <div>
                <Select value={periodFilter} onValueChange={(val: any) => setPeriodFilter(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o Histórico</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-4">Data / Hora</th>
                    <th className="p-3.5">Usuário Responsável</th>
                    <th className="p-3.5">Ação Executada</th>
                    <th className="p-3.5">Registro Afetado</th>
                    <th className="p-3.5">Detalhes da Alteração</th>
                    <th className="p-3.5 pr-4 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Carregando trilha de auditoria...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-muted/40 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedLog(log)
                            setDetailModalOpen(true)
                          }}
                        >
                          {/* Data / Hora */}
                          <td className="p-3.5 pl-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>
                                {log.created
                                  ? new Date(log.created).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })
                                  : '—'}
                              </span>
                            </div>
                          </td>

                          {/* Usuário */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {log.expand?.user_id?.name
                                  ? log.expand.user_id.name.charAt(0).toUpperCase()
                                  : 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {log.expand?.user_id?.name || 'Sistema / Automático'}
                                </div>
                                {log.expand?.user_id?.email && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {log.expand.user_id.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Ação */}
                          <td className="p-3.5">{getActionBadge(log.action)}</td>

                          {/* Registro Afetado */}
                          <td className="p-3.5">
                            <div className="font-medium text-foreground capitalize">
                              {log.resource_type || 'Geral'}
                            </div>
                            {log.resource_id && (
                              <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                                ID: {log.resource_id}
                              </div>
                            )}
                          </td>

                          {/* Detalhes (Antes -> Depois) */}
                          <td className="p-3.5 max-w-xs">
                            {log.old_value && log.new_value ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="truncate max-w-[120px] text-muted-foreground line-through">
                                  {typeof log.old_value === 'object'
                                    ? JSON.stringify(log.old_value)
                                    : String(log.old_value)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate max-w-[140px] font-medium text-foreground">
                                  {typeof log.new_value === 'object'
                                    ? JSON.stringify(log.new_value)
                                    : String(log.new_value)}
                                </span>
                              </div>
                            ) : log.new_value ? (
                              <div className="truncate max-w-[200px] text-foreground text-[11px] font-mono">
                                {typeof log.new_value === 'object'
                                  ? JSON.stringify(log.new_value)
                                  : String(log.new_value)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">
                                Sem payload registrado
                              </span>
                            )}
                          </td>

                          {/* Botão Ver Detalhes */}
                          <td className="p-3.5 pr-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary group-hover:underline"
                            >
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: SESSÕES & LOGINS */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={sessionSearchTerm}
                onChange={(e) => setSessionSearchTerm(e.target.value)}
                placeholder="Buscar sessões por usuário, IP ou dispositivo..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-4">Usuário</th>
                    <th className="p-3.5">Endereço IP</th>
                    <th className="p-3.5">Dispositivo / Navegador</th>
                    <th className="p-3.5">User Agent Completo</th>
                    <th className="p-3.5 pr-4 text-right">Data / Hora do Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Carregando histórico de sessões...
                      </td>
                    </tr>
                  ) : sessionLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        Nenhuma sessão ou login registrado recentemente.
                      </td>
                    </tr>
                  ) : (
                    sessionLogs
                      .filter((s) => {
                        if (!sessionSearchTerm) return true
                        const term = sessionSearchTerm.toLowerCase()
                        const userName = (s.expand?.user_id?.name || '').toLowerCase()
                        const userEmail = (s.expand?.user_id?.email || '').toLowerCase()
                        const ip = (s.ip || '').toLowerCase()
                        const ua = (s.user_agent || '').toLowerCase()
                        return (
                          userName.includes(term) ||
                          userEmail.includes(term) ||
                          ip.includes(term) ||
                          ua.includes(term)
                        )
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                          {/* Usuário */}
                          <td className="p-3.5 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {s.expand?.user_id?.name
                                  ? s.expand.user_id.name.charAt(0).toUpperCase()
                                  : 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {s.expand?.user_id?.name || 'Usuário Autenticado'}
                                </div>
                                {s.expand?.user_id?.email && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {s.expand.user_id.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* IP */}
                          <td className="p-3.5 font-mono text-[11px]">
                            {s.ip ? (
                              <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
                                {s.ip}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Direto (Frontend Web)
                              </span>
                            )}
                          </td>

                          {/* Dispositivo / Navegador */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Laptop className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{formatUserAgent(s.user_agent)}</span>
                            </div>
                          </td>

                          {/* User Agent Completo */}
                          <td
                            className="p-3.5 text-muted-foreground max-w-xs truncate text-[10px] font-mono"
                            title={s.user_agent || ''}
                          >
                            {s.user_agent || '—'}
                          </td>

                          {/* Data/Hora */}
                          <td className="p-3.5 pr-4 text-right whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {s.created ? new Date(s.created).toLocaleString('pt-BR') : '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* DETALHE AUDITORIA MODAL */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Detalhes do Evento de Auditoria
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Data e Hora:</span>
                  <span className="font-mono font-medium">
                    {selectedLog.created
                      ? new Date(selectedLog.created).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Usuário Executor:</span>
                  <span className="font-semibold">
                    {selectedLog.expand?.user_id?.name || 'Sistema / Backend Hook'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tipo de Ação:</span>
                  <span className="font-mono">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Recurso / ID:</span>
                  <span className="font-mono">
                    {selectedLog.resource_type || '—'}{' '}
                    {selectedLog.resource_id ? `(${selectedLog.resource_id})` : ''}
                  </span>
                </div>
                {selectedLog.ip_address && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Endereço IP:</span>
                    <span className="font-mono">{selectedLog.ip_address}</span>
                  </div>
                )}
              </div>

              {selectedLog.old_value && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 block text-[11px]">
                    Valor Anterior (Antes):
                  </span>
                  <pre className="p-3 bg-muted/60 rounded-lg border font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                    {formatJson(selectedLog.old_value)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-[11px]">
                    Novo Valor (Depois):
                  </span>
                  <pre className="p-3 bg-muted/60 rounded-lg border font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                    {formatJson(selectedLog.new_value)}
                  </pre>
                </div>
              )}

              <div className="p-2.5 bg-muted/20 rounded border text-[11px] text-muted-foreground flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Este registro foi gerado automaticamente pelo sistema de governança do
                  Teixeira&apos;sHub.
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AuditLogPage
