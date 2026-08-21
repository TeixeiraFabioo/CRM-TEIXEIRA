import React, { useState, useEffect } from 'react'
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
import { CommissionRecord, ContractRecord, UserRecord } from '@/types/platform'

export function ComissoesPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [commissions, setCommissions] = useState<CommissionRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Manual Commission Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [newComm, setNewComm] = useState({
    usuario_id: '',
    contrato_id: '',
    tipo: 'percentual' as 'percentual' | 'fixo',
    percentual: 10,
    valor: 0,
    status: 'pendente' as 'pendente' | 'aprovado' | 'pago',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [commList, contractList, userList] = await Promise.all([
        CrmService.getCommissions(tenant.id),
        CrmService.getContracts(tenant.id),
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
        for (const mc of missingSignedContracts) {
          try {
            const contractVal = Number(mc.valor) || 0
            const defaultPercent = 10
            const commVal = contractVal > 0 ? (contractVal * defaultPercent) / 100 : 0

            // Find user
            const targetUser = userList[0]?.id || ''
            if (targetUser) {
              const createdComm = await CrmService.createCommission(tenant.id, {
                usuario_id: targetUser,
                contrato_id: mc.id,
                oportunidade_id: mc.oportunidade_id,
                tipo: 'percentual',
                percentual: defaultPercent,
                valor: commVal,
                status: 'pendente',
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

      await CrmService.createCommission(tenant.id, {
        usuario_id: newComm.usuario_id,
        contrato_id: newComm.contrato_id || undefined,
        tipo: newComm.tipo,
        percentual: Number(newComm.percentual) || 0,
        valor: finalValor,
        status: newComm.status,
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
      toast({ title: `Comissão atualizada para ${newStatus}` })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar comissão', variant: 'destructive' })
    }
  }

  const filteredCommissions = commissions.filter((c) => {
    if (statusFilter === 'todos') return true
    return (c.status || 'pendente').toLowerCase() === statusFilter.toLowerCase()
  })

  // Calculations
  const totalGeral = commissions.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalPago = commissions
    .filter((c) => (c.status || '').toLowerCase() === 'pago')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalPendente = commissions
    .filter((c) => (c.status || '').toLowerCase() === 'pendente')
    .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  const totalAprovado = commissions
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
            Gestão automatizada de comissionamento gerado a partir de contratos assinados e regras
            comerciais.
          </p>
        </div>

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total de Comissões</div>
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
            <div className="text-xs text-muted-foreground">Total Pago / Liquidado</div>
            <div className="text-lg font-bold font-legal-serif text-emerald-600">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Filtrar por Status:</span>
            <div className="flex gap-1.5 flex-wrap">
              {['todos', 'pendente', 'aprovado', 'pago', 'cancelado'].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={`h-7 text-xs capitalize ${
                    statusFilter === st ? 'bg-[#0A1F3F] text-white' : ''
                  }`}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          <span className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredCommissions.length}</strong> comissões
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredCommissions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Nenhuma comissão registrada com o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3 pl-4">Responsável / Vendedor</th>
                  <th className="p-3">Contrato / Origem</th>
                  <th className="p-3">Regra / Cálculo</th>
                  <th className="p-3 text-right">Valor da Comissão</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Data de Geração</th>
                  <th className="p-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCommissions.map((comm) => {
                  const userObj =
                    comm.expand?.usuario_id || users.find((u) => u.id === comm.usuario_id)
                  const contractObj =
                    comm.expand?.contrato_id || contracts.find((c) => c.id === comm.contrato_id)

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
                          {(userObj?.name || 'User').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{userObj?.name || 'Responsável'}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {userObj?.email || comm.usuario_id}
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {contractObj ? (
                          <div>
                            <div className="font-semibold">{contractObj.titulo}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Valor do Contrato: R${' '}
                              {Number(contractObj.valor || 0).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Lançamento Avulso / Direto</span>
                        )}
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {comm.tipo === 'percentual'
                            ? `${comm.percentual || 10}% do Contrato`
                            : 'Valor Fixo'}
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
                          {comm.status || 'pendente'}
                        </Badge>
                      </td>

                      <td className="p-3 text-right text-muted-foreground font-mono text-[11px]">
                        {comm.data_geracao
                          ? new Date(comm.data_geracao).toLocaleDateString('pt-BR')
                          : comm.created
                            ? new Date(comm.created).toLocaleDateString('pt-BR')
                            : '—'}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {comm.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(comm.id, 'aprovado')}
                              className="h-7 text-[11px] px-2 text-purple-600 hover:text-purple-700"
                            >
                              Aprovar
                            </Button>
                          )}
                          {comm.status === 'aprovado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(comm.id, 'pago')}
                              className="h-7 text-[11px] px-2 text-emerald-600 hover:text-emerald-700 border-emerald-500/40"
                            >
                              Marcar Pago
                            </Button>
                          )}
                          {comm.status !== 'cancelado' && comm.status !== 'pago' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(comm.id, 'cancelado')}
                              className="h-7 text-[11px] px-1.5 text-red-500 hover:text-red-700"
                            >
                              Cancelar
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
              <Label className="text-xs font-semibold">Responsável / Vendedor *</Label>
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
                      {u.name} ({u.email || u.cargo || 'Membro'})
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
                value={newComm.contrato_id}
                onValueChange={(val) => {
                  const cObj = contracts.find((c) => c.id === val)
                  const cVal = Number(cObj?.valor || 0)
                  const commVal = (cVal * Number(newComm.percentual)) / 100
                  setNewComm({
                    ...newComm,
                    contrato_id: val,
                    valor: newComm.tipo === 'percentual' ? commVal : newComm.valor,
                  })
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o contrato..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (Comissão Avulsa)</SelectItem>
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
                <Label className="text-xs font-semibold">Tipo de Comissão</Label>
                <Select
                  value={newComm.tipo}
                  onValueChange={(val: any) => setNewComm({ ...newComm, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
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
                  <SelectItem value="aprovado">Aprovado</SelectItem>
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
