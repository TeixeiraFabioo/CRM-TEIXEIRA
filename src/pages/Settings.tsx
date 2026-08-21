import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Shield,
  Clock,
  Briefcase,
  Share2,
  Tag,
  FileText,
  Plus,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { TenantService } from '@/services/tenant'
import {
  ServiceRecord,
  TagRecord,
  TemplateRecord,
  SlaConfigRecord,
  UserRecord,
} from '@/types/platform'

export function SettingsPage() {
  const { tenant, user, refreshTenant, logout } = useTenant()
  const { toast } = useToast()

  const [services, setServices] = useState<ServiceRecord[]>([])
  const [tags, setTags] = useState<TagRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [slas, setSlas] = useState<SlaConfigRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Office settings
  const [officeName, setOfficeName] = useState('Teixeira & Nascimento – Advogados')
  const [metaPixelId, setMetaPixelId] = useState(tenant?.meta_pixel_id || '948271038592014')
  const [oabRegistro, setOabRegistro] = useState('OAB/SP 48.920')
  const [endereco, setEndereco] = useState(
    'Av. Paulista, 1842 - Edifício Horizon, 14º Andar - São Paulo/SP',
  )

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [newService, setNewService] = useState({
    nome: '',
    area: 'Direito Tributário',
    valor_padrao: 15000,
    categoria: 'Consultoria',
  })

  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [newTag, setNewTag] = useState({
    nome: '',
    cor: '#2563eb',
    modulo: 'leads',
  })

  const loadAll = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [sList, tList, tmpList, slaList, uList] = await Promise.all([
        CrmService.getServices(tenant.id),
        CrmService.getTags(tenant.id),
        CrmService.getTemplates(tenant.id),
        CrmService.getSlaConfigs(tenant.id),
        CrmService.getUsers(tenant.id),
      ])
      setServices(sList)
      setTags(tList)
      setTemplates(tmpList)
      setSlas(slaList)
      setUsers(uList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [tenant?.id])

  const handleSaveOffice = async () => {
    if (!tenant?.id) return
    try {
      await TenantService.updateTenantSettings(tenant.id, {
        meta_pixel_id: metaPixelId,
        settings: {
          ...tenant.settings,
          meta_pixel_id: metaPixelId,
          oab_registro: oabRegistro,
          endereco_completo: endereco,
        },
      })
      await CrmService.logAudit(tenant.id, 'update_settings', 'tenant', tenant.id, null, {
        metaPixelId,
        oabRegistro,
      })
      toast({ title: 'Configurações do escritório salvas com sucesso!' })
      refreshTenant()
    } catch (e) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !newService.nome) return
    try {
      await CrmService.createService(tenant.id, newService)
      toast({ title: 'Serviço jurídico cadastrado!' })
      setServiceModalOpen(false)
      loadAll()
    } catch (e) {
      toast({ title: 'Erro ao cadastrar serviço', variant: 'destructive' })
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !newTag.nome) return
    try {
      await CrmService.createTag(tenant.id, newTag)
      toast({ title: 'Tag cadastrada!' })
      setTagModalOpen(false)
      loadAll()
    } catch (e) {
      toast({ title: 'Erro ao cadastrar tag', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-legal-serif">Configurações do Escritório</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestão multi-tenant, equipes jurídicas, catálogo de serviços, SLAs e integrações.
        </p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4">
          <TabsTrigger
            value="empresa"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
          >
            Escritório &amp; Pixel
          </TabsTrigger>
          <TabsTrigger
            value="servicos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
          >
            Serviços Jurídicos ({services.length})
          </TabsTrigger>
          <TabsTrigger
            value="usuarios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
          >
            Equipe &amp; Usuários ({users.length})
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
          >
            Tags &amp; Categorias ({tags.length})
          </TabsTrigger>
          <TabsTrigger
            value="sla"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2"
          >
            Regras de SLA ({slas.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB ESCRITORIO */}
        <TabsContent value="empresa" className="pt-4 space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4 max-w-2xl">
            <h3 className="font-bold text-sm">Dados da Sociedade de Advogados</h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs">Razão Social / Nome do Escritório</Label>
                <Input
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Registro OAB Sociedade</Label>
                <Input
                  value={oabRegistro}
                  onChange={(e) => setOabRegistro(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Endereço Completo</Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Meta Pixel ID (Rastreamento Oficial)</Label>
                <Input
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  className="h-9 text-xs font-mono mt-1"
                />
              </div>
              <Button
                onClick={handleSaveOffice}
                className="bg-[#0A1F3F] text-white text-xs gap-1.5 mt-2"
              >
                <Save className="h-4 w-4" /> Salvar Alterações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB SERVIÇOS */}
        <TabsContent value="servicos" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">Catálogo de Serviços Jurídicos</h3>
            <Button
              size="sm"
              onClick={() => setServiceModalOpen(true)}
              className="h-8 text-xs bg-[#0A1F3F] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo Serviço
            </Button>
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b">
                <tr>
                  <th className="p-3 pl-4">Serviço</th>
                  <th className="p-3">Área de Atuação</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Honorário Padrão</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 pl-4 font-semibold">{s.nome}</td>
                    <td className="p-3">{s.area}</td>
                    <td className="p-3">{s.categoria || 'Geral'}</td>
                    <td className="p-3 font-bold">
                      R$ {Number(s.valor_padrao || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB USUARIOS */}
        <TabsContent value="usuarios" className="pt-4 space-y-4">
          {/* Active Logged In User Card */}
          {user && (
            <div className="bg-[#0A1F3F] text-white p-4 rounded-xl border border-[#152e59] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    {user.name}
                    <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">
                      Sua Sessão Ativa ({user.role})
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-300">{user.email}</div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="text-xs h-8 bg-red-600/80 hover:bg-red-700"
              >
                Encerrar Sessão
              </Button>
            </div>
          )}

          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b">
                <tr>
                  <th className="p-3 pl-4">Nome do Advogado/Usuário</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Função / Perfil</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className={u.id === user?.id ? 'bg-primary/5 font-medium' : ''}>
                    <td className="p-3 pl-4 font-semibold">
                      {u.name}{' '}
                      {u.id === user?.id && (
                        <span className="text-[10px] text-primary">(Você)</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 uppercase font-mono text-[10px]">{u.role}</td>
                    <td className="p-3">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Ativo
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB TAGS */}
        <TabsContent value="tags" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">Tags &amp; Marcadores</h3>
            <Button
              size="sm"
              onClick={() => setTagModalOpen(true)}
              className="h-8 text-xs bg-[#0A1F3F] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Nova Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge
                key={t.id}
                style={{ backgroundColor: `${t.cor}20`, color: t.cor, borderColor: `${t.cor}40` }}
                className="text-xs px-3 py-1 border"
              >
                {t.nome} ({t.modulo || 'Geral'})
              </Badge>
            ))}
          </div>
        </TabsContent>

        {/* TAB SLA */}
        <TabsContent value="sla" className="pt-4 space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm">Configuração de Tempo Máximo de Resposta (SLA)</h3>
            {slas.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-muted/40 rounded-lg flex justify-between items-center text-xs"
              >
                <div>
                  <div className="font-bold">
                    {s.equipe || 'Comercial'} • Origem: {s.origem || 'Meta Ads'}
                  </div>
                  <div className="text-muted-foreground">
                    Horário de Atendimento: {s.horario_inicio} às {s.horario_fim}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{s.tempo_resposta_minutos} minutos</div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    Ativo
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE SERVICE MODAL */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Cadastrar Serviço Jurídico
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateService} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Serviço *</Label>
              <Input
                required
                value={newService.nome}
                onChange={(e) => setNewService({ ...newService, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Área</Label>
                <Select
                  value={newService.area}
                  onValueChange={(val) => setNewService({ ...newService, area: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direito Tributário">Direito Tributário</SelectItem>
                    <SelectItem value="Direito Bancário">Direito Bancário</SelectItem>
                    <SelectItem value="Direito Trabalhista">Direito Trabalhista</SelectItem>
                    <SelectItem value="Direito do Consumidor">Direito do Consumidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Padrão (R$)</Label>
                <Input
                  type="number"
                  value={newService.valor_padrao}
                  onChange={(e) =>
                    setNewService({ ...newService, valor_padrao: Number(e.target.value) })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setServiceModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Serviço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE TAG MODAL */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              Cadastrar Tag
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTag} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Tag *</Label>
              <Input
                required
                value={newTag.nome}
                onChange={(e) => setNewTag({ ...newTag, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor Hexadecimal</Label>
                <Input
                  value={newTag.cor}
                  onChange={(e) => setNewTag({ ...newTag, cor: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Módulo</Label>
                <Select
                  value={newTag.modulo}
                  onValueChange={(val) => setNewTag({ ...newTag, modulo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="oportunidades">Oportunidades</SelectItem>
                    <SelectItem value="tarefas">Tarefas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTagModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                Salvar Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default SettingsPage
