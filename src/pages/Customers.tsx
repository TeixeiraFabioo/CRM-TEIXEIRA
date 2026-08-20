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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { CustomerRecord } from '@/types/platform'

export function CustomersPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.document || '').includes(q)
    )
  })

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
              {filteredCustomers.length} clientes ativos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carteira de clientes convertidos com contratos ativos e histórico perpétuo.
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

      {/* Search Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do cliente, empresa, CPF/CNPJ, e-mail..."
            className="pl-9 h-9 text-xs"
          />
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

                    {/* Status */}
                    <td className="p-3.5">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        {cust.status || 'Ativo'}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/clientes/${cust.id}`)}
                        className="h-7 text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Visão 360º
                      </Button>
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
