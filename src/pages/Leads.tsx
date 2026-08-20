import React, { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  DollarSign,
  Share2,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel } from '@/hooks/useMetaPixel'
import { CrmService } from '@/services/crm'
import { LeadRecord } from '@/types/platform'
import { useToast } from '@/hooks/use-toast'

export const LeadsPage: React.FC = () => {
  const { tenant, pixelId } = useTenant()
  const { trackLead } = useMetaPixel()
  const { toast } = useToast()

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [potentialValue, setPotentialValue] = useState('45000')
  const [source, setSource] = useState('Meta Ads')
  const [isSaving, setIsSaving] = useState(false)

  const loadLeads = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const data = await CrmService.getLeads(tenant.id)
      setLeads(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [tenant])

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !name) return

    setIsSaving(true)
    try {
      const valNumber = parseFloat(potentialValue) || 20000
      const newLead = await CrmService.createLead(tenant.id, {
        name,
        company,
        email,
        phone,
        whatsapp: phone,
        potential_value: valNumber,
        source,
        channel: source,
        campaign: 'Campanha Meta Scale 2025',
      })

      // DISPARAR EVENTO DO META PIXEL: Lead
      const pixelDispatched = trackLead({
        lead_id: newLead.id,
        content_name: `Lead: ${newLead.name}`,
        value: valNumber,
        currency: 'BRL',
        source: newLead.source,
      })

      toast({
        title: 'Lead cadastrado com sucesso!',
        description: pixelDispatched
          ? `Evento fbq('track', 'Lead') disparado no Pixel (${pixelId}).`
          : 'Lead salvo no CRM SKIP.',
      })

      setModalOpen(false)
      setName('')
      setCompany('')
      setEmail('')
      setPhone('')
      loadLeads()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar lead',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            CRM: Gestão de Leads &amp; Oportunidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Qualificação por IA, pipeline comercial e disparo automático de eventos{' '}
            <code>Lead</code> para o Meta Pixel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pixelId && (
            <Badge
              variant="outline"
              className="h-8 gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-normal"
            >
              <Share2 className="h-3.5 w-3.5" />
              Meta Pixel Ativo ({pixelId})
            </Badge>
          )}

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <UserPlus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total de Leads Ativos</CardDescription>
            <CardTitle className="text-2xl font-bold">{leads.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sincronizados com o funil da SKIP
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Origem Meta Ads</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {
                leads.filter((l) => l.source?.includes('Meta') || l.channel?.includes('Meta'))
                  .length
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Rastreados via campanhas e Pixel
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pipeline Estimado</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R${' '}
              {leads
                .reduce((acc, curr) => acc + (curr.potential_value || 0), 0)
                .toLocaleString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Valor potencial em negociação
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Leads Table/Grid */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Leads Cadastrados</CardTitle>
          <CardDescription className="text-xs">
            Cada novo lead registrado envia automaticamente o evento padrão{' '}
            <code>fbq(&apos;track&apos;, &apos;Lead&apos;)</code> para a Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Lead / Contato</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Canal / Origem</th>
                  <th className="px-4 py-3">Score IA</th>
                  <th className="px-4 py-3">Valor Potencial</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum lead encontrado. Cadastre um novo lead acima para testar o disparo do
                      Meta Pixel.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{lead.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {lead.company || 'Não informada'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-xs">
                          {lead.source || 'Meta Ads'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">
                            {lead.score || 85}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/ 100</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                        R$ {(lead.potential_value || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-[11px]">
                          {lead.status || 'Novo Lead'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          onClick={() => {
                            trackLead({
                              lead_id: lead.id,
                              content_name: lead.name,
                              value: lead.potential_value || 10000,
                              currency: 'BRL',
                            })
                            toast({
                              title: `Pixel Event Disparado`,
                              description: `fbq('track', 'Lead') reenviado para ${lead.name}.`,
                            })
                          }}
                        >
                          Re-disparar Pixel
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Lead Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Lead no CRM</DialogTitle>
            <DialogDescription>
              Ao cadastrar, o evento de conversão <code>Lead</code> será disparado no Meta Pixel
              configurado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Nome Completo *</Label>
              <Input
                id="lead-name"
                required
                placeholder="Ex: Roberto Silveira"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-company">Empresa / Negócio</Label>
              <Input
                id="lead-company"
                placeholder="Ex: Indústria Alfa Ltda"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-email">E-mail</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="roberto@alfa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-phone">WhatsApp / Telefone</Label>
                <Input
                  id="lead-phone"
                  placeholder="+55 11 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lead-val">Valor Potencial (R$)</Label>
                <Input
                  id="lead-val"
                  type="number"
                  value={potentialValue}
                  onChange={(e) => setPotentialValue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-source">Origem do Lead</Label>
                <Input
                  id="lead-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
            </div>

            {pixelId && (
              <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                <span>Meta Pixel ({pixelId}) registrará o evento de conversão imediatamente.</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? 'Salvando...' : 'Salvar e Disparar Pixel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
