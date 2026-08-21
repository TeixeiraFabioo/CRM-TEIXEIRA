import React, { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  CheckCircle2,
  Clock,
  User,
  Plus,
  FileCheck,
  Percent,
  Calendar,
  AlertCircle,
  TrendingUp,
  Filter,
  RefreshCw,
  Search,
  Check,
  X,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { CommissionRecord, ContractRecord, UserRecord, OpportunityRecord } from '@/types/platform'

export function ComissoesPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [commissions, setCommissions] = useState<CommissionRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [periodFilter, setPeriodFilter] = useState<'current_month' | 'last_month' | 'all_time'>(
    'all_time',
  )
  const [userFilter, setUserFilter] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Manual Commission Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [newComm, setNewComm] = useState({
    usuario_id: '',
    contrato_id: '',
    tipo: 'percentual' as 'percentual' | 'valor_fixo',
    percentual: 10,
    valor: 0,
    status: 'pendente' as 'pendente' | 'aprovado' | 'pago',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [commList, contractList, oppList, userList] = await Promise.all([
        CrmService.getCommissions(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getUsers(tenant.id),
      ])

      // Auto-sync: generate commissions for any signed contract missing a commission
      const signedContracts = contractList.filter(
        (c) =>
          (c.status || '').toLowerCase() === 'assinado' ||
          (c.sign_status || '').toLowerCase() === 'signed',
      )

      const existingContratoIds = new Set(commList.map((c) => c.contrato_id).filter(Boolean))
      const missingSignedContracts = signedContracts.filter((c) => !existingContratoIds.has(c.id))

      if (missingSignedContracts.length > 0) {
        const oppMap = new Map<string, OpportunityRecord>()
        oppList.forEach((op) => oppMap.set(op.id, op))

        for (const mc of missingSignedContracts) {
          try {
            const contractVal = Number(mc.valor) || 0
            const defaultPercent = 10
            const commVal = contractVal > 0 ? (contractVal * defaultPercent) / 100 : 0

            // Find responsible user
            let targetUser = ''
            if (mc.oportunidade_id && oppMap.has(mc.oportunidade_id)) {
              const op = oppMap.get(mc.oportunidade_id)
              targetUser = op?.assigned_to || op?.responsavel_id || ''
            }
            if (!targetUser) {
              targetUser = userList[0]?.id || ''
            }

            if (targetUser) {
              const createdComm = await CrmService.createCommission(tenant.id, {
                usuario_id: targetUser,
                contrato_id: mc.id,
                oportunidade_id: mc.oportunidade_id,
                tipo: 'percentual',
                percentual: defaultPercent,
                valor: commVal,
                status: 'pendente',
                data_geracao: mc.data_assinatura || mc.signed_at || new Date().toISOString(),
              })
              commList.unshift(createdComm)
            }
          } catch (err) {
            console.warn('Auto-create commission failed for contract', mc.id, err)
          }
        }
      }

      setCommissions(commList)
      setContracts(contractList)
      setOpportunities(oppList)
      setUsers(userList)
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Erro ao carregar comissões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !newComm.usuario_id) return

    try {
      let finalValor = Number(newComm.valor) || 0
      if (newComm.tipo === 'percentual' && newComm.contrato_id) {
        const selectedContract = contracts.find((c) => c.id === newComm.contrato_id)
        if (selectedContract) {
          const cVal = Number(selectedContract.valor) || 0
          finalValor = (cVal * Number(newComm.percentual)) / 100
        }
      }

      const selectedContract = contracts.find((c) => c.id === newComm.contrato_id)

      await CrmService.createCommission(tenant.id, {
        usuario_id: newComm.usuario_id,
        contrato_id: newComm.contrato_id || undefined,
        oportunidade_id: selectedContract?.oportunidade_id || undefined,
        tipo: newComm.tipo,
        percentual: Number(newComm.percentual) || 0,
        valor: finalValor,
        status: newComm.status,
        data_geracao: new Date().toISOString(),
      })

      toast({ title: 'Comissão registrada com sucesso!' })
      setModalOpen(false)
      setNewComm({
        usuario_id: '',
        contrato_id: '',
        tipo: 'percentual',
        percentual: 10,
        valor: 0,
        status: 'pendente',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar comissão',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  const handleUpdateStatus = async (
    commId: string,
    newStatus: 'pendente' | 'aprovado' | 'pago' | 'cancelado',
  ) => {
    try {
      await CrmService.updateCommission(commId, {
        status: newStatus,
        data_pagamento: newStatus === 'pago' ? new Date().toISOString() : undefined,
      })
      toast({ title: `Comissão atualizada para ${newStatus.toUpperCase()}` })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar comissão', variant: 'destructive' })
    }
  }

  // Filter commissions by period, status, user and search
  const filteredCommissions = useMemo(() => {
    const now = new Date()
    let startPeriod = 0
    let endPeriod = Infinity

    if (periodFilter === 'current_month') {
      startPeriod = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      endPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()
    } else if (periodFilter === 'last_month') {
      startPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
      endPeriod = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime()
    }

    return commissions.filter((c) => {
      // Status filter
      if (statusFilter !== 'todos') {
        if ((c.status || 'pendente').toLowerCase() !== statusFilter.toLowerCase()) return false
      }

      // User filter
      if (userFilter !== 'todos') {
        if (c.usuario_id !== userFilter) return false
      }

      // Period filter
      if (periodFilter !== 'all_time') {
        const commDate = c.data_geracao
          ? new Date(c.data_geracao).getTime()
          : c.created
            ? new Date(c.created).getTime()
            : 0
        if (startPeriod && commDate < startPeriod) return false
        if (endPeriod !== Infinity && commDate > endPeriod) return false
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const userObj = c.expand?.usuario_id || users.find((u) => u.id === c.usuario_id)
        const contractObj = c.expand?.contrato_id || contracts.find((ct) => ct.id === c.contrato_id)
        const userName = (userObj?.name || '').toLowerCase()
        const contractTitle = (contractObj?.titulo || '').toLowerCase()
        if (!userName.includes(q) && !contractTitle.includes(q)) return false
      }

      return true
    })
  }, [commissions, statusFilter, userFilter, periodFilter, searchTerm, users, contracts])

  // Totalizers calculated on filtered list
  const totalGeral = filteredCommissions.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalPago = filteredCommissions
    .filter((c) => (c.status || '').toLowerCase() === 'pago')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalPendente = filteredCommissions
    .filter((c) => (c.status || '').toLowerCase() === 'pendente')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalAprovado = filteredCommissions
    .filter((c) => (c.status || '').toLowerCase() === 'aprovado')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Comissões &amp; Honorários por Responsável
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão automatizada e transparente de comissionamento de honorários vinculado a
            contratos assinados no CRM Teixeira &amp; Nascimento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>

          <Button
            onClick={() => {
              setNewComm({
                usuario_id: users[0]?.id || '',
                contrato_id: contracts[0]?.id || '',
                tipo: 'percentual',
                percentual: 10,
                valor: 0,
                status: 'pendente',
              })
              setModalOpen(true)
            }}
            className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Lançar Comissão
          </Button>
        </div>
      </div>

      {/* KPI Cards / Totalizers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total no Período</div>
            <div className="text-lg font-bold font-legal-serif">
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pendentes de Liberação</div>
            <div className="text-lg font-bold font-legal-serif text-amber-600">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Aprovadas (A Pagar)</div>
            <div className="text-lg font-bold font-legal-serif text-purple-600">
              R$ {totalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Comissões Pagas</div>
            <div className="text-lg font-bold font-legal-serif text-emerald-600">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar & Table */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar vendedor, contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs w-48"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-1 flex-wrap">
              {['todos', 'pendente', 'aprovado', 'pago', 'cancelado'].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={`h-8 text-xs capitalize px-2.5 ${
                    statusFilter === st ? 'bg-[#0A1F3F] text-white' : ''
                  }`}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Selector */}
            <Select value={periodFilter} onValueChange={(val: any) => setPeriodFilter(val)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">Todo o Histórico</SelectItem>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="last_month">Mês Anterior</SelectItem>
              </SelectContent>
            </Select>

            {/* User Selector */}
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Vendedores</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[220px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredCommissions.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <DollarSign className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              Nenhuma comissão encontrada para os filtros selecionados.
            </p>
            <p className="text-[11px] text-muted-foreground">
              As comissões são geradas automaticamente quando um contrato é assinado ou podem ser
              lançadas manualmente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3 pl-4">Vendedor / Advogado</th>
                  <th className="p-3">Contrato / Oportunidade</th>
                  <th className="p-3 text-right">Valor Contrato</th>
                  <th className="p-3 text-center">Comissão (%)</th>
                  <th className="p-3 text-right">Valor Comissão</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Data Geração / Pagto</th>
                  <th className="p-3 pr-4 text-right">Ações do Gestor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCommissions.map((comm) => {
                  const userObj =
                    comm.expand?.usuario_id || users.find((u) => u.id === comm.usuario_id)
                  const contractObj =
                    comm.expand?.contrato_id || contracts.find((c) => c.id === comm.contrato_id)
                  const oppObj =
                    comm.expand?.oportunidade_id ||
                    opportunities.find((o) => o.id === comm.oportunidade_id)

                  const statusClass =
                    comm.status === 'pago'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : comm.status === 'aprovado'
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                        : comm.status === 'cancelado'
                          ? 'bg-red-500/10 text-red-600 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'

                  return (
                    <tr key={comm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                          {(userObj?.name || 'US').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {userObj?.name || 'Vendedor'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {userObj?.email || comm.usuario_id}
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {contractObj ? (
                          <div className="max-w-[240px]">
                            <div className="font-semibold truncate">{contractObj.titulo}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {oppObj?.title || 'Contrato Assinado'}
                            </div>
                          </div>
                        ) : oppObj ? (
                          <div className="max-w-[240px]">
                            <div className="font-semibold truncate">{oppObj.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Oportunidade Ganha
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Lançamento Direto / Avulso</span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {contractObj?.valor
                          ? `R$ ${Number(contractObj.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : oppObj?.value
                            ? `R$ ${Number(oppObj.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '—'}
                      </td>

                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {comm.tipo === 'percentual' ? `${comm.percentual || 10}%` : 'Fixo'}
                        </Badge>
                      </td>

                      <td className="p-3 text-right font-bold font-mono text-sm text-foreground">
                        R${' '}
                        {Number(comm.valor || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="p-3 text-center">
                        <Badge className={`${statusClass} capitalize text-[10px]`}>
                          {comm.status === 'pago'
                            ? 'Pago'
                            : comm.status === 'aprovado'
                              ? 'Aprovado'
                              : comm.status === 'cancelado'
                                ? 'Cancelado'
                                : 'Pendente'}
                        </Badge>
                      </td>

                      <td className="p-3 text-center text-muted-foreground font-mono text-[11px]">
                        <div>
                          {comm.data_geracao
                            ? new Date(comm.data_geracao).toLocaleDateString('pt-BR')
                            : comm.created
                              ? new Date(comm.created).toLocaleDateString('pt-BR')
                              : '—'}
                        </div>
                        {comm.status === 'pago' && comm.data_pagamento && (
                          <div className="text-[9px] text-emerald-600">
                            Pg: {new Date(comm.data_pagamento).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {comm.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(comm.id, 'aprovado')}
                              className="h-7 text-[11px] px-2 text-purple-600 hover:text-purple-700 border-purple-500/30"
                              title="Aprovar comissão para pagamento"
                            >
                              Aprovar
                            </Button>
                          )}

                          {comm.status === 'aprovado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(comm.id, 'pago')}
                              className="h-7 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                              title="Marcar como paga / liquidada"
                            >
                              <Check className="h-3 w-3 mr-1" /> Marcar Paga
                            </Button>
                          )}

                          {comm.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(comm.id, 'pago')}
                              className="h-7 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 border-emerald-500/40"
                              title="Pagar diretamente"
                            >
                              Pagar
                            </Button>
                          )}

                          {comm.status === 'pago' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-600 border-emerald-500/30"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Liquidada
                            </Badge>
                          )}

                          {comm.status !== 'cancelado' && comm.status !== 'pago' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(comm.id, 'cancelado')}
                              className="h-7 text-[11px] px-1.5 text-red-500 hover:text-red-700"
                              title="Cancelar comissão"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL LANÇAR COMISSÃO MANUAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Lançar Comissão de Honorários
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCommission} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vendedor / Advogado Responsável *</Label>
              <Select
                value={newComm.usuario_id}
                onValueChange={(val) => setNewComm({ ...newComm, usuario_id: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email || u.cargo || 'Equipe'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Vincular a Contrato Assinado (Opcional)
              </Label>
              <Select
                value={newComm.contrato_id || 'none'}
                onValueChange={(val) => {
                  const actualVal = val === 'none' ? '' : val
                  const cObj = contracts.find((c) => c.id === actualVal)
                  const cVal = Number(cObj?.valor || 0)
                  const commVal = (cVal * Number(newComm.percentual)) / 100
                  setNewComm({
                    ...newComm,
                    contrato_id: actualVal,
                    valor: newComm.tipo === 'percentual' ? commVal : newComm.valor,
                  })
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o contrato..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Lançamento Avulso)</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo} — R$ {Number(c.valor || 0).toLocaleString('pt-BR')} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Cálculo</Label>
                <Select
                  value={newComm.tipo}
                  onValueChange={(val: any) => setNewComm({ ...newComm, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newComm.tipo === 'percentual' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Percentual (%) *</Label>
                  <Input
                    type="number"
                    value={newComm.percentual}
                    onChange={(e) => {
                      const p = Number(e.target.value)
                      const cObj = contracts.find((c) => c.id === newComm.contrato_id)
                      const cVal = Number(cObj?.valor || 0)
                      setNewComm({
                        ...newComm,
                        percentual: p,
                        valor: (cVal * p) / 100,
                      })
                    }}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Valor da Comissão (R$) *</Label>
                  <Input
                    type="number"
                    value={newComm.valor}
                    onChange={(e) => setNewComm({ ...newComm, valor: Number(e.target.value) })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Inicial</Label>
              <Select
                value={newComm.status}
                onValueChange={(val: any) => setNewComm({ ...newComm, status: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado (A Pagar)</SelectItem>
                  <SelectItem value="pago">Pago / Liquidado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Comissão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ComissoesPage
