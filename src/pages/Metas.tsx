import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  Target,
  Plus,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  DollarSign,
  FileText,
  UserCheck,
  Edit2,
  Trash2,
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
import { GoalRecord, ContractRecord, LeadRecord, UserRecord } from '@/types/platform'

interface GoalWithProgress extends GoalRecord {
  calculatedCurrent: number
  calculatedPct: number
  totalContractsCount: number
  totalSignedValue: number
  totalLeadsCount: number
}

export function MetasPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [goalsWithProgress, setGoalsWithProgress] = useState<GoalWithProgress[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit goal
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null)
  const [goalData, setGoalData] = useState({
    titulo: '',
    tipo: 'valor' as 'valor' | 'contratos' | 'leads',
    valor_alvo: 50000,
    equipe: 'comercial',
    usuario_id: '',
    periodo: 'mensal',
    data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    data_fim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split('T')[0],
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [goalsList, contractsList, leadsList, usersList] = await Promise.all([
        CrmService.getGoals(tenant.id),
        CrmService.getContracts(tenant.id),
        CrmService.getLeads(tenant.id),
        CrmService.getUsers(tenant.id),
      ])

      setUsers(usersList)

      // Calculate real progress for each goal
      const calculatedGoals: GoalWithProgress[] = goalsList.map((g) => {
        const start = g.data_inicio ? new Date(g.data_inicio).getTime() : 0
        const end = g.data_fim ? new Date(`${g.data_fim}T23:59:59.999Z`).getTime() : Infinity

        // Filter contracts within period
        const relevantContracts = contractsList.filter((c) => {
          const isSigned =
            (c.status || '').toLowerCase() === 'assinado' ||
            (c.sign_status || '').toLowerCase() === 'signed'
          if (!isSigned) return false

          const cDate = c.data_assinatura
            ? new Date(c.data_assinatura).getTime()
            : c.created
              ? new Date(c.created).getTime()
              : 0

          if (start && cDate < start) return false
          if (end !== Infinity && cDate > end) return false

          return true
        })

        // Filter leads within period
        const relevantLeads = leadsList.filter((l) => {
          const lDate = l.created ? new Date(l.created).getTime() : 0
          if (start && lDate < start) return false
          if (end !== Infinity && lDate > end) return false
          return true
        })

        const signedContractsCount = relevantContracts.length
        const signedContractsSum = relevantContracts.reduce(
          (acc, c) => acc + (Number(c.valor) || 0),
          0,
        )
        const leadsCount = relevantLeads.length

        let current = 0
        const tipoLower = (g.tipo || 'valor').toLowerCase()

        if (tipoLower === 'contratos' || tipoLower === 'quantidade') {
          current = signedContractsCount
        } else if (tipoLower === 'leads' || tipoLower === 'captacao') {
          current = leadsCount
        } else {
          // valor / receita / faturamento
          current = signedContractsSum
        }

        const target = Number(g.valor_alvo) || 1
        const pct = Math.min(100, Math.round((current / target) * 100))

        return {
          ...g,
          calculatedCurrent: current,
          calculatedPct: pct,
          totalContractsCount: signedContractsCount,
          totalSignedValue: signedContractsSum,
          totalLeadsCount: leadsCount,
        }
      })

      setGoalsWithProgress(calculatedGoals)
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Erro ao carregar metas e progresso', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !goalData.titulo.trim()) return

    try {
      const payload: Partial<GoalRecord> = {
        titulo: goalData.titulo.trim(),
        tipo: goalData.tipo,
        valor_alvo: Number(goalData.valor_alvo) || 1000,
        equipe: goalData.equipe,
        usuario_id: goalData.usuario_id || undefined,
        periodo: goalData.periodo,
        data_inicio: goalData.data_inicio,
        data_fim: goalData.data_fim,
      }

      if (editingGoal) {
        await CrmService.updateGoal(editingGoal.id, payload)
        toast({ title: 'Meta atualizada com sucesso!' })
      } else {
        await CrmService.createGoal(tenant.id, payload)
        toast({ title: 'Meta cadastrada com sucesso!' })
      }

      setGoalModalOpen(false)
      setEditingGoal(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar meta', description: err?.message, variant: 'destructive' })
    }
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      await CrmService.deleteGoal(id)
      toast({ title: 'Meta removida com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover meta', variant: 'destructive' })
    }
  }

  // Summary Metrics
  const totalGoals = goalsWithProgress.length
  const completedGoals = goalsWithProgress.filter((g) => g.calculatedPct >= 100).length
  const averagePct =
    totalGoals > 0
      ? Math.round(goalsWithProgress.reduce((acc, g) => acc + g.calculatedPct, 0) / totalGoals)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metas Comerciais &amp; Faturamento
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhamento em tempo real de metas de receita (R$), contratos assinados e captação de
            leads.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingGoal(null)
            setGoalData({
              titulo: '',
              tipo: 'valor',
              valor_alvo: 50000,
              equipe: 'comercial',
              usuario_id: '',
              periodo: 'mensal',
              data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                .toISOString()
                .split('T')[0],
              data_fim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                .toISOString()
                .split('T')[0],
            })
            setGoalModalOpen(true)
          }}
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total de Metas Ativas</div>
            <div className="text-xl font-bold font-legal-serif">{totalGoals}</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Metas Batidas (&gt;= 100%)</div>
            <div className="text-xl font-bold font-legal-serif text-emerald-600">
              {completedGoals} / {totalGoals}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Atingimento Médio</div>
            <div className="text-xl font-bold font-legal-serif">{averagePct}%</div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : goalsWithProgress.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center space-y-3">
          <Target className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <h3 className="font-semibold text-sm">Nenhuma meta cadastrada no momento</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Defina metas para seu escritório por faturamento em contratos assinados, quantidade de
            contratos ou volume de captação de leads.
          </p>
          <Button
            size="sm"
            onClick={() => setGoalModalOpen(true)}
            className="h-8 text-xs bg-[#0A1F3F] text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar Primeira Meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalsWithProgress.map((g) => {
            const isValue = (g.tipo || 'valor').toLowerCase() === 'valor'
            const isLeads = (g.tipo || '').toLowerCase() === 'leads'

            return (
              <div
                key={g.id}
                className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground font-legal-serif">
                        {g.titulo}
                      </h3>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {g.tipo || 'valor'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">Equipe: {g.equipe || 'Geral'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {g.periodo || 'Mensal'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      className={
                        g.calculatedPct >= 100
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold'
                          : g.calculatedPct >= 50
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs font-bold'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-bold'
                      }
                    >
                      {g.calculatedPct}% Atingido
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingGoal(g)
                        setGoalData({
                          titulo: g.titulo,
                          tipo: (g.tipo as any) || 'valor',
                          valor_alvo: g.valor_alvo || 10000,
                          equipe: g.equipe || 'comercial',
                          usuario_id: g.usuario_id || '',
                          periodo: g.periodo || 'mensal',
                          data_inicio: g.data_inicio || '',
                          data_fim: g.data_fim || '',
                        })
                        setGoalModalOpen(true)
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(g.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar and Values */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground flex items-center gap-1">
                      Realizado:{' '}
                      <strong className="text-primary font-mono">
                        {isValue
                          ? `R$ ${Number(g.calculatedCurrent).toLocaleString('pt-BR')}`
                          : `${g.calculatedCurrent} ${isLeads ? 'leads' : 'contratos'}`}
                      </strong>
                    </span>
                    <span className="text-muted-foreground font-mono">
                      Meta:{' '}
                      {isValue
                        ? `R$ ${Number(g.valor_alvo).toLocaleString('pt-BR')}`
                        : `${g.valor_alvo} ${isLeads ? 'leads' : 'contratos'}`}
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden border">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        g.calculatedPct >= 100
                          ? 'bg-emerald-500'
                          : g.calculatedPct >= 50
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, g.calculatedPct)}%` }}
                    />
                  </div>
                </div>

                {/* Real-time Sub-metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">Contratos Assinados:</span>
                    <span className="font-bold text-foreground font-mono">
                      {g.totalContractsCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Receita em Contratos:</span>
                    <span className="font-bold text-foreground font-mono">
                      R$ {Number(g.totalSignedValue).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Leads no Período:</span>
                    <span className="font-bold text-foreground font-mono">{g.totalLeadsCount}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR META */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {editingGoal ? 'Editar Meta' : 'Cadastrar Nova Meta'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título da Meta *</Label>
              <Input
                required
                placeholder="Ex: Faturamento Contratos Q3, 10 Contratos Tributários"
                value={goalData.titulo}
                onChange={(e) => setGoalData({ ...goalData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Métrica / Tipo de Meta *</Label>
                <Select
                  value={goalData.tipo}
                  onValueChange={(val: any) => setGoalData({ ...goalData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valor">Valor Total (R$ Contratos)</SelectItem>
                    <SelectItem value="contratos">Quantidade de Contratos</SelectItem>
                    <SelectItem value="leads">Volume de Leads Captados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Alvo / Quantidade ({goalData.tipo === 'valor' ? 'R$' : 'Unid.'}) *
                </Label>
                <Input
                  required
                  type="number"
                  value={goalData.valor_alvo}
                  onChange={(e) => setGoalData({ ...goalData, valor_alvo: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Equipe</Label>
                <Select
                  value={goalData.equipe}
                  onValueChange={(val) => setGoalData({ ...goalData, equipe: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="geral">Geral / Escritório</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Período</Label>
                <Select
                  value={goalData.periodo}
                  onValueChange={(val) => setGoalData({ ...goalData, periodo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data Início</Label>
                <Input
                  type="date"
                  value={goalData.data_inicio}
                  onChange={(e) => setGoalData({ ...goalData, data_inicio: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data Fim</Label>
                <Input
                  type="date"
                  value={goalData.data_fim}
                  onChange={(e) => setGoalData({ ...goalData, data_fim: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGoalModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default MetasPage
