import React, { useState, useEffect } from 'react'
import { Zap, Plus, Play, CheckCircle2, AlertCircle, ArrowRight, Power, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import { AutomationRecord } from '@/types/platform'

export function AutomacoesPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<AutomationRecord>>({
    nome: '',
    gatilho: 'novo_lead',
    condicoes: { origem: 'Meta Ads' },
    acoes: [{ tipo: 'criar_tarefa', titulo: 'Primeiro contato em até 15 min' }],
    ativo: true,
  })

  const loadAutomations = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const list = await CrmService.getAutomations(tenant.id)
      setAutomations(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAutomations()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.nome) return
    try {
      await CrmService.createAutomation(tenant.id, formData)
      toast({ title: 'Regra de automação criada!' })
      setCreateModalOpen(false)
      loadAutomations()
    } catch (err) {
      toast({ title: 'Erro ao criar regra', variant: 'destructive' })
    }
  }

  const toggleStatus = async (auto: AutomationRecord) => {
    try {
      await CrmService.updateAutomation(auto.id, { ativo: !auto.ativo })
      toast({ title: `Automação ${!auto.ativo ? 'ativada' : 'pausada'}` })
      loadAutomations()
    } catch (e) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">
            Automações &amp; Fluxos Inteligentes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Construtor visual de regras: Gatilho → Condição → Ações Automáticas.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Regra de Automação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((auto) => (
          <div key={auto.id} className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-sm">{auto.nome}</h3>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Execuções realizadas: <strong>{auto.execucoes || 0}</strong>
                </div>
              </div>
              <Button
                variant={auto.ativo ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleStatus(auto)}
                className="h-7 text-xs"
              >
                {auto.ativo ? 'Ativa' : 'Pausada'}
              </Button>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="text-blue-600 dark:text-blue-400">
                <strong>QUANDO:</strong> {auto.gatilho}
              </div>
              <div className="text-muted-foreground">
                <strong>SE:</strong> {JSON.stringify(auto.condicoes || {})}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                <strong>ENTÃO:</strong> {JSON.stringify(auto.acoes || [])}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Criar Regra de Automação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Regra *</Label>
              <Input
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Alerta Lead Quente Meta Ads"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Gatilho (Evento Disparador)</Label>
              <Select
                value={formData.gatilho}
                onValueChange={(val) => setFormData({ ...formData, gatilho: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo_lead">Novo Lead Criado</SelectItem>
                  <SelectItem value="lead_quente">Lead Marcado como Quente</SelectItem>
                  <SelectItem value="proposta_aceita">Proposta Aceita pelo Cliente</SelectItem>
                  <SelectItem value="contrato_assinado">Contrato Assinado</SelectItem>
                  <SelectItem value="ganho">Oportunidade Fechada (Ganho)</SelectItem>
                  <SelectItem value="perda">Oportunidade Perdida</SelectItem>
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
                Criar Automação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AutomacoesPage
