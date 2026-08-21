import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Target,
  DollarSign,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Send,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import { TimelineView, TimelineItem } from '@/components/TimelineView'
import { OpportunityRecord, PipelineStageRecord } from '@/types/platform'

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [opp, setOpp] = useState<OpportunityRecord | null>(null)
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sendingContract, setSendingContract] = useState(false)

  const [wonModalOpen, setWonModalOpen] = useState(false)
  const [wonData, setWonData] = useState({
    value: 20000,
    servico: 'Honorários Advocatícios',
    observacoes: '',
  })

  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [lostData, setLostData] = useState({
    loss_reason: 'preço',
    observacoes: '',
  })

  const loadOpp = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await CrmService.getOpportunityById(id)
      const oppContract = await CrmService.getContractByOpportunityId(id)
      setOpp(data)
      setContract(oppContract)
      if (data) {
        setWonData({
          value: data.value || 20000,
          servico: data.servico || 'Honorários',
          observacoes: '',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpp()
  }, [id])

  const handleSendForSignature = async () => {
    if (!id || !tenant?.id || !opp) return
    setSendingContract(true)
    try {
      let targetContract = contract
      if (!targetContract) {
        targetContract = await CrmService.createContract(tenant.id, {
          oportunidade_id: opp.id,
          cliente_id: opp.customer_id || opp.cliente_id,
          titulo: `Contrato de Honorários - ${opp.title}`,
          valor: opp.value || 20000,
          status: 'aguardando',
          sign_status: 'pending',
          plataforma: 'zapsign',
          sign_provider: 'zapsign',
        })
      }
      const updated = await CrmService.sendContractForSignature(targetContract.id)
      setContract(updated)
      toast({
        title: 'Enviado para assinatura!',
        description: 'Documento gerado e enviado para assinatura eletrônica via ZapSign.',
      })
      setTimeout(() => loadOpp(), 2000)
    } catch (err: any) {
      toast({
        title: 'Erro ao disparar contrato',
        description: err?.message || 'Falha ao enviar documento.',
        variant: 'destructive',
      })
    } finally {
      setSendingContract(false)
    }
  }

  const handleWon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      await CrmService.markOpportunityWon(id, wonData)
      toast({ title: 'Oportunidade fechada como GANHO!' })
      setWonModalOpen(false)
      navigate('/clientes')
    } catch (e) {
      toast({ title: 'Erro ao fechar', variant: 'destructive' })
    }
  }

  const handleLost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      await CrmService.markOpportunityLost(id, lostData.loss_reason, lostData.observacoes)
      toast({ title: 'Oportunidade marcada como perda' })
      setLostModalOpen(false)
      loadOpp()
    } catch (e) {
      toast({ title: 'Erro ao registrar perda', variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando negócio...</div>
  if (!opp) return <div className="p-8 text-center">Oportunidade não encontrada</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/pipeline')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-legal-serif">{opp.title}</h1>
              <Badge variant="outline">{opp.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Valor: <strong>R$ {Number(opp.value || 0).toLocaleString('pt-BR')}</strong> • Serviço:{' '}
              {opp.servico || 'Geral'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setWonModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Marcar Ganho
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLostModalOpen(true)}
            className="text-xs"
          >
            <XCircle className="h-4 w-4 mr-1.5" /> Marcar Perda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-5 space-y-3 text-xs">
          <h3 className="font-bold text-muted-foreground uppercase text-[11px]">
            Resumo da Oportunidade
          </h3>
          <div>
            <span className="text-muted-foreground block">Valor Estimado:</span>
            <span className="font-bold text-base text-foreground">
              R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Probabilidade de Fechamento:</span>
            <span className="font-semibold">{opp.probabilidade || 50}%</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Responsável:</span>
            <span>{opp.expand?.assigned_to?.name || 'Geral'}</span>
          </div>
          {opp.observacoes && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground block">Observações:</span>
              <p className="mt-1 bg-muted/40 p-2 rounded whitespace-pre-line">{opp.observacoes}</p>
            </div>
          )}

          {/* BOX DO CONTRATO ZAPSIGN */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[11px] uppercase text-muted-foreground">
                Contrato Digital
              </h4>
              {contract?.sign_status === 'signed' || contract?.status === 'assinado' ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Assinado
                </Badge>
              ) : contract?.sign_status === 'sent' || contract?.status === 'enviado' ? (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                  Enviado
                </Badge>
              ) : contract ? (
                <Badge variant="outline" className="text-[10px]">
                  Pendente
                </Badge>
              ) : null}
            </div>

            {contract ? (
              <div className="space-y-2 bg-muted/40 p-2.5 rounded-lg border">
                <div className="font-semibold text-foreground text-xs">{contract.titulo}</div>
                {contract.sign_link && (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(contract.sign_link)
                        toast({ title: 'Link de assinatura copiado!' })
                      }}
                      className="h-7 text-xs w-full gap-1"
                    >
                      Copiar Link de Assinatura
                    </Button>
                  </div>
                )}
                {contract.sign_status !== 'signed' && contract.sign_status !== 'sent' && (
                  <Button
                    size="sm"
                    onClick={handleSendForSignature}
                    disabled={sendingContract}
                    className="h-7 text-xs w-full bg-[#0A1F3F] text-white gap-1"
                  >
                    <Send className="h-3 w-3" /> Enviar para Assinatura (ZapSign)
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleSendForSignature}
                disabled={sendingContract}
                className="h-7 text-xs w-full bg-[#0A1F3F] text-white gap-1"
              >
                <Plus className="h-3 w-3" /> Criar e Enviar Contrato ZapSign
              </Button>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-card border rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4">Linha do Tempo</h3>
          <TimelineView
            items={[
              {
                id: '1',
                type: opp.status === 'won' ? 'won' : opp.status === 'lost' ? 'lost' : 'proposal',
                title: `Oportunidade Criada`,
                description: `Valor registrado: R$ ${Number(opp.value || 0).toLocaleString('pt-BR')}`,
                date: opp.created || '',
              },
            ]}
          />
        </div>
      </div>

      {/* WON MODAL */}
      <Dialog open={wonModalOpen} onOpenChange={setWonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-600 font-legal-serif">
              Fechar Negócio com Sucesso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWon} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor Final Contratado (R$)</Label>
              <Input
                type="number"
                value={wonData.value}
                onChange={(e) => setWonData({ ...wonData, value: Number(e.target.value) })}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Finais</Label>
              <Textarea
                rows={2}
                value={wonData.observacoes}
                onChange={(e) => setWonData({ ...wonData, observacoes: e.target.value })}
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWonModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 text-white font-bold">
                Confirmar Ganho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LOST MODAL */}
      <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 font-legal-serif">
              Registrar Perda
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLost} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo da Perda</Label>
              <Select
                value={lostData.loss_reason}
                onValueChange={(val) => setLostData({ ...lostData, loss_reason: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preço">Preço</SelectItem>
                  <SelectItem value="sem_interesse">Sem Interesse</SelectItem>
                  <SelectItem value="concorrente">Concorrente</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLostModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" variant="destructive">
                Salvar Perda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default OpportunityDetailPage
