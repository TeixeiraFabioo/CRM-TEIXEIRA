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
import { Label } from '@/components/ui/label'
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
import { ContractRecord, CustomerRecord } from '@/types/platform'

export function ContratosPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<ContractRecord>>({
    titulo: 'Contrato de Prestação de Serviços Advocatícios',
    valor: 35000,
    plataforma: 'zapsign',
    sign_provider: 'zapsign',
    sign_status: 'pending',
    status: 'aguardando',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [cList, custList] = await Promise.all([
        CrmService.getContracts(tenant.id),
        CrmService.getCustomers(tenant.id),
      ])
      setContracts(cList)
      setCustomers(custList)
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
    </div>
  )
}
export default ContratosPage
