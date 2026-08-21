import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  UserPlus,
  KeyRound,
  Trash2,
  Copy,
  AlertTriangle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Server,
  Info,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import pb from '@/lib/pocketbase/client'
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

  // User Management state
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
  })
  const [isSubmittingUser, setIsSubmittingUser] = useState(false)

  // Password Display Modal (for created user or reset password)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordModalData, setPasswordModalData] = useState<{
    userEmail: string
    userName: string
    password: string
    isReset: boolean
  } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Delete User Confirmation
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  // Reset Password Confirmation
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const generateSecurePassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+='
    let password = ''
    // Ensure at least 1 lowercase, 1 uppercase, 1 number, 1 symbol
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%&*+='[Math.floor(Math.random() * 9)]
    for (let i = 4; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    // Shuffle
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('')
  }

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

  // --- USER MANAGEMENT HANDLERS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({ title: 'Preencha nome e e-mail do usuário', variant: 'destructive' })
      return
    }

    setIsSubmittingUser(true)
    const tempPassword = generateSecurePassword(12)

    try {
      const createdUser = await pb.collection('users').create<UserRecord>({
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: tempPassword,
        passwordConfirm: tempPassword,
        role: newUser.role,
        active: true,
        status: 'active',
        tenant_id: tenant.id,
        verified: true,
      })

      await CrmService.logAudit(tenant.id, 'create_user', 'user', createdUser.id, null, {
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      })

      toast({
        title: 'Usuário cadastrado com sucesso!',
        description: `Credenciais de acesso geradas para ${createdUser.name}.`,
      })

      setCreateUserModalOpen(false)
      setNewUser({ name: '', email: '', role: 'user' })

      // Show temporary password modal
      setPasswordModalData({
        userEmail: createdUser.email,
        userName: createdUser.name,
        password: tempPassword,
        isReset: false,
      })
      setCopiedPassword(false)
      setPasswordModalOpen(true)

      loadAll()
    } catch (err: any) {
      console.error('Error creating user:', err)
      const errorMsg =
        err?.data?.data?.email?.message ||
        err?.message ||
        'Não foi possível criar o usuário. Verifique se o e-mail já existe.'
      toast({
        title: 'Erro ao cadastrar usuário',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingUser(false)
    }
  }

  const handleToggleUserActive = async (targetUser: UserRecord, currentActive: boolean) => {
    if (!tenant?.id) return

    // Prevent deactivating oneself
    if (targetUser.id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode desativar seu próprio usuário de administrador.',
        variant: 'destructive',
      })
      return
    }

    setTogglingUserId(targetUser.id)
    const newActive = !currentActive
    try {
      await pb.collection('users').update(targetUser.id, {
        active: newActive,
        status: newActive ? 'active' : 'inactive',
      })

      await CrmService.logAudit(
        tenant.id,
        newActive ? 'activate_user' : 'deactivate_user',
        'user',
        targetUser.id,
        { active: currentActive },
        { active: newActive },
      )

      toast({
        title: newActive ? 'Usuário ativado' : 'Usuário desativado',
        description: `${targetUser.name} foi ${newActive ? 'ativado(a)' : 'desativado(a)'} com sucesso.`,
      })

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, active: newActive, status: newActive ? 'active' : 'inactive' }
            : u,
        ),
      )
    } catch (err: any) {
      console.error('Error toggling user active:', err)
      toast({
        title: 'Erro ao atualizar status',
        description: err?.message || 'Falha ao comunicar com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!tenant?.id || !userToReset) return

    setIsResettingPassword(true)
    const newPassword = generateSecurePassword(12)

    try {
      await pb.collection('users').update(userToReset.id, {
        password: newPassword,
        passwordConfirm: newPassword,
      })

      await CrmService.logAudit(tenant.id, 'reset_password_user', 'user', userToReset.id, null, {
        userEmail: userToReset.email,
      })

      toast({
        title: 'Senha redefinida com sucesso!',
        description: `Nova senha gerada para ${userToReset.name}.`,
      })

      setResetPasswordModalOpen(false)

      // Show temporary password modal
      setPasswordModalData({
        userEmail: userToReset.email,
        userName: userToReset.name,
        password: newPassword,
        isReset: true,
      })
      setCopiedPassword(false)
      setPasswordModalOpen(true)
      setUserToReset(null)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      toast({
        title: 'Erro ao redefinir senha',
        description: err?.message || 'Falha ao atualizar a senha do usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!tenant?.id || !userToDelete) return

    // Prevent deleting oneself
    if (userToDelete.id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir sua própria conta de administrador.',
        variant: 'destructive',
      })
      setDeleteUserModalOpen(false)
      setUserToDelete(null)
      return
    }

    setIsDeletingUser(true)
    try {
      await pb.collection('users').delete(userToDelete.id)

      await CrmService.logAudit(
        tenant.id,
        'delete_user',
        'user',
        userToDelete.id,
        userToDelete,
        null,
      )

      toast({
        title: 'Usuário excluído',
        description: `${userToDelete.name} foi removido do escritório.`,
      })

      setDeleteUserModalOpen(false)
      setUserToDelete(null)
      loadAll()
    } catch (err: any) {
      console.error('Error deleting user:', err)
      toast({
        title: 'Erro ao excluir usuário',
        description: err?.message || 'Falha ao remover o usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPassword(true)
    toast({
      title: 'Copiado para a área de transferência!',
      description: 'Senha copiada com sucesso.',
    })
    setTimeout(() => setCopiedPassword(false), 3000)
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
            value="conhecimento"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" /> Base de Conhecimento
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

        {/* TAB BASE DE CONHECIMENTO (LINK/PREVIEW) */}
        <TabsContent value="conhecimento" className="pt-4 space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  Base de Conhecimento do Assistente IA
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gerencie o repositório de teses jurídicas, alçadas de desconto de honorários e
                  procedimentos que instruem o Assistente IA do escritório.
                </p>
              </div>
              <Link to="/base-conhecimento">
                <Button className="bg-[#0A1F3F] text-white text-xs gap-1.5 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Abrir Editor Completo
                </Button>
              </Link>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" /> Controle de Permissões
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Apenas <strong>Administradores</strong> e <strong>Gestores</strong> possuem
                permissão para atualizar o conteúdo da Base de Conhecimento. Usuários padrão possuem
                acesso de leitura e usam o conhecimento através do Assistente IA nos leads.
              </p>
            </div>
          </div>
        </TabsContent>

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
          {/* Admin User Management Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-foreground font-legal-serif">
                Gestão de Equipe e Controle de Acesso
              </h3>
              <p className="text-xs text-muted-foreground">
                Administre os membros do escritório, papéis, senhas e ativação de acessos ao CRM.
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setCreateUserModalOpen(true)}
                className="h-8 text-xs bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1.5 shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" /> Adicionar Novo Usuário
              </Button>
            )}
          </div>

          {/* Active Logged In User Card */}
          {user && (
            <div className="bg-[#0A1F3F] text-white p-4 rounded-xl border border-[#152e59] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm ring-2 ring-amber-400/30 shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    {user.name}
                    <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">
                      Sua Sessão Ativa (
                      {user.role === 'admin'
                        ? 'Administrador'
                        : user.role === 'manager'
                          ? 'Gestor'
                          : 'Advogado/Usuário'}
                      )
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-300">{user.email}</div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="text-xs h-8 bg-red-600/80 hover:bg-red-700 w-fit"
              >
                Encerrar Sessão
              </Button>
            </div>
          )}

          {/* SMTP Alert Information for Admins */}
          <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-200">
            <Server className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              Configuração SMTP para Envio de E-mails e Redefinição de Senha
            </AlertTitle>
            <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-1 leading-relaxed">
              O backend Skip Cloud utiliza envio seguro transacional. Para que a função de
              recuperação automática de senha via e-mail (
              <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded text-[10px]">
                pb.collection('users').requestPasswordReset
              </code>
              ) e notificações funcionem em produção, certifique-se de configurar as seguintes
              variáveis de ambiente no PocketBase:
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 mt-2 font-mono text-[10px] bg-background/60 p-2.5 rounded-md border border-amber-500/20 text-foreground">
                <div>
                  • <strong>SMTP_HOST:</strong> ex: smtp.gmail.com / smtp.office365.com
                </div>
                <div>
                  • <strong>SMTP_PORT:</strong> 587 ou 465
                </div>
                <div>
                  • <strong>SMTP_SECURITY:</strong> STARTTLS ou TLS
                </div>
                <div>
                  • <strong>SMTP_USERNAME:</strong> seu-email@dominio.adv.br
                </div>
                <div>
                  • <strong>SMTP_PASSWORD:</strong> sua-senha-de-app
                </div>
                <div>
                  • <strong>SMTP_SENDER_NAME:</strong> Teixeira &amp; Nascimento
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                <Info className="inline h-3 w-3 mr-1" />
                Como administrador, você também pode resetar senhas instantaneamente através do
                botão &quot;Resetar Senha&quot; na tabela abaixo, gerando uma credencial temporária
                de uso único.
              </p>
            </AlertDescription>
          </Alert>

          {/* Users Table */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                  <tr>
                    <th className="p-3 pl-4">Nome do Advogado/Usuário</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Papel / Perfil</th>
                    <th className="p-3">Data de Criação</th>
                    <th className="p-3">Último Acesso</th>
                    <th className="p-3 text-center">Status (Ativo)</th>
                    {isAdmin && <th className="p-3 pr-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 7 : 6}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Carregando usuários do escritório...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 7 : 6}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Nenhum usuário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isUserActive = u.active !== false && u.status !== 'inactive'
                      const isSelf = u.id === user?.id

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isSelf ? 'bg-primary/5 font-medium' : ''
                          } ${!isUserActive ? 'opacity-70 bg-muted/20' : ''}`}
                        >
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                  Você
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`uppercase font-mono text-[10px] ${
                                u.role === 'admin'
                                  ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                  : u.role === 'manager'
                                    ? 'border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                                    : 'border-slate-500/30 text-muted-foreground'
                              }`}
                            >
                              {u.role === 'admin'
                                ? 'Admin'
                                : u.role === 'manager'
                                  ? 'Gestor'
                                  : 'Usuário'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {u.last_login
                              ? new Date(u.last_login).toLocaleString('pt-BR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'Nunca acessou'}
                          </td>
                          <td className="p-3 text-center">
                            {isAdmin ? (
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={isUserActive}
                                  disabled={isSelf || togglingUserId === u.id}
                                  onCheckedChange={() => handleToggleUserActive(u, isUserActive)}
                                  aria-label="Ativar ou inativar usuário"
                                />
                                <span
                                  className={`text-[11px] font-semibold ${isUserActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                                >
                                  {isUserActive ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            ) : (
                              <Badge
                                className={
                                  isUserActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                }
                              >
                                {isUserActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="p-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setUserToReset(u)
                                    setResetPasswordModalOpen(true)
                                  }}
                                  title="Resetar senha"
                                  className="h-7 text-xs px-2 gap-1"
                                >
                                  <KeyRound className="h-3 w-3 text-amber-500" />
                                  <span className="hidden sm:inline">Resetar Senha</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSelf}
                                  onClick={() => {
                                    setUserToDelete(u)
                                    setDeleteUserModalOpen(true)
                                  }}
                                  title={
                                    isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir usuário'
                                  }
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* CREATE USER MODAL */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-500" />
              Adicionar Novo Usuário ao Escritório
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um membro da equipe jurídica. Uma senha temporária segura será gerada
              automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                required
                placeholder="Ex: Dra. Juliana Fernandes"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail Corporativo *</Label>
              <Input
                required
                type="email"
                placeholder="exemplo@teixeiranascimento.adv.br"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Papel / Nível de Acesso *</Label>
              <Select
                value={newUser.role}
                onValueChange={(val: 'admin' | 'manager' | 'user') =>
                  setNewUser({ ...newUser, role: val })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    Administrador (Acesso Total &amp; Configurações)
                  </SelectItem>
                  <SelectItem value="manager">Gestor / Supervisor Jurídico</SelectItem>
                  <SelectItem value="user">Advogado / Consultor Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border">
              <div className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Geração de Senha Temporária
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ao salvar, o sistema irá gerar uma senha segura aleatória de 12 dígitos e exibir uma
                única vez para você copiar e enviar ao usuário.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmittingUser}
                onClick={() => setCreateUserModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingUser}
                className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1.5"
              >
                {isSubmittingUser ? 'Cadastrando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PASSWORD DISPLAY DIALOG (ONE-TIME VIEW) */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              {passwordModalData?.isReset
                ? 'Senha Redefinida com Sucesso'
                : 'Novo Usuário Criado com Sucesso'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Copie e envie as credenciais abaixo para o usuário.{' '}
              <strong>Por motivos de segurança, esta senha NÃO será exibida novamente.</strong>
            </DialogDescription>
          </DialogHeader>

          {passwordModalData && (
            <div className="space-y-3.5 py-2">
              <div className="p-3 bg-muted/60 rounded-lg border space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Usuário:</span>
                  <span className="font-semibold">{passwordModalData.userName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">E-mail de Acesso:</span>
                  <span className="font-mono font-medium">{passwordModalData.userEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Senha Temporária Gerada:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-background font-mono text-sm font-bold tracking-wider rounded border text-foreground select-all">
                      {passwordModalData.password}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => copyToClipboard(passwordModalData.password)}
                      className="bg-[#0A1F3F] text-white hover:bg-[#0A1F3F]/90 text-xs gap-1.5 shrink-0"
                    >
                      {copiedPassword ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Copiada!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar Senha
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Certifique-se de salvar ou encaminhar esta senha antes de fechar esta janela. O
                  usuário deverá alterar sua senha após o primeiro acesso.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="w-full bg-[#0A1F3F] text-white"
            >
              Entendido e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM RESET PASSWORD DIALOG */}
      <AlertDialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              Resetar Senha do Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja resetar a senha de <strong>{userToReset?.name}</strong> (
              {userToReset?.email})? Uma nova senha aleatória será gerada imediatamente e a senha
              anterior deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isResettingPassword}
              onClick={handleResetPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isResettingPassword ? 'Gerando...' : 'Gerar Nova Senha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM DELETE USER DIALOG */}
      <AlertDialog open={deleteUserModalOpen} onOpenChange={setDeleteUserModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Confirmar Exclusão de Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja excluir permanentemente o usuário{' '}
              <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? Esta ação revogará todo
              o acesso ao sistema imediatamente e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingUser}
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingUser ? 'Excluindo...' : 'Sim, Excluir Usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default SettingsPage
