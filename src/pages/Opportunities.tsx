import React, { useEffect, useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Share2,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel } from '@/hooks/useMetaPixel'
import { CrmService } from '@/services/crm'
import { OpportunityRecord } from '@/types/platform'
import { useToast } from '@/hooks/use-toast'

export const OpportunitiesPage: React.FC = () => {
  const { tenant, pixelId } = useTenant()
  const { trackPurchase, trackSubmitApplication } = useMetaPixel()
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadOpportunities = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const data = await CrmService.getOpportunities(tenant.id)
      setOpportunities(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpportunities()
  }, [tenant])

  const handleMarkWon = async (opp: OpportunityRecord) => {
    try {
      await CrmService.markOpportunityWon(opp.id, {
        value: opp.value || 25000,
        servico: opp.servico || 'Honorários Advocatícios',
        observacoes: 'Negócio ganho via CRM',
      })

      // DISPARAR EVENTO DE COMPRA (PURCHASE) NO META PIXEL
      const val = opp.value || 25000
      const dispatched = trackPurchase(val, 'BRL', {
        opportunity_id: opp.id,
        content_name: opp.title,
        status: 'won',
      })

      toast({
        title: '🎉 Negócio Fechado com Sucesso!',
        description: dispatched
          ? `Evento fbq('track', 'Purchase', { value: ${val}, currency: 'BRL' }) disparado no Pixel.`
          : 'Status atualizado no CRM SKIP.',
      })

      loadOpportunities()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao atualizar oportunidade',
        variant: 'destructive',
      })
    }
  }

  const handleCreateSampleOpp = async () => {
    if (!tenant) return
    try {
      const opp = await CrmService.createOpportunity(tenant.id, {
        title: 'Contrato Enterprise Scale ' + (opportunities.length + 1),
        value: 75000,
        currency: 'BRL',
        status: 'open',
      })
      trackSubmitApplication({
        content_name: opp.title,
        value: 75000,
        currency: 'BRL',
      })
      toast({
        title: 'Nova Oportunidade Criada',
        description: 'Evento SubmitApplication enviado ao Meta Pixel.',
      })
      loadOpportunities()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Funil de Oportunidades &amp; Conversão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fechamento comercial de alto valor com sincronização automática do evento{' '}
            <code>Purchase</code> no Meta Pixel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pixelId && (
            <Badge
              variant="outline"
              className="h-8 gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-normal"
            >
              <Share2 className="h-3.5 w-3.5" />
              Meta Pixel Ativo
            </Badge>
          )}

          <Button
            onClick={handleCreateSampleOpp}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" /> Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Pipeline Columns / List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Em Aberto */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="font-semibold text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Em Negociação
            </span>
            <Badge variant="secondary" className="font-bold">
              {opportunities.filter((o) => o.status === 'open' || !o.status).length}
            </Badge>
          </div>

          <div className="space-y-3">
            {opportunities.filter((o) => o.status === 'open' || !o.status).length === 0 ? (
              <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhuma oportunidade aberta. Crie uma nova acima.
              </Card>
            ) : (
              opportunities
                .filter((o) => o.status === 'open' || !o.status)
                .map((opp) => (
                  <Card key={opp.id} className="border-border/60 hover:shadow-sm transition-all">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">{opp.title}</CardTitle>
                      <CardDescription className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {(opp.value || 0).toLocaleString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 pb-3 text-xs text-muted-foreground">
                      Proposta enviada • Evento SubmitApplication registrado
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        onClick={() => handleMarkWon(opp)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ganhar &amp; Disparar Purchase
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* Ganhas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Award className="h-4 w-4" /> Ganhas (Conversão Purchase)
            </span>
            <Badge className="bg-emerald-600 font-bold">
              {opportunities.filter((o) => o.status === 'won').length}
            </Badge>
          </div>

          <div className="space-y-3">
            {opportunities.filter((o) => o.status === 'won').length === 0 ? (
              <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhum negócio ganho ainda.
              </Card>
            ) : (
              opportunities
                .filter((o) => o.status === 'won')
                .map((opp) => (
                  <Card key={opp.id} className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{opp.title}</CardTitle>
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px]">
                          Venda Fechada
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {(opp.value || 0).toLocaleString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 pb-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Purchase enviado ao Pixel ({pixelId})
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* Perdidas / Outras */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted border">
            <span className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Perdidas / Arquivadas
            </span>
            <Badge variant="outline">
              {opportunities.filter((o) => o.status === 'lost' || o.status === 'archived').length}
            </Badge>
          </div>

          <div className="space-y-3">
            {opportunities.filter((o) => o.status === 'lost' || o.status === 'archived').length ===
            0 ? (
              <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhuma oportunidade arquivada.
              </Card>
            ) : (
              opportunities
                .filter((o) => o.status === 'lost' || o.status === 'archived')
                .map((opp) => (
                  <Card key={opp.id} className="border-border/40 opacity-70">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">{opp.title}</CardTitle>
                      <CardDescription className="text-xs font-mono">
                        R$ {(opp.value || 0).toLocaleString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
