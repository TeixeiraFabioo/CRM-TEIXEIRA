import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  FileText,
  FileCheck,
  Calendar,
  Plus,
  Target,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { TimelineView, TimelineItem } from '@/components/TimelineView'
import {
  CustomerRecord,
  OpportunityRecord,
  ProposalRecord,
  ContractRecord,
  NoteRecord,
  TaskRecord,
} from '@/types/platform'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadCustomerData = async () => {
    if (!id || !tenant?.id) return
    setLoading(true)
    try {
      const [cust, allOpps, allProps, allContracts, allNotes, allTasks] = await Promise.all([
        CrmService.getCustomerById(id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getProposals(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getNotes(tenant.id, `cliente_id = "${id}"`),
        CrmService.getTasks(tenant.id),
      ])

      setCustomer(cust)
      setOpportunities(allOpps.filter((o) => o.customer_id === id || o.cliente_id === id))
      setProposals(allProps.filter((p) => p.cliente_id === id))
      setContracts(allContracts.filter((c) => c.cliente_id === id))
      setNotes(allNotes)
      setTasks(allTasks.filter((t) => t.cliente_id === id))
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar detalhes do cliente', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerData()
  }, [id, tenant?.id])

  const timelineItems: TimelineItem[] = []
  if (customer) {
    timelineItems.push({
      id: 'cust_conv',
      type: 'won',
      title: 'Cliente Contratado / Convertido',
      description: `Contrato ativado no valor de R$ ${Number(customer.lifetime_value || customer.valor_total_contratado || 0).toLocaleString('pt-BR')}`,
      date: customer.data_conversao || customer.created || '',
    })
  }

  contracts.forEach((c) => {
    timelineItems.push({
      id: c.id,
      type: 'contract',
      title: `Contrato Assinado: ${c.titulo}`,
      description: `Plataforma: ${c.plataforma} • Valor: R$ ${Number(c.valor || 0).toLocaleString('pt-BR')} • Status: ${c.status}`,
      date: c.data_assinatura || c.created || '',
    })
  })

  proposals.forEach((p) => {
    timelineItems.push({
      id: p.id,
      type: 'proposal',
      title: `Proposta de Honorários: ${p.titulo}`,
      description: `Valor Total: R$ ${Number(p.valor_total || 0).toLocaleString('pt-BR')} • Status: ${p.status}`,
      date: p.created || '',
    })
  })

  notes.forEach((n) => {
    timelineItems.push({
      id: n.id,
      type: 'note',
      title: 'Nota Interna Registrada',
      description: n.conteudo,
      date: n.created || '',
    })
  })

  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold">Cliente não encontrado</h2>
        <Button onClick={() => navigate('/clientes')} className="mt-3">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate('/clientes')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
                {customer.name}
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {customer.status || 'Ativo'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
              <span>
                Empresa: <strong>{customer.company || 'Pessoa Física'}</strong>
              </span>
              <span>•</span>
              <span>
                Receita Contratada:{' '}
                <strong>
                  R${' '}
                  {Number(
                    customer.lifetime_value || customer.valor_total_contratado || 0,
                  ).toLocaleString('pt-BR')}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(`/propostas?cliente_id=${id}`)}
            className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Nova Proposta / Contrato
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Profile */}
        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-muted-foreground uppercase text-[11px]">
              Dados Cadastrais do Cliente
            </h3>
            <div className="space-y-2.5">
              <div>
                <span className="text-muted-foreground block text-[11px]">Contato Principal:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  {customer.phone || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">E-mail:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  {customer.email || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">CPF / CNPJ:</span>
                <span className="font-mono font-medium text-foreground">
                  {customer.document || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Endereço:</span>
                <span className="font-medium text-foreground">
                  {customer.city || 'São Paulo'} {customer.state ? `- ${customer.state}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2-Cols 360 View */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4">
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Linha do Tempo 360º ({timelineItems.length})
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Contratos ({contracts.length})
              </TabsTrigger>
              <TabsTrigger
                value="opportunities"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
              >
                Oportunidades ({opportunities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="pt-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
                <TimelineView items={timelineItems} />
              </div>
            </TabsContent>

            <TabsContent value="contracts" className="pt-4 space-y-3">
              {contracts.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                  Nenhum contrato formal registrado para este cliente.
                </div>
              ) : (
                contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm">{c.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Plataforma: {c.plataforma} • Assinado em:{' '}
                        {c.data_assinatura
                          ? new Date(c.data_assinatura).toLocaleDateString('pt-BR')
                          : 'Aguardando'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">
                        R$ {Number(c.valor || 0).toLocaleString('pt-BR')}
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="opportunities" className="pt-4 space-y-3">
              {opportunities.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                  Nenhuma oportunidade em andamento para este cliente.
                </div>
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 bg-card border border-border/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-primary/50"
                    onClick={() => navigate(`/oportunidades/${opp.id}`)}
                  >
                    <div>
                      <div className="font-semibold text-sm">{opp.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Serviço: {opp.servico || 'Não definido'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">
                        R$ {Number(opp.value || 0).toLocaleString('pt-BR')}
                      </div>
                      <Badge variant="outline">{opp.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
export default CustomerDetailPage
