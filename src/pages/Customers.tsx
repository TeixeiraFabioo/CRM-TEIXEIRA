import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  FileCheck,
  Eye,
  FileDown,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useTenant, useUserRole } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { CustomerRecord } from '@/types/platform'

export function CustomersPage() {
  const { tenant } = useTenant()
  const { role: userRole } = useUserRole()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [togglingCustomerId, setTogglingCustomerId] = useState<string | null>(null)

  const loadCustomers = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const data = await CrmService.getCustomers(tenant.id)
      setCustomers(data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [tenant?.id])

  const handleToggleCustomerActive = async (e: React.MouseEvent, cust: CustomerRecord) => {
    e.stopPropagation()
    const currentActive = cust.active !== false && cust.status !== 'Inativo'
    const newActive = !currentActive
    setTogglingCustomerId(cust.id)

    try {
      await pb.collection('customers').update(cust.id, {
        active: newActive,
        status: newActive ? 'Ativo' : 'Inativo',
      })

      if (tenant?.id) {
        await CrmService.logAudit(
          tenant.id,
          newActive ? 'activate_customer' : 'deactivate_customer',
          'customer',
          cust.id,
          { active: currentActive, status: cust.status },
          { active: newActive, status: newActive ? 'Ativo' : 'Inativo' },
        )
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cust.id
            ? { ...c, active: newActive, status: newActive ? 'Ativo' : 'Inativo' }
            : c,
        ),
      )

      toast({
        title: newActive ? 'Cliente Ativado' : 'Cliente Inativado',
        description: `Status de ${cust.name} atualizado para ${newActive ? 'Ativo' : 'Inativo'}.`,
      })
    } catch (err: any) {
      console.error('Error toggling customer status:', err)
      toast({
        title: 'Erro ao atualizar status do cliente',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setTogglingCustomerId(null)
    }
  }

  const handleDeleteCustomer = async (e: React.MouseEvent, cust: CustomerRecord) => {
    e.stopPropagation()
    const confirmed = window.confirm('Tem certeza que deseja excluir este cliente?')
    if (!confirmed) return

    try {
      await pb.collection('customers').delete(cust.id)
      toast({
        title: 'Cliente excluído',
        description: `${cust.name} foi removido da carteira.`,
      })
      await loadCustomers()
    } catch (err: any) {
      console.error('Error deleting customer:', err)
      toast({
        title: 'Erro ao excluir cliente',
        description: err?.message || 'Falha ao excluir no banco de dados.',
        variant: 'destructive',
      })
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase()
    const matchesQuery =
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.document || '').includes(q)

    const isCustomerActive = c.active !== false && c.status !== 'Inativo'
    if (statusFilter === 'active') return matchesQuery && isCustomerActive
    if (statusFilter === 'inactive') return matchesQuery && !isCustomerActive
    return matchesQuery
  })

  const activeCustomersCount = customers.filter(
    (c) => c.active !== false && c.status !== 'Inativo',
  ).length
  const inactiveCustomersCount = customers.length - activeCustomersCount

  const totalContracted = customers.reduce(
    (sum, c) => sum + (c.lifetime_value || c.valor_total_contratado || 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Clientes Jurídicos Contratados
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {activeCustomersCount} ativos • {inactiveCustomersCount} inativos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carteira de clientes convertidos com gestão de status, contratos e histórico perpétuo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold uppercase">
              Receita Total em Carteira
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              R$ {totalContracted.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar & Status Filter */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do cliente, empresa, CPF/CNPJ, e-mail..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-muted/50 p-1 rounded-lg border text-xs">
          <Button
            type="button"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'all' ? 'bg-[#0A1F3F] text-white' : ''}`}
          >
            Todos ({customers.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'active' ? 'bg-emerald-700 text-white' : ''}`}
          >
            Ativos ({activeCustomersCount})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'inactive' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
            className={`h-7 text-xs px-2.5 ${statusFilter === 'inactive' ? 'bg-slate-700 text-white' : ''}`}
          >
            Inativos ({inactiveCustomersCount})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Cliente / Titular</th>
                <th className="p-3.5">Empresa / Documento</th>
                <th className="p-3.5">Serviços Contratados</th>
                <th className="p-3.5">Valor Total Contratado</th>
                <th className="p-3.5">Data de Conversão</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Carregando carteira de clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Nenhum cliente contratado encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/clientes/${cust.id}`)}
                  >
                    {/* Name */}
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cust.name}
                      </div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-2 mt-0.5">
                        {cust.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cust.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company & CPF/CNPJ */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">
                        {cust.company || 'Pessoa Física'}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {cust.document || '—'}
                      </div>
                    </td>

                    {/* Services */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">
                        {Array.isArray(cust.servicos_contratados) &&
                        cust.servicos_contratados.length > 0
                          ? cust.servicos_contratados.join(', ')
                          : 'Assessoria Jurídica Especializada'}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="p-3.5 font-bold text-foreground">
                      R${' '}
                      {Number(
                        cust.lifetime_value || cust.valor_total_contratado || 0,
                      ).toLocaleString('pt-BR')}
                    </td>

                    {/* Conversion Date */}
                    <td className="p-3.5 text-muted-foreground text-[11px] whitespace-nowrap">
                      {cust.data_conversao || cust.created
                        ? new Date(cust.data_conversao || cust.created!).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>

                    {/* Status & Active Switch Toggle */}
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cust.active !== false && cust.status !== 'Inativo'}
                          disabled={togglingCustomerId === cust.id}
                          onCheckedChange={() => {
                            const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent
                            handleToggleCustomerActive(syntheticEvent, cust)
                          }}
                          aria-label="Alternar status do cliente"
                        />
                        <Badge
                          className={
                            cust.active !== false && cust.status !== 'Inativo'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]'
                          }
                        >
                          {cust.active !== false && cust.status !== 'Inativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clientes/${cust.id}`)}
                          className="h-7 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visão 360º
                        </Button>
                        {userRole === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteCustomer(e, cust)}
                            className="h-7 text-xs gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default CustomersPage
