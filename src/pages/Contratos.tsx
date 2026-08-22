import React, { useState, useEffect } from 'react'
import {
  FileCheck,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
  Copy,
  Check,
  Send,
  Eye,
  XCircle,
  History,
  ShieldCheck,
  Zap,
  Edit,
  Trash2,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import pb from '@/lib/pocketbase/client'
import { ContractRecord, CustomerRecord, OpportunityRecord, ServiceRecord } from '@/types/platform'

export function ContratosPage() {
  const { tenant, userRole, user } = useTenant()
  const isAdmin = userRole === 'admin' || user?.role === 'admin'
  const { toast } = useToast()

  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null)
  const [contractToEdit, setContractToEdit] = useState<ContractRecord | null>(null)
  const [contractToCancel, setContractToCancel] = useState<ContractRecord | null>(null)
  const [contractToDelete, setContractToDelete] = useState<ContractRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<ContractRecord>>({
    titulo: 'Contrato de Prestação de Serviços Advocatícios',
    valor: 35000,
    plataforma: 'zapsign',
    sign_provider: 'zapsign',
    sign_status: 'pending',
    status: 'aguardando',
  })

  const [editFormData, setEditFormData] = useState<{
    titulo: string
    cliente_id: string
    oportunidade_id: string
    valor: number
    status: string
    data_envio: string
    sign_provider: string
  }>({
    titulo: '',
    cliente_id: '',
    oportunidade_id: '',
    valor: 0,
    status: 'aguardando',
    data_envio: '',
    sign_provider: 'zapsign',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [cList, custList, oppList, sList] = await Promise.all([
        CrmService.getContracts(tenant.id),
        CrmService.getCustomers(tenant.id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getServices(tenant.id),
      ])
      setContracts(cList)
      setCustomers(custList)
      setOpportunities(oppList)
      setServices(sList)
      if (selectedContract) {
        const refreshed = cList.find((c) => c.id === selectedContract.id)
        if (refreshed) setSelectedContract(refreshed)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.titulo) return
    setSubmitting(true)
    try {
      await CrmService.createContract(tenant.id, {
        ...formData,
        sign_status: 'pending',
        status: 'aguardando',
        data_envio: new Date().toISOString(),
      })
      toast({ title: 'Contrato gerado com sucesso!' })
      setCreateModalOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao criar contrato', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (c: ContractRecord) => {
    setContractToEdit(c)
    setEditFormData({
      titulo: c.titulo || '',
      cliente_id: c.cliente_id || '',
      oportunidade_id: c.oportunidade_id || '',
      valor: Number(c.valor || 0),
      status: c.status || 'aguardando',
      data_envio: c.data_envio ? c.data_envio.slice(0, 10) : '',
      sign_provider: c.sign_provider || c.plataforma || 'zapsign',
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractToEdit?.id || !editFormData.titulo) return
    setSubmitting(true)
    try {
      await pb.collection('contracts').update(contractToEdit.id, {
        titulo: editFormData.titulo,
        cliente_id: editFormData.cliente_id || null,
        oportunidade_id: editFormData.oportunidade_id || null,
        valor: Number(editFormData.valor) || 0,
        status: editFormData.status,
        plataforma: editFormData.sign_provider,
        sign_provider: editFormData.sign_provider,
        ...(editFormData.data_envio ? { data_envio: editFormData.data_envio } : {}),
      })
      toast({ title: 'Contrato atualizado com sucesso!' })
      setEditModalOpen(false)
      setContractToEdit(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar contrato', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenCancel = (c: ContractRecord) => {
    setContractToCancel(c)
    setCancelReason('')
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!contractToCancel?.id) return
    setSubmitting(true)
    try {
      const existingHistory = contractToCancel.historico || []
      const updatedHistory = [
        ...existingHistory,
        {
          data: new Date().toISOString(),
          evento: `Contrato cancelado pelo admin. Motivo: ${cancelReason.trim() || 'Não informado'}`,
          usuario: user?.name || user?.email || 'Admin',
        },
      ]

      await pb.collection('contracts').update(contractToCancel.id, {
        status: 'cancelado',
        sign_status: 'declined',
        historico: updatedHistory,
      })
      toast({ title: 'Contrato cancelado com sucesso!' })
      setCancelModalOpen(false)
      setContractToCancel(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao cancelar contrato', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDelete = (c: ContractRecord) => {
    setContractToDelete(c)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!contractToDelete?.id) return
    setSubmitting(true)
    try {
      await pb.collection('contracts').delete(contractToDelete.id)
      toast({ title: 'Contrato excluído com sucesso!' })
      setDeleteConfirmOpen(false)
      setContractToDelete(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir contrato', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendForSignature = async (contractId: string) => {
    setSendingId(contractId)
    try {
      // Buscar o contrato atual para obter o cliente vinculado
      const contract = await pb.collection('contracts').getOne<ContractRecord>(contractId)
      const clienteId = contract.cliente_id

      if (clienteId) {
        let cliente: CustomerRecord | null = null
        try {
          cliente = await pb.collection('customers').getOne<CustomerRecord>(clienteId)
        } catch (errCust) {
          console.error('Erro ao buscar cliente vinculado ao contrato:', errCust)
        }

        if (cliente) {
          // Validar campos obrigatórios do cliente
          const missing: string[] = []
          if (!cliente.name || !cliente.name.trim()) missing.push('Nome')
          if (!cliente.email && !cliente.phone) missing.push('E-mail ou Telefone')
          if (!cliente.document) missing.push('CPF/CNPJ')
          if (!(cliente as any).rg) missing.push('RG')
          if (!cliente.address) missing.push('Endereço')
          if (!cliente.city) missing.push('Cidade')
          if (!cliente.state) missing.push('Estado (UF)')
          if (!(cliente as any).estado_civil) missing.push('Estado Civil')

          if (missing.length > 0) {
            toast({
              title: 'Dados incompletos do cliente',
              description: `Campos faltando: ${missing.join(', ')}.`,
              variant: 'destructive',
            })
            return
          }
        }
      }

      await CrmService.sendContractForSignature(contractId)
      toast({
        title: 'Contrato enviado para assinatura!',
        description: 'Disparado com sucesso via ZapSign.',
      })
      setTimeout(() => loadData(), 1500)
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Falha ao comunicar com ZapSign.',
        variant: 'destructive',
      })
    } finally {
      setSendingId(null)
    }
  }

  const copySignLink = (link?: string) => {
    if (!link) {
      toast({ title: 'Link de assinatura não disponível.', variant: 'destructive' })
      return
    }
    navigator.clipboard.writeText(link)
    toast({ title: 'Link de assinatura copiado para a área de transferência!' })
  }

  // Normalização do status real (pending, sent, viewed, signed, declined, expired)
  const getNormalizedStatus = (c: ContractRecord) => {
    if (c.sign_status) return c.sign_status
    if (c.status === 'assinado') return 'signed'
    if (c.status === 'enviado') return 'sent'
    if (c.status === 'recusado') return 'declined'
    if (c.status === 'expirado') return 'expired'
    if (c.status === 'visualizado') return 'viewed'
    return 'pending'
  }

  const getStatusBadge = (c: ContractRecord) => {
    if (c.status === 'cancelado') {
      return (
        <Badge
          variant="destructive"
          className="gap-1 text-[11px] bg-red-500/10 text-red-600 border-red-500/30"
        >
          <XCircle className="h-3 w-3" /> Cancelado
        </Badge>
      )
    }
    const st = getNormalizedStatus(c)
    switch (st) {
      case 'signed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" /> Assinado
          </Badge>
        )
      case 'sent':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-[11px]">
            <Clock className="h-3 w-3" /> Enviado
          </Badge>
        )
      case 'viewed':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 text-[11px]">
            <Eye className="h-3 w-3" /> Visualizado
          </Badge>
        )
      case 'declined':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <XCircle className="h-3 w-3" /> Recusado
          </Badge>
        )
      case 'expired':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" /> Expirado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px] gap-1">
            <Clock className="h-3 w-3" /> Pendente
          </Badge>
        )
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-legal-serif">
              Contratos &amp; Assinaturas Digitais
            </h1>
            <Badge variant="outline">{contracts.length} contratos</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Integração nativa com ZapSign para formalização jurídica, disparo de links e tracking em
            tempo real.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Novo Contrato de Honorários
        </Button>
      </div>

      {/* TABELA DE CONTRATOS */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
            <tr>
              <th className="p-3.5 pl-4">Contrato / Título</th>
              <th className="p-3.5">Cliente Contratante</th>
              <th className="p-3.5">Valor</th>
              <th className="p-3.5">Status Real</th>
              <th className="p-3.5">Link de Assinatura (ZapSign)</th>
              <th className="p-3.5">Data / Evento</th>
              <th className="p-3.5 pr-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Carregando contratos...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum contrato formalizado ainda.
                </td>
              </tr>
            ) : (
              contracts.map((c) => {
                const signLink = c.sign_link || c.sign_url || c.signing_link
                const statusNorm = getNormalizedStatus(c)
                const isSigned = statusNorm === 'signed'
                const isPending = statusNorm === 'pending'

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      setSelectedContract(c)
                      setDetailModalOpen(true)
                    }}
                  >
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground">{c.titulo}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                        <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                        {c.sign_provider || c.plataforma || 'zapsign'} • ID:{' '}
                        {c.sign_document_id || c.zapsign_doc_id || c.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {c.expand?.cliente_id?.name || 'Cliente Geral'}
                    </td>
                    <td className="p-3.5 font-bold text-foreground">
                      R$ {Number(c.valor || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3.5">{getStatusBadge(c)}</td>
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      {signLink ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copySignLink(signLink)}
                            className="h-7 text-xs gap-1 font-medium"
                          >
                            <Copy className="h-3 w-3" /> Copiar Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <a
                              href={signLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir link de assinatura"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">
                          {isPending ? 'Pendente de envio' : 'Não gerado'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {isSigned ? (
                        <div>
                          <span className="font-semibold text-emerald-600 block">Assinado em:</span>
                          <span>{formatDate(c.signed_at || c.data_assinatura || c.updated)}</span>
                        </div>
                      ) : c.sent_at || c.data_envio ? (
                        <div>
                          <span className="block text-[11px]">Enviado em:</span>
                          <span>{formatDate(c.sent_at || c.data_envio)}</span>
                        </div>
                      ) : (
                        formatDate(c.created)
                      )}
                    </td>
                    <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleSendForSignature(c.id)}
                            disabled={sendingId === c.id}
                            className="h-7 text-xs bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1"
                          >
                            <Send className="h-3 w-3" /> Enviar ZapSign
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContract(c)
                            setDetailModalOpen(true)
                          }}
                          className="h-7 text-xs"
                        >
                          Ver Detalhes →
                        </Button>

                        {/* ADMIN ACTIONS: EDIT, CANCEL, DELETE */}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(c)}
                              className="h-7 text-xs gap-1"
                              title="Editar Contrato (Admin)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            {c.status !== 'cancelado' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCancel(c)}
                                className="h-7 text-xs text-amber-600 hover:bg-amber-500/10 gap-1"
                                title="Cancelar Contrato (Admin)"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Cancelar</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(c)}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              title="Excluir Contrato (Admin)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALHES DO CONTRATO (TIMELINE & EVENTOS) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                Detalhes do Contrato
              </DialogTitle>
              {selectedContract && getStatusBadge(selectedContract)}
            </div>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4 pt-2 text-xs">
              {/* DADOS GERAIS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-3.5 rounded-xl border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Título</span>
                  <span className="font-semibold text-foreground text-xs">
                    {selectedContract.titulo}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cliente</span>
                  <span className="font-semibold text-foreground text-xs">
                    {selectedContract.expand?.cliente_id?.name || 'Cliente Geral'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Valor</span>
                  <span className="font-bold text-emerald-600 text-xs">
                    R$ {Number(selectedContract.valor || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Plataforma</span>
                  <span className="font-mono text-xs uppercase">
                    {selectedContract.sign_provider || selectedContract.plataforma || 'ZapSign'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Doc ID (ZapSign)</span>
                  <span className="font-mono text-[11px] text-foreground truncate block">
                    {selectedContract.sign_document_id ||
                      selectedContract.zapsign_doc_id ||
                      'Não registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Criado em</span>
                  <span className="text-xs">{formatDate(selectedContract.created)}</span>
                </div>
              </div>

              {/* LINK DE ASSINATURA */}
              {(selectedContract.sign_link ||
                selectedContract.sign_url ||
                selectedContract.signing_link) && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Link Direto para
                      Assinatura
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copySignLink(
                          selectedContract.sign_link ||
                            selectedContract.sign_url ||
                            selectedContract.signing_link,
                        )
                      }
                      className="h-7 text-xs gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copiar Link
                    </Button>
                  </div>
                  <div className="font-mono text-[11px] bg-background/80 p-2 rounded border truncate select-all text-muted-foreground">
                    {selectedContract.sign_link ||
                      selectedContract.sign_url ||
                      selectedContract.signing_link}
                  </div>
                </div>
              )}

              {/* EVENTO DE ASSINATURA CONCLUÍDA */}
              {getNormalizedStatus(selectedContract) === 'signed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        Contrato Assinado com Validade Jurídica
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Assinatura eletrônica concluída via ZapSign em{' '}
                        {formatDate(selectedContract.signed_at || selectedContract.data_assinatura)}
                        .
                      </div>
                    </div>
                  </div>
                  {selectedContract.documento_url && (
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                      <a
                        href={selectedContract.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver Documento Assinado ↗
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* TIMELINE DE EVENTOS DE ASSINATURA */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <History className="h-4 w-4 text-primary" /> Linha do Tempo de Eventos (ZapSign)
                </h4>

                {(!selectedContract.sign_events || selectedContract.sign_events.length === 0) &&
                (!selectedContract.historico || selectedContract.historico.length === 0) ? (
                  <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded-lg">
                    Nenhum evento registrado ainda.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {/* Exibir sign_events */}
                    {(selectedContract.sign_events || []).map((ev: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center" />
                        <div className="bg-card border rounded-lg p-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-xs uppercase font-mono">
                              {ev.event || ev.event_type || 'Evento ZapSign'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(ev.created_at || ev.received_at || ev.date)}
                            </span>
                          </div>
                          {ev.sign_status && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Status: <strong>{ev.sign_status}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Exibir historico complementar se houver */}
                    {(selectedContract.historico || [])
                      .filter(
                        (h: any) =>
                          !selectedContract.sign_events?.some((se: any) => se.date === h.data),
                      )
                      .map((h: any, idx: number) => (
                        <div key={'h-' + idx} className="relative">
                          <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-muted-foreground/30 border-2 border-muted-foreground flex items-center justify-center" />
                          <div className="bg-card border rounded-lg p-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground text-xs">
                                {h.evento || h.action || 'Registro do CRM'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(h.data || h.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            {selectedContract && getNormalizedStatus(selectedContract) === 'pending' && (
              <Button
                size="sm"
                onClick={() => {
                  handleSendForSignature(selectedContract.id)
                  setDetailModalOpen(false)
                }}
                className="bg-[#0A1F3F] text-white text-xs gap-1"
              >
                <Send className="h-3 w-3" /> Enviar para Assinatura (ZapSign)
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Gerar Contrato para Assinatura
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Instrumento *</Label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
              <Input
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plataforma de Assinatura</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(val) =>
                  setFormData({ ...formData, plataforma: val, sign_provider: val })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapsign">ZapSign (WhatsApp &amp; E-mail)</SelectItem>
                  <SelectItem value="clicksign">Clicksign</SelectItem>
                  <SelectItem value="manual">Assinatura Manual / Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente Contratante</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(val) => setFormData({ ...formData, cliente_id: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO (ADMIN ONLY) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Editar Contrato de Honorários (Admin)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Instrumento *</Label>
              <Input
                required
                value={editFormData.titulo}
                onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cliente Contratante</Label>
                <Select
                  value={editFormData.cliente_id || 'none'}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, cliente_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Cliente Geral</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Oportunidade Vinculada</Label>
                <Select
                  value={editFormData.oportunidade_id || 'none'}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, oportunidade_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {opportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor dos Honorários (R$)</Label>
                <Input
                  type="number"
                  value={editFormData.valor}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, valor: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status do Contrato</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando Envio</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="visualizado">Visualizado</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                    <SelectItem value="expirado">Expirado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Plataforma</Label>
                <Select
                  value={editFormData.sign_provider}
                  onValueChange={(val) => setEditFormData({ ...editFormData, sign_provider: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zapsign">ZapSign</SelectItem>
                    <SelectItem value="clicksign">Clicksign</SelectItem>
                    <SelectItem value="manual">Manual / Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Envio / Vigência</Label>
                <Input
                  type="date"
                  value={editFormData.data_envio}
                  onChange={(e) => setEditFormData({ ...editFormData, data_envio: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0A1F3F] text-white"
              >
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CANCELAMENTO COM MOTIVO (ADMIN ONLY) */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> Cancelar Contrato
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o contrato <strong>{contractToCancel?.titulo}</strong>
              ? O status será alterado para <em>cancelado</em> e o histórico será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-semibold">Motivo do Cancelamento (opcional)</Label>
            <Textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Desistência do cliente antes da assinatura..."
              className="text-xs"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={handleConfirmCancel}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE EXCLUSÃO (ADMIN ONLY) */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato de Honorários</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato <strong>{contractToDelete?.titulo}</strong>?
              Esta ação removerá o registro permanentemente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default ContratosPage
