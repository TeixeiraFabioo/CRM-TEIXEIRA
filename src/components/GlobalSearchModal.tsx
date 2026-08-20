import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Users,
  Building2,
  Briefcase,
  Target,
  FileText,
  User,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    leads: any[]
    customers: any[]
    opportunities: any[]
    pessoas: any[]
    empresas: any[]
    proposals: any[]
  }>({
    leads: [],
    customers: [],
    opportunities: [],
    pessoas: [],
    empresas: [],
    proposals: [],
  })

  useEffect(() => {
    if (!query.trim() || !tenant?.id) {
      setResults({
        leads: [],
        customers: [],
        opportunities: [],
        pessoas: [],
        empresas: [],
        proposals: [],
      })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const q = query.toLowerCase()
      try {
        const [leads, customers, opps, pessoas, empresas, proposals] = await Promise.all([
          CrmService.getLeads(tenant.id),
          CrmService.getCustomers(tenant.id),
          CrmService.getOpportunities(tenant.id),
          CrmService.getPessoas(tenant.id),
          CrmService.getEmpresas(tenant.id),
          CrmService.getProposals(tenant.id),
        ])

        setResults({
          leads: leads.filter(
            (l) =>
              (l.name || '').toLowerCase().includes(q) ||
              (l.email || '').toLowerCase().includes(q) ||
              (l.phone || '').includes(q),
          ),
          customers: customers.filter(
            (c) =>
              (c.name || '').toLowerCase().includes(q) ||
              (c.company || '').toLowerCase().includes(q) ||
              (c.document || '').includes(q),
          ),
          opportunities: opps.filter(
            (o) =>
              (o.title || '').toLowerCase().includes(q) ||
              (o.servico || '').toLowerCase().includes(q),
          ),
          pessoas: pessoas.filter(
            (p) =>
              (p.nome || '').toLowerCase().includes(q) ||
              (p.email || '').toLowerCase().includes(q) ||
              (p.cpf || '').includes(q),
          ),
          empresas: empresas.filter(
            (e) =>
              (e.razao_social || '').toLowerCase().includes(q) ||
              (e.nome_fantasia || '').toLowerCase().includes(q) ||
              (e.cnpj || '').includes(q),
          ),
          proposals: proposals.filter((pr) => (pr.titulo || '').toLowerCase().includes(q)),
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, tenant?.id])

  const totalResults =
    results.leads.length +
    results.customers.length +
    results.opportunities.length +
    results.pessoas.length +
    results.empresas.length +
    results.proposals.length

  const handleSelect = (path: string) => {
    onOpenChange(false)
    setQuery('')
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-border/80 shadow-2xl">
        <DialogHeader className="p-4 border-b pb-3">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar leads, clientes, empresas, oportunidades, propostas... (Ctrl+K)"
              className="border-0 focus-visible:ring-0 text-base shadow-none p-0 h-9"
              autoFocus
            />
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!query && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para pesquisar em todo o CRM jurídico.
            </div>
          )}

          {query && totalResults === 0 && !loading && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          )}

          {/* LEADS */}
          {results.leads.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" /> Leads ({results.leads.length})
              </div>
              <div className="space-y-1">
                {results.leads.slice(0, 4).map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelect(`/leads/${lead.id}`)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {lead.name}
                        {lead.temperature && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            {lead.temperature}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lead.email || lead.phone || 'Sem contato direto'} •{' '}
                        {lead.origem || lead.source || 'Meta Ads'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OPORTUNIDADES */}
          {results.opportunities.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-500" /> Oportunidades (
                {results.opportunities.length})
              </div>
              <div className="space-y-1">
                {results.opportunities.slice(0, 4).map((opp) => (
                  <button
                    key={opp.id}
                    onClick={() => handleSelect(`/oportunidades/${opp.id}`)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {opp.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opp.value
                          ? `R$ ${Number(opp.value).toLocaleString('pt-BR')}`
                          : 'Valor não definido'}{' '}
                        • {opp.status}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLIENTES */}
          {results.customers.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-500" /> Clientes (
                {results.customers.length})
              </div>
              <div className="space-y-1">
                {results.customers.slice(0, 4).map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => handleSelect(`/clientes/${cust.id}`)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {cust.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cust.document || cust.email || cust.phone || 'Cliente Ativo'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EMPRESAS */}
          {results.empresas.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-500" /> Empresas (
                {results.empresas.length})
              </div>
              <div className="space-y-1">
                {results.empresas.slice(0, 4).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect(`/empresas/${emp.id}`)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {emp.razao_social} {emp.nome_fantasia ? `(${emp.nome_fantasia})` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        CNPJ: {emp.cnpj || 'Não informado'} • {emp.cidade || 'Brasil'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-muted/40 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Pressione{' '}
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">Esc</kbd> para
            fechar
          </span>
          <span>Teixeira &amp; Nascimento Advogados CRM</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
