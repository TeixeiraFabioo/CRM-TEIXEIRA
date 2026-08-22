import React, { useState, useEffect } from 'react'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Users,
  Briefcase,
  Target,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useToast } from '@/hooks/use-toast'
import { useTenant, useUserRole } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { LeadRecord, CustomerRecord, OpportunityRecord } from '@/types/platform'

interface TrashItem {
  id: string
  type: 'lead' | 'customer' | 'opportunity'
  typeLabel: 'Lead' | 'Cliente' | 'Oportunidade'
  title: string
  subtitle?: string
  deletedAt: string
  deletedBy?: string
  raw: LeadRecord | CustomerRecord | OpportunityRecord
}

export function TrashPage() {
  const { tenant } = useTenant()
  const { role: userRole } = useUserRole()
  const { toast } = useToast()

  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'lead' | 'customer' | 'opportunity'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [actionItem, setActionItem] = useState<TrashItem | null>(null)
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadTrash = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const { leads, customers, opportunities } = await CrmService.getTrashRecords(tenant.id)

      const unified: TrashItem[] = [
        ...leads.map(
          (l): TrashItem => ({
            id: l.id,
            type: 'lead',
            typeLabel: 'Lead',
            title: l.name,
            subtitle: l.company || l.email || l.phone,
            deletedAt: l.updated || l.created || new Date().toISOString(),
            deletedBy:
              l.expand?.assigned_to?.name || l.expand?.responsavel_id?.name || 'Sistema / Usuário',
            raw: l,
          }),
        ),
        ...customers.map(
          (c): TrashItem => ({
            id: c.id,
            type: 'customer',
            typeLabel: 'Cliente',
            title: c.name,
            subtitle: c.company || c.document || c.email,
            deletedAt: c.updated || c.created || new Date().toISOString(),
            deletedBy: c.expand?.responsavel_id?.name || 'Sistema / Usuário',
            raw: c,
          }),
        ),
        ...opportunities.map(
          (o): TrashItem => ({
            id: o.id,
            type: 'opportunity',
            typeLabel: 'Oportunidade',
            title: o.title,
            subtitle: `R$ ${Number(o.value || 0).toLocaleString('pt-BR')}`,
            deletedAt: o.updated || o.created || new Date().toISOString(),
            deletedBy:
              o.expand?.assigned_to?.name || o.expand?.responsavel_id?.name || 'Sistema / Usuário',
            raw: o,
          }),
        ),
      ]

      // Sort by deletion/updated date descending
      unified.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
      setItems(unified)
    } catch (err: any) {
      console.error('Error loading trash:', err)
      toast({ title: 'Erro ao carregar lixeira', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [tenant?.id])

  const handleRestore = async (item: TrashItem) => {
    setIsProcessing(true)
    try {
      if (item.type === 'lead') {
        await CrmService.restoreLead(item.id)
      } else if (item.type === 'customer') {
        await CrmService.restoreCustomer(item.id)
      } else if (item.type === 'opportunity') {
        await CrmService.restoreOpportunity(item.id)
      }

      toast({
        title: `${item.typeLabel} restaurado com sucesso!`,
        description: `"${item.title}" foi devolvido para o módulo ativo.`,
      })
      setActionItem(null)
      setActionType(null)
      await loadTrash()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao restaurar registro',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePermanentDelete = async (item: TrashItem) => {
    setIsProcessing(true)
    try {
      if (item.type === 'lead') {
        await CrmService.deleteLeadPermanent(item.id)
      } else if (item.type === 'customer') {
        await CrmService.deleteCustomerPermanent(item.id)
      } else if (item.type === 'opportunity') {
        await CrmService.deleteOpportunityPermanent(item.id)
      }

      toast({
        title: `${item.typeLabel} excluído permanentemente!`,
        description: `"${item.title}" foi removido definitivamente da base de dados.`,
      })
      setActionItem(null)
      setActionType(null)
      await loadTrash()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao excluir permanentemente',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType
    const q = searchTerm.toLowerCase()
    const matchesQuery =
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.deletedBy && item.deletedBy.toLowerCase().includes(q))

    return matchesType && matchesQuery
  })

  // Calculate days remaining (placeholder 30 days retention policy)
  const calculateDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt).getTime()
    const now = Date.now()
    const elapsedDays = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24))
    const remaining = 30 - elapsedDays
    return remaining > 0 ? remaining : 0
  }

  if (userRole !== 'admin') {
    return (
      <div className="p-8 text-center bg-card border border-border/80 rounded-xl space-y-3">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold">Acesso Restrito ao Administrador</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Apenas administradores do escritório têm permissão para acessar a Lixeira e restaurar ou
          excluir dados definitivamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
                Lixeira do Sistema
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recuperação de leads, clientes e oportunidades arquivados com soft-delete (retenção
                automática de 30 dias).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTrash}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Retention Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <strong>Política de Retenção:</strong> Itens na lixeira são mantidos por até{' '}
          <strong>30 dias</strong> após a exclusão antes da purga automática definitiva.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, contato, documento ou responsável..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-48">
              <SelectValue placeholder="Tipo de Registro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos ({items.length})</SelectItem>
              <SelectItem value="lead">
                Leads ({items.filter((i) => i.type === 'lead').length})
              </SelectItem>
              <SelectItem value="customer">
                Clientes ({items.filter((i) => i.type === 'customer').length})
              </SelectItem>
              <SelectItem value="opportunity">
                Oportunidades ({items.filter((i) => i.type === 'opportunity').length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Tipo</th>
                <th className="p-3.5">Registro / Título</th>
                <th className="p-3.5">Data da Exclusão</th>
                <th className="p-3.5">Excluído por</th>
                <th className="p-3.5">Expiração</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando itens da lixeira...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Trash2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    Lixeira vazia. Nenhum registro excluído recentemente.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const daysLeft = calculateDaysRemaining(item.deletedAt)

                  return (
                    <tr
                      key={`${item.type}_${item.id}`}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* Tipo */}
                      <td className="p-3.5 pl-4">
                        {item.type === 'lead' && (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px]">
                            <Users className="h-3 w-3" /> Lead
                          </Badge>
                        )}
                        {item.type === 'customer' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                            <Briefcase className="h-3 w-3" /> Cliente
                          </Badge>
                        )}
                        {item.type === 'opportunity' && (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 text-[11px]">
                            <Target className="h-3 w-3" /> Oportunidade
                          </Badge>
                        )}
                      </td>

                      {/* Título & Detalhe */}
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground">{item.subtitle}</div>
                        )}
                      </td>

                      {/* Data Exclusão */}
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(item.deletedAt).toLocaleDateString('pt-BR')}{' '}
                        <span className="text-[10px] text-muted-foreground/70">
                          {new Date(item.deletedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Quem Excluiu */}
                      <td className="p-3.5 text-muted-foreground">{item.deletedBy}</td>

                      {/* Dias restantes */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" /> {daysLeft} dias restantes
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionItem(item)
                              setActionType('restore')
                            }}
                            className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 border-emerald-500/30"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setActionItem(item)
                              setActionType('delete')
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir Definitivo
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
      </div>

      {/* CONFIRM RESTORE DIALOG */}
      <AlertDialog
        open={actionType === 'restore' && !!actionItem}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              Restaurar {actionItem?.typeLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Deseja restaurar o registro &quot;{actionItem?.title}&quot;? Ele voltará a aparecer
              normalmente na listagem ativa do módulo correspondente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionItem && handleRestore(actionItem)}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? 'Restaurando...' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM PERMANENT DELETE DIALOG */}
      <AlertDialog
        open={actionType === 'delete' && !!actionItem}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Excluir Permanentemente este {actionItem?.typeLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza de que deseja apagar definitivamente o registro &quot;{actionItem?.title}
              &quot;? Esta operação é irreversível e removerá todos os dados do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionItem && handlePermanentDelete(actionItem)}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isProcessing ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TrashPage
