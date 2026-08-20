import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Search, Plus, Phone, Mail, Building2, Tag, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { PessoaRecord, EmpresaRecord } from '@/types/platform'

export function PessoasPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [pessoas, setPessoas] = useState<PessoaRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<PessoaRecord>>({
    nome: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cpf: '',
    cargo: '',
    empresa_id: '',
    observacoes: '',
  })

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [pessoasData, empresasData] = await Promise.all([
        CrmService.getPessoas(tenant.id),
        CrmService.getEmpresas(tenant.id),
      ])
      setPessoas(pessoasData)
      setEmpresas(empresasData)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar pessoas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !formData.nome) return
    try {
      await CrmService.createPessoa(tenant.id, formData)
      toast({ title: 'Pessoa/Contato cadastrado com sucesso!' })
      setCreateModalOpen(false)
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        whatsapp: '',
        cpf: '',
        cargo: '',
        empresa_id: '',
        observacoes: '',
      })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao cadastrar', variant: 'destructive' })
    }
  }

  const filteredPessoas = pessoas.filter((p) => {
    const q = searchTerm.toLowerCase()
    return (
      (p.nome || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.cargo || '').toLowerCase().includes(q) ||
      (p.cpf || '').includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-legal-serif">
              Pessoas &amp; Decisores
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredPessoas.length} contatos
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastro unificado de sócios, diretores, procuradores e contatos-chave.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Pessoa / Decisor
        </Button>
      </div>

      {/* Search */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, cargo, e-mail, CPF..."
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
                <th className="p-3.5 pl-4">Nome Completo</th>
                <th className="p-3.5">Cargo / Função</th>
                <th className="p-3.5">Empresa Vinculada</th>
                <th className="p-3.5">Contato / E-mail</th>
                <th className="p-3.5">CPF</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando contatos...
                  </td>
                </tr>
              ) : filteredPessoas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Nenhuma pessoa cadastrada.
                  </td>
                </tr>
              ) : (
                filteredPessoas.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3.5 pl-4 font-semibold text-foreground">{p.nome}</td>
                    <td className="p-3.5 text-muted-foreground">{p.cargo || 'Não informado'}</td>
                    <td className="p-3.5 font-medium">
                      {p.expand?.empresa_id?.razao_social || 'Autônomo / Direto'}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {p.whatsapp || p.telefone ? <span>{p.whatsapp || p.telefone}</span> : null}
                        {p.email && <span className="text-muted-foreground">({p.email})</span>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {p.cpf || '—'}
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pessoas/${p.id}`)}
                        className="h-7 text-xs"
                      >
                        Ver Perfil
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Cadastrar Pessoa / Decisor
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cargo / Função</Label>
                <Input
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Diretor Financeiro"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
                <Input
                  value={formData.whatsapp || formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value, telefone: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Empresa Vinculada</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(val) => setFormData({ ...formData, empresa_id: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.razao_social}
                    </SelectItem>
                  ))}
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
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PessoasPage
