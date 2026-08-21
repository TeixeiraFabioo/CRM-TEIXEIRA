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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { TimelineView, TimelineItem } from '@/components/TimelineView'
import {
  CustomerRecord,
  OpportunityRecord,
  ProposalRecord,
  ContractRecord,
  NoteRecord,
  TaskRecord,
  TagRecord,
  CustomFieldRecord,
} from '@/types/platform'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tag, SlidersHorizontal, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  // Tags and Custom Fields State
  const [availableTags, setAvailableTags] = useState<TagRecord[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldRecord[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [savingCustomFields, setSavingCustomFields] = useState(false)

  const loadCustomerData = async () => {
    if (!id || !tenant?.id) return
    setLoading(true)
    try {
      const [
        cust,
        allOpps,
        allProps,
        allContracts,
        allNotes,
        allTasks,
        allTags,
        customerCustomFields,
      ] = await Promise.all([
        CrmService.getCustomerById(id),
        CrmService.getOpportunities(tenant.id),
        CrmService.getProposals(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getNotes(tenant.id, `cliente_id = "${id}"`),
        CrmService.getTasks(tenant.id),
        CrmService.getTags(tenant.id),
        CrmService.getCustomFields(tenant.id, 'customer'),
      ])

      setCustomer(cust)
      setOpportunities(allOpps.filter((o) => o.customer_id === id || o.cliente_id === id))
      setProposals(allProps.filter((p) => p.cliente_id === id))
      setContracts(allContracts.filter((c) => c.cliente_id === id))
      setNotes(allNotes)
      setTasks(allTasks.filter((t) => t.cliente_id === id))
      setAvailableTags(allTags)
      setCustomFields(customerCustomFields)

      if (cust && cust.custom_fields) {
        setCustomFieldValues(cust.custom_fields)
      } else {
        setCustomFieldValues({})
      }
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

  const handleToggleTag = async (tagId: string) => {
    if (!customer || !id) return
    try {
      const currentTags = Array.isArray(customer.tags) ? [...customer.tags] : []
      let newTags: string[]
      if (currentTags.includes(tagId)) {
        newTags = currentTags.filter((t) => t !== tagId)
      } else {
        newTags = [...currentTags, tagId]
      }
      const updated = await pb.collection('customers').update<CustomerRecord>(id, { tags: newTags })
      setCustomer(updated)
      toast({ title: 'Tags do cliente atualizadas com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar tags', description: e?.message, variant: 'destructive' })
    }
  }

  const handleSaveCustomFieldValues = async () => {
    if (!id || !customer) return
    setSavingCustomFields(true)
    try {
      const updated = await pb.collection('customers').update<CustomerRecord>(id, {
        custom_fields: customFieldValues,
      })
      setCustomer(updated)
      toast({ title: 'Campos personalizados do cliente salvos!' })
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar campos personalizados',
        description: e?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingCustomFields(false)
    }
  }

  const handleToggleCustomerStatus = async (checked: boolean) => {
    if (!customer?.id || !tenant?.id) return
    setIsTogglingStatus(true)

    try {
      const updated = await pb.collection('customers').update<CustomerRecord>(customer.id, {
        active: checked,
        status: checked ? 'Ativo' : 'Inativo',
      })

      await CrmService.logAudit(
        tenant.id,
        checked ? 'activate_customer' : 'deactivate_customer',
        'customer',
        customer.id,
        { active: customer.active, status: customer.status },
        { active: checked, status: checked ? 'Ativo' : 'Inativo' },
      )

      setCustomer((prev) =>
        prev ? { ...prev, active: checked, status: checked ? 'Ativo' : 'Inativo' } : null,
      )

      toast({
        title: checked ? 'Cliente Ativado' : 'Cliente Inativado',
        description: `O status do cliente foi alterado para ${checked ? 'Ativo' : 'Inativo'}.`,
      })
    } catch (err: any) {
      console.error('Error toggling customer status in detail:', err)
      toast({
        title: 'Erro ao alterar status',
        description: err?.message || 'Falha ao salvar alteração.',
        variant: 'destructive',
      })
    } finally {
      setIsTogglingStatus(false)
    }
  }

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
              <Badge
                className={
                  customer.active !== false && customer.status !== 'Inativo'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }
              >
                {customer.active !== false && customer.status !== 'Inativo' ? 'Ativo' : 'Inativo'}
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

        <div className="flex items-center gap-3">
          {/* Active Status Switch Control */}
          <div className="flex items-center gap-2 bg-card border border-border/80 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">Status do Cliente:</span>
            <Switch
              checked={customer.active !== false && customer.status !== 'Inativo'}
              disabled={isTogglingStatus}
              onCheckedChange={handleToggleCustomerStatus}
              aria-label="Alternar cliente ativo ou inativo"
            />
            <span
              className={`text-xs font-bold ${
                customer.active !== false && customer.status !== 'Inativo'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {customer.active !== false && customer.status !== 'Inativo' ? 'Ativo' : 'Inativo'}
            </span>
          </div>

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

            {/* SEÇÃO DE TAGS DO CLIENTE */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Tags &amp; Segmentação
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] gap-1 text-primary"
                    >
                      <Plus className="h-3 w-3" /> Gerenciar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="text-xs font-semibold mb-2 px-1">Atribuir Tags:</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableTags.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">
                          Nenhuma tag cadastrada.
                        </div>
                      ) : (
                        availableTags.map((tag) => {
                          const isAssigned =
                            Array.isArray(customer.tags) && customer.tags.includes(tag.id)
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleToggleTag(tag.id)}
                              className="w-full flex items-center justify-between p-1.5 rounded hover:bg-muted text-xs transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: tag.cor || '#2563eb' }}
                                />
                                <span className="truncate">{tag.nome}</span>
                              </div>
                              {isAssigned && (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                {Array.isArray(customer.tags) && customer.tags.length > 0 ? (
                  customer.tags.map((tagId) => {
                    const tagObj = availableTags.find((t) => t.id === tagId)
                    const label = tagObj ? tagObj.nome : tagId
                    const color = tagObj?.cor || '#2563eb'
                    return (
                      <Badge
                        key={tagId}
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                          borderColor: `${color}40`,
                        }}
                        className="text-[10px] px-2 py-0.5 border flex items-center gap-1 font-medium group"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tagId)}
                          className="hover:opacity-75 ml-0.5"
                        >
                          ×
                        </button>
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Nenhuma tag atribuída a este cliente.
                  </span>
                )}
              </div>
            </div>

            {/* SEÇÃO DE CAMPOS PERSONALIZADOS DO CLIENTE */}
            {customFields.length > 0 && (
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3 w-3 text-primary" /> Campos Personalizados
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveCustomFieldValues}
                    disabled={savingCustomFields}
                    className="h-6 px-2 text-[11px] text-primary"
                  >
                    {savingCustomFields ? 'Salvando...' : 'Salvar Campos'}
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {customFields.map((cf) => {
                    const fieldVal = customFieldValues[cf.id] ?? customFieldValues[cf.nome] ?? ''
                    const opts: string[] = Array.isArray(cf.opcoes)
                      ? cf.opcoes
                      : typeof cf.opcoes === 'object' &&
                          cf.opcoes !== null &&
                          'options' in cf.opcoes
                        ? (cf.opcoes as any).options || []
                        : []

                    return (
                      <div key={cf.id} className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                          <span>
                            {cf.nome} {cf.obrigatorio && <span className="text-red-500">*</span>}
                          </span>
                          <span className="text-[10px] capitalize opacity-60 font-mono">
                            ({cf.tipo})
                          </span>
                        </Label>

                        {cf.tipo === 'selecao' ? (
                          <Select
                            value={String(fieldVal || '')}
                            onValueChange={(val) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: val,
                                [cf.nome]: val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {opts.map((op, i) => (
                                <SelectItem key={i} value={op}>
                                  {op}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : cf.tipo === 'booleano' ? (
                          <div className="flex items-center gap-2 pt-0.5">
                            <Switch
                              checked={Boolean(fieldVal)}
                              onCheckedChange={(val) =>
                                setCustomFieldValues((prev) => ({
                                  ...prev,
                                  [cf.id]: val,
                                  [cf.nome]: val,
                                }))
                              }
                            />
                            <span className="text-xs">{fieldVal ? 'Sim' : 'Não'}</span>
                          </div>
                        ) : cf.tipo === 'data' ? (
                          <Input
                            type="date"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            className="h-8 text-xs font-mono"
                          />
                        ) : cf.tipo === 'numero' || cf.tipo === 'moeda' ? (
                          <Input
                            type="number"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            placeholder={cf.tipo === 'moeda' ? 'R$ 0,00' : '0'}
                            className="h-8 text-xs font-mono"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={String(fieldVal || '')}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.id]: e.target.value,
                                [cf.nome]: e.target.value,
                              }))
                            }
                            placeholder={`Inserir ${cf.nome.toLowerCase()}...`}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
