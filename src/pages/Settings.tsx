import React, { useState, useEffect, useCallback } from 'react'
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
  MessageSquareText,
  SlidersHorizontal,
  Edit2,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  ServiceRecord,
  TagRecord,
  TemplateRecord,
  MessageTemplateRecord,
  CustomFieldRecord,
  SlaConfigRecord,
  UserRecord,
  LeadDistributionRecord,
} from '@/types/platform'

export function SettingsPage() {
  const { tenant, user, refreshTenant, logout, userRole } = useTenant()
  const { toast } = useToast()

  const [services, setServices] = useState<ServiceRecord[]>([])
  const [tags, setTags] = useState<TagRecord[]>([])
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateRecord[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [slas, setSlas] = useState<SlaConfigRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Lead Distribution State
  const [distributionEnabled, setDistributionEnabled] = useState(true)
  const [distributionMethod, setDistributionMethod] = useState<'round_robin' | 'manual'>(
    'round_robin',
  )
  const [recentDistributions, setRecentDistributions] = useState<LeadDistributionRecord[]>([])
  const [savingDistribution, setSavingDistribution] = useState(false)

  // SLA State
  const [slaFirstResponseMinutes, setSlaFirstResponseMinutes] = useState<number>(15)
  const [slaIsActive, setSlaIsActive] = useState<boolean>(true)
  const [activeSlaId, setActiveSlaId] = useState<string | null>(null)
  const [savingSla, setSavingSla] = useState<boolean>(false)

  // Office settings
  const [officeName, setOfficeName] = useState(tenant?.name || 'Teixeira & Nascimento – Advogados')
  const [metaPixelId, setMetaPixelId] = useState(
    tenant?.meta_pixel_id || tenant?.settings?.meta_pixel_id || '',
  )
  const [oabRegistro, setOabRegistro] = useState(tenant?.settings?.oab_registro || 'OAB/SP 48.920')
  const [endereco, setEndereco] = useState(
    tenant?.settings?.endereco_completo ||
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
  const [editingTag, setEditingTag] = useState<TagRecord | null>(null)
  const [newTag, setNewTag] = useState({
    nome: '',
    cor: '#2563eb',
    modulo: 'leads',
  })

  // Message Templates Modals & State
  const [messageTemplateModalOpen, setMessageTemplateModalOpen] = useState(false)
  const [editingMessageTemplate, setEditingMessageTemplate] =
    useState<MessageTemplateRecord | null>(null)
  const [messageTemplateData, setMessageTemplateData] = useState({
    nome: '',
    conteudo: '',
    tipo: 'abordagem' as 'abordagem' | 'follow-up' | 'proposta' | 'objeção' | 'pós-venda' | 'outro',
    status: 'ativo',
  })

  // Custom Fields Modals & State
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false)
  const [editingCustomField, setEditingCustomField] = useState<CustomFieldRecord | null>(null)
  const [customFieldData, setCustomFieldData] = useState({
    nome: '',
    modulo: 'lead' as 'lead' | 'customer' | 'opportunity',
    tipo: 'texto' as 'texto' | 'numero' | 'moeda' | 'data' | 'selecao' | 'booleano',
    opcoesStr: '',
    obrigatorio: false,
    ordem: 0,
  })

  // ==========================================
  // USER MANAGEMENT STATE
  // ==========================================
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    team: '',
  })
  const [isSubmittingUser, setIsSubmittingUser] = useState(false)

  // Password Display Modal (for newly created user or randomly generated password reset)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordModalData, setPasswordModalData] = useState<{
    userEmail: string
    userName: string
    password: string
    isReset: boolean
  } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Edit User modal state
  const [editUserModalOpen, setEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    team: '',
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete User Confirmation
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  // Reset Password Modal
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [showResetCustomPassword, setShowResetCustomPassword] = useState(false)

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  // --------------------------------------------------
  // HIERARCHY RULE (Mandatory Phase E Rule):
  // - Admin can edit, toggle status, delete, reset password of ANY user (except self deletion/deactivation).
  // - Gestor (manager) CANNOT edit, deactivate, delete or reset password of an user with role "admin".
  // - Gestor CAN manage users with role "manager" or "user" within their tenant.
  // --------------------------------------------------
  const isAdmin = userRole === 'admin'
  const isGestor = userRole === 'gestor'

  /**
   * Returns true if current logged-in user has permission to manage (edit/reset/delete/toggle)
   * the target user.
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (isGestor) {
      // Gestor NEVER manages an admin
      return target.role !== 'admin'
    }
    return false
  }

  const generateSecurePassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+='
    let password = ''
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%&*+='[Math.floor(Math.random() * 9)]
    for (let i = 4; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('')
  }

  const loadAll = useCallback(async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const [sList, tList, msgTmpList, cfList, tmpList, slaList, uList, distConfig, distRecent] =
        await Promise.all([
          CrmService.getServices(tenant.id),
          CrmService.getTags(tenant.id),
          CrmService.getMessageTemplates(tenant.id),
          CrmService.getCustomFields(tenant.id),
          CrmService.getTemplates(tenant.id),
          CrmService.getSlaConfigs(tenant.id),
          // Direct users query for the tenant as per spec:
          // pb.collection('users').getFullList({ filter: 'tenant_id = "${tenantId}"' })
          pb
            .collection('users')
            .getFullList<UserRecord>({
              filter: `tenant_id = "${tenant.id}"`,
              sort: 'name',
            })
            .catch(() => CrmService.getUsers(tenant.id)),
          CrmService.getLeadDistributionConfig(tenant.id),
          CrmService.getRecentLeadDistributions(tenant.id, 20),
        ])

      setServices(sList)
      setTags(tList)
      setMessageTemplates(msgTmpList)
      setCustomFields(cfList)
      setTemplates(tmpList)
      setSlas(slaList)
      setUsers(uList)
      setRecentDistributions(distRecent)

      if (distConfig) {
        setDistributionEnabled(distConfig.ativo !== false && distConfig.is_active !== false)
        const m = (distConfig.metodo || distConfig.distribution_method || 'round_robin') as any
        setDistributionMethod(m === 'manual' ? 'manual' : 'round_robin')
      }

      if (slaList.length > 0) {
        const primarySla = slaList[0]
        setActiveSlaId(primarySla.id)
        setSlaFirstResponseMinutes(
          primarySla.first_response_minutes ?? primarySla.tempo_resposta_minutos ?? 15,
        )
        setSlaIsActive(primarySla.is_active !== false && primarySla.ativo !== false)
      }
    } catch (err) {
      console.error('Error loading settings data:', err)
    } finally {
      setLoading(false)
    }
  }, [tenant?.id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleSaveOffice = async () => {
    if (!tenant?.id) return
    try {
      await TenantService.updateTenantSettings(tenant.id, {
        name: officeName,
        meta_pixel_id: metaPixelId,
        settings: {
          ...tenant.settings,
          meta_pixel_id: metaPixelId,
          oab_registro: oabRegistro,
          endereco_completo: endereco,
        },
      })
      await CrmService.logAudit(tenant.id, 'update_settings', 'tenant', tenant.id, null, {
        officeName,
        metaPixelId,
        oabRegistro,
      })
      toast({ title: 'Configurações do escritório salvas com sucesso!' })
      refreshTenant()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: e?.message,
        variant: 'destructive',
      })
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !newService.nome) return
    try {
      await CrmService.createService(tenant.id, newService)
      toast({ title: 'Serviço jurídico cadastrado!' })
      setServiceModalOpen(false)
      setNewService({
        nome: '',
        area: 'Direito Tributário',
        valor_padrao: 15000,
        categoria: 'Consultoria',
      })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao cadastrar serviço', description: e?.message, variant: 'destructive' })
    }
  }

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !newTag.nome.trim()) return
    try {
      if (editingTag) {
        await CrmService.updateTag(editingTag.id, {
          nome: newTag.nome.trim(),
          cor: newTag.cor,
          modulo: newTag.modulo,
        })
        toast({ title: 'Tag atualizada com sucesso!' })
      } else {
        await CrmService.createTag(tenant.id, {
          nome: newTag.nome.trim(),
          cor: newTag.cor,
          modulo: newTag.modulo,
        })
        toast({ title: 'Tag cadastrada com sucesso!' })
      }
      setTagModalOpen(false)
      setEditingTag(null)
      setNewTag({ nome: '', cor: '#2563eb', modulo: 'leads' })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar tag', description: e?.message, variant: 'destructive' })
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      await CrmService.deleteTag(tagId)
      toast({ title: 'Tag excluída com sucesso!' })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir tag', description: e?.message, variant: 'destructive' })
    }
  }

  const handleSaveMessageTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !messageTemplateData.nome.trim() || !messageTemplateData.conteudo.trim())
      return
    try {
      if (editingMessageTemplate) {
        await CrmService.updateMessageTemplate(editingMessageTemplate.id, {
          nome: messageTemplateData.nome.trim(),
          conteudo: messageTemplateData.conteudo.trim(),
          tipo: messageTemplateData.tipo,
          status: messageTemplateData.status,
        })
        toast({ title: 'Template de mensagem atualizado!' })
      } else {
        await CrmService.createMessageTemplate(tenant.id, {
          nome: messageTemplateData.nome.trim(),
          conteudo: messageTemplateData.conteudo.trim(),
          tipo: messageTemplateData.tipo,
          status: messageTemplateData.status,
        })
        toast({ title: 'Template de mensagem criado!' })
      }
      setMessageTemplateModalOpen(false)
      setEditingMessageTemplate(null)
      setMessageTemplateData({
        nome: '',
        conteudo: '',
        tipo: 'abordagem',
        status: 'ativo',
      })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar template', description: e?.message, variant: 'destructive' })
    }
  }

  const handleDeleteMessageTemplate = async (templateId: string) => {
    try {
      await CrmService.deleteMessageTemplate(templateId)
      toast({ title: 'Template excluído com sucesso!' })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir template', description: e?.message, variant: 'destructive' })
    }
  }

  const handleSaveCustomField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !customFieldData.nome.trim()) return
    try {
      let opcoesParsed: string[] = []
      if (customFieldData.tipo === 'selecao' && customFieldData.opcoesStr.trim()) {
        opcoesParsed = customFieldData.opcoesStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }

      const payload = {
        nome: customFieldData.nome.trim(),
        modulo: customFieldData.modulo,
        tipo: customFieldData.tipo,
        opcoes: opcoesParsed,
        obrigatorio: customFieldData.obrigatorio,
        ordem: Number(customFieldData.ordem) || 0,
      }

      if (editingCustomField) {
        await CrmService.updateCustomField(editingCustomField.id, payload)
        toast({ title: 'Campo personalizado atualizado!' })
      } else {
        await CrmService.createCustomField(tenant.id, payload)
        toast({ title: 'Campo personalizado criado!' })
      }
      setCustomFieldModalOpen(false)
      setEditingCustomField(null)
      setCustomFieldData({
        nome: '',
        modulo: 'lead',
        tipo: 'texto',
        opcoesStr: '',
        obrigatorio: false,
        ordem: 0,
      })
      loadAll()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar campo personalizado',
        description: e?.message,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteCustomField = async (fieldId: string) => {
    try {
      await CrmService.deleteCustomField(fieldId)
      toast({ title: 'Campo personalizado excluído!' })
      loadAll()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir campo', description: e?.message, variant: 'destructive' })
    }
  }

  // ==========================================
  // USER MANAGEMENT ACTIONS
  // ==========================================

  // 1. Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({ title: 'Preencha nome e e-mail do usuário', variant: 'destructive' })
      return
    }

    // Hierarchy check: Gestor cannot create an Admin user
    if (isGestor && newUser.role === 'admin') {
      toast({
        title: 'Ação não permitida',
        description: 'Gestores só podem cadastrar usuários com perfil Gestor ou Advogado/Usuário.',
        variant: 'destructive',
      })
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
        team: newUser.team || undefined,
        active: true,
        status: 'active',
        tenant_id: tenant.id,
      })

      await CrmService.logAudit(tenant.id, 'create_user', 'user', createdUser.id, null, {
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        team: createdUser.team,
      })

      toast({
        title: 'Usuário cadastrado com sucesso!',
        description: `Credenciais de acesso geradas para ${createdUser.name}.`,
      })

      setCreateUserModalOpen(false)
      setNewUser({ name: '', email: '', role: 'user', team: '' })

      // Show temporary password modal once with copy button
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
      const fieldMsg =
        err?.data?.data && typeof err.data.data === 'object'
          ? Object.entries(err.data.data)
              .map(([f, d]: any) => `${f}: ${d?.message || d}`)
              .join(', ')
          : null
      const errorMsg =
        fieldMsg ||
        getErrorMessage(err, 'Não foi possível criar o usuário. Verifique os dados informados.')
      toast({
        title: 'Erro ao cadastrar usuário',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingUser(false)
    }
  }

  // 2. Edit user
  const handleOpenEditUser = (u: UserRecord) => {
    if (!canManageUser(u)) {
      toast({
        title: 'Ação não permitida',
        description: 'Gestores não possuem permissão para editar usuários administradores.',
        variant: 'destructive',
      })
      return
    }
    setEditingUser(u)
    setEditUserData({
      name: u.name || '',
      email: u.email || '',
      role: (u.role as 'admin' | 'manager' | 'user') || 'user',
      team: (u.team as string) || '',
    })
    setEditUserModalOpen(true)
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !editingUser) return

    // Hierarchy check: Gestor cannot edit an admin
    if (!canManageUser(editingUser)) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não possui permissão para editar um administrador.',
        variant: 'destructive',
      })
      setEditUserModalOpen(false)
      return
    }

    // Gestor cannot promote anyone to Admin
    if (isGestor && editUserData.role === 'admin' && editingUser.role !== 'admin') {
      toast({
        title: 'Ação não permitida',
        description: 'Apenas Administradores podem conceder o perfil de Administrador.',
        variant: 'destructive',
      })
      return
    }

    if (!editUserData.name.trim() || !editUserData.email.trim()) {
      toast({ title: 'Preencha nome e e-mail', variant: 'destructive' })
      return
    }

    setIsSavingEdit(true)
    try {
      const updatePayload: Record<string, any> = {
        name: editUserData.name.trim(),
        email: editUserData.email.trim().toLowerCase(),
        team: editUserData.team || '',
      }

      // Only admins or valid hierarchy roles can change role
      if (isAdmin) {
        updatePayload.role = editUserData.role
      } else if (isGestor && editUserData.role !== 'admin') {
        updatePayload.role = editUserData.role
      }

      const updated = await pb.collection('users').update<UserRecord>(editingUser.id, updatePayload)

      await CrmService.logAudit(tenant.id, 'update_user', 'user', editingUser.id, editingUser, {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        team: updated.team,
      })

      toast({
        title: 'Usuário atualizado com sucesso!',
        description: `Os dados de ${updated.name} foram atualizados.`,
      })

      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)))

      setEditUserModalOpen(false)
      setEditingUser(null)
    } catch (err: any) {
      console.error('Error editing user:', err)
      const fieldMsg =
        err?.data?.data && typeof err.data.data === 'object'
          ? Object.entries(err.data.data)
              .map(([f, d]: any) => `${f}: ${d?.message || d}`)
              .join(', ')
          : null
      const errorMsg = fieldMsg || getErrorMessage(err, 'Não foi possível atualizar o usuário.')
      toast({
        title: 'Erro ao atualizar usuário',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  // 3. Toggle Active / Inactive
  const handleToggleUserActive = async (targetUser: UserRecord, currentActive: boolean) => {
    if (!tenant?.id) return

    // Prevent deactivating oneself
    if (targetUser.id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode desativar seu próprio usuário logado.',
        variant: 'destructive',
      })
      return
    }

    // Hierarchy check: Gestor cannot deactivate an admin
    if (!canManageUser(targetUser)) {
      toast({
        title: 'Ação não permitida',
        description: 'Gestores não podem desativar usuários com papel Administrador.',
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
        description: getErrorMessage(err, 'Falha ao comunicar com o servidor.'),
        variant: 'destructive',
      })
    } finally {
      setTogglingUserId(null)
    }
  }

  // 4. Reset Password (with Random vs Custom typed password)
  const handleOpenResetPassword = (u: UserRecord) => {
    if (!canManageUser(u)) {
      toast({
        title: 'Ação não permitida',
        description: 'Gestores não podem redefinir a senha de administradores.',
        variant: 'destructive',
      })
      return
    }
    setUserToReset(u)
    setResetPasswordMode('random')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setShowResetCustomPassword(false)
    setResetPasswordModalOpen(true)
  }

  const handleResetPassword = async () => {
    if (!tenant?.id || !userToReset) return

    if (!canManageUser(userToReset)) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não possui permissão para redefinir a senha deste usuário.',
        variant: 'destructive',
      })
      setResetPasswordModalOpen(false)
      setUserToReset(null)
      return
    }

    let finalPassword = ''

    if (resetPasswordMode === 'custom') {
      if (!resetNewPassword || resetNewPassword.length < 8) {
        toast({
          title: 'Senha muito curta',
          description: 'A nova senha deve ter no mínimo 8 caracteres.',
          variant: 'destructive',
        })
        return
      }
      if (resetNewPassword !== resetConfirmPassword) {
        toast({
          title: 'As senhas não conferem',
          description: 'A confirmação de senha precisa ser idêntica à nova senha.',
          variant: 'destructive',
        })
        return
      }
      finalPassword = resetNewPassword
    } else {
      finalPassword = generateSecurePassword(12)
    }

    setIsResettingPassword(true)
    try {
      await pb.collection('users').update(userToReset.id, {
        password: finalPassword,
        passwordConfirm: finalPassword,
      })

      await CrmService.logAudit(tenant.id, 'reset_password_user', 'user', userToReset.id, null, {
        userEmail: userToReset.email,
        mode: resetPasswordMode,
      })

      toast({
        title: 'Senha redefinida com sucesso!',
        description:
          resetPasswordMode === 'custom'
            ? `Senha personalizada definida com sucesso para ${userToReset.name}.`
            : `Nova senha aleatória gerada para ${userToReset.name}.`,
      })

      setResetPasswordModalOpen(false)

      // Show temporary password modal if randomly generated
      if (resetPasswordMode === 'random') {
        setPasswordModalData({
          userEmail: userToReset.email,
          userName: userToReset.name,
          password: finalPassword,
          isReset: true,
        })
        setCopiedPassword(false)
        setPasswordModalOpen(true)
      }

      setUserToReset(null)
      setResetPasswordMode('random')
      setResetNewPassword('')
      setResetConfirmPassword('')
    } catch (err: any) {
      console.error('Error resetting password:', err)
      toast({
        title: 'Erro ao redefinir senha',
        description: getErrorMessage(err, 'Falha ao atualizar a senha no servidor.'),
        variant: 'destructive',
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  // 5. Delete User
  const handleOpenDeleteUser = (u: UserRecord) => {
    if (u.id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir sua própria conta.',
        variant: 'destructive',
      })
      return
    }
    if (!canManageUser(u)) {
      toast({
        title: 'Ação não permitida',
        description: 'Gestores não podem excluir administradores do sistema.',
        variant: 'destructive',
      })
      return
    }
    setUserToDelete(u)
    setDeleteUserModalOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!tenant?.id || !userToDelete) return

    if (userToDelete.id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir sua própria conta.',
        variant: 'destructive',
      })
      setDeleteUserModalOpen(false)
      setUserToDelete(null)
      return
    }

    if (!canManageUser(userToDelete)) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não possui permissão para excluir este usuário.',
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
        description: getErrorMessage(err, 'Falha ao remover o usuário.'),
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

  const handleSaveDistribution = async () => {
    if (!tenant?.id) return
    setSavingDistribution(true)
    try {
      await CrmService.upsertLeadDistributionConfig(tenant.id, {
        ativo: distributionEnabled,
        metodo: distributionMethod,
      })
      toast({
        title: 'Distribuição de leads atualizada',
        description: `Distribuição ${distributionEnabled ? 'ativada' : 'desativada'} via método ${distributionMethod === 'round_robin' ? 'Round-Robin' : 'Manual'}.`,
      })
      const recents = await CrmService.getRecentLeadDistributions(tenant.id, 20)
      setRecentDistributions(recents)
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar configuração de distribuição',
        description: e?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingDistribution(false)
    }
  }

  const handleSaveSlaConfig = async () => {
    if (!tenant?.id) return
    setSavingSla(true)
    try {
      if (activeSlaId) {
        await CrmService.updateSlaConfig(activeSlaId, {
          first_response_minutes: Number(slaFirstResponseMinutes),
          tempo_resposta_minutos: Number(slaFirstResponseMinutes),
          is_active: slaIsActive,
          ativo: slaIsActive,
        })
      } else {
        const created = await CrmService.createSlaConfig(tenant.id, {
          equipe: 'Comercial Geral',
          origem: 'Meta Ads',
          prioridade: 'alta',
          tempo_resposta_minutos: Number(slaFirstResponseMinutes),
          first_response_minutes: Number(slaFirstResponseMinutes),
          horario_inicio: '08:00',
          horario_fim: '19:00',
          dias_semana: ['seg', 'ter', 'qua', 'qui', 'sex'],
          ativo: slaIsActive,
          is_active: slaIsActive,
        })
        setActiveSlaId(created.id)
      }
      toast({
        title: 'SLA de Primeiro Atendimento configurado',
        description: `Tempo limite definido para ${slaFirstResponseMinutes} minutos.`,
      })
      const slaList = await CrmService.getSlaConfigs(tenant.id)
      setSlas(slaList)
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar SLA',
        description: e?.message,
        variant: 'destructive',
      })
    } finally {
      setSavingSla(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-amber-500" />
            Configurações do Escritório
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão multi-tenant, controle de equipe jurídica, distribuição de leads, catálogo de
            serviços e SLAs.
          </p>
        </div>
        <Link to="/meu-perfil">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <UserCheck className="h-3.5 w-3.5 text-primary" /> Ir para Meu Perfil
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4 overflow-x-auto">
          <TabsTrigger
            value="usuarios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Users className="h-3.5 w-3.5" /> Equipe &amp; Usuários ({users.length})
          </TabsTrigger>
          <TabsTrigger
            value="empresa"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Building className="h-3.5 w-3.5" /> Escritório &amp; Pixel
          </TabsTrigger>
          <TabsTrigger
            value="distribuicao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Users className="h-3.5 w-3.5" /> Distribuição de Leads
          </TabsTrigger>
          <TabsTrigger
            value="sla"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Clock className="h-3.5 w-3.5" /> SLA de Atendimento
          </TabsTrigger>
          <TabsTrigger
            value="conhecimento"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" /> Base de Conhecimento
          </TabsTrigger>
          <TabsTrigger
            value="servicos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Serviços Jurídicos ({services.length})
          </TabsTrigger>
          <TabsTrigger
            value="message_templates"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Templates de Mensagem ({messageTemplates.length})
          </TabsTrigger>
          <TabsTrigger
            value="custom_fields"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Campos Personalizados ({customFields.length})
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Tags ({tags.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EQUIPE & USUÁRIOS (FASE E CORE FOCUS) */}
        <TabsContent value="usuarios" className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-foreground font-legal-serif flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Gestão de Equipe e Controle de Acesso
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gerencie todos os membros do tenant, seus papéis, equipes, senhas e status de
                ativação.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewUser({ name: '', email: '', role: 'user', team: '' })
                setCreateUserModalOpen(true)
              }}
              className="h-8 text-xs bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1.5 shadow-xs shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" /> Adicionar Novo Usuário
            </Button>
          </div>

          {/* Active Logged-in User Context Card */}
          {user && (
            <div className="bg-[#0A1F3F] text-white p-4 rounded-xl border border-[#152e59] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold flex items-center justify-center text-sm ring-2 ring-amber-400/30 shrink-0">
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
              <div className="flex items-center gap-2">
                <Link to="/meu-perfil">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-slate-600 text-slate-200 hover:bg-slate-800"
                  >
                    Editar Meu Perfil
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    logout()
                    window.location.assign('/login')
                  }}
                  className="text-xs h-8 bg-red-600/80 hover:bg-red-700"
                >
                  Encerrar Sessão
                </Button>
              </div>
            </div>
          )}

          {/* Hierarchy information alert */}
          <Alert className="border-blue-500/30 bg-blue-500/5 text-blue-950 dark:text-blue-200">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-xs font-bold text-blue-900 dark:text-blue-300">
              Regras de Hierarquia e Permissões
            </AlertTitle>
            <AlertDescription className="text-[11px] text-blue-800/90 dark:text-blue-300/80 mt-0.5 leading-relaxed">
              <strong>Administradores:</strong> Podem criar, editar, resetar senhas e excluir
              qualquer usuário.
              <br />
              <strong>Gestores:</strong> Podem criar e gerenciar usuários com papel de Gestor ou
              Advogado. Gestores <strong>nunca</strong> podem editar, desativar, resetar senha ou
              excluir um usuário com papel de Administrador.
            </AlertDescription>
          </Alert>

          {/* Users Table */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                  <tr>
                    <th className="p-3 pl-4">Nome</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Papel / Role</th>
                    <th className="p-3">Equipe</th>
                    <th className="p-3">Data de Criação</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Carregando usuários do tenant...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Nenhum usuário cadastrado neste escritório.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isUserActive = u.active !== false && u.status !== 'inactive'
                      const isSelf = u.id === user?.id
                      const canManage = canManageUser(u)
                      const isTargetAdmin = u.role === 'admin'

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
                                  : 'Advogado'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px]">
                            {u.team
                              ? u.team === 'comercial'
                                ? 'Comercial'
                                : u.team === 'juridico'
                                  ? 'Jurídico'
                                  : u.team === 'financeiro'
                                    ? 'Financeiro'
                                    : u.team
                              : '—'}
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="p-3 text-center">
                            {canManage ? (
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={isUserActive}
                                  disabled={isSelf || togglingUserId === u.id}
                                  onCheckedChange={() => handleToggleUserActive(u, isUserActive)}
                                  aria-label="Ativar ou inativar usuário"
                                />
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isUserActive
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
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
                          <td className="p-3 pr-4 text-right">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Editar usuário"
                                  className="h-7 text-xs px-2 gap-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Editar</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenResetPassword(u)}
                                  title="Resetar senha"
                                  className="h-7 text-xs px-2 gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  <span className="hidden sm:inline">Resetar Senha</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSelf}
                                  onClick={() => handleOpenDeleteUser(u)}
                                  title={
                                    isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir usuário'
                                  }
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic flex items-center justify-end gap-1">
                                <ShieldAlert className="h-3 w-3 text-amber-500" />
                                Protegido (Admin)
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ESCRITORIO & PIXEL */}
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
                  placeholder="Ex: 948271038592014"
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

        {/* TAB 3: DISTRIBUIÇÃO DE LEADS */}
        <TabsContent value="distribuicao" className="pt-4 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Distribuição Automática de Leads (Round-Robin)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Distribua novos leads criados automaticamente em fila circular (round-robin) entre
                os advogados e atendentes ativos do escritório.
              </p>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Ativar Distribuição Automática</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Quando ativo, novos leads sem responsável definido serão atribuídos
                    automaticamente.
                  </p>
                </div>
                <Switch
                  checked={distributionEnabled}
                  onCheckedChange={setDistributionEnabled}
                  aria-label="Ativar distribuição automática"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold">Método de Distribuição</Label>
                <Select
                  value={distributionMethod}
                  onValueChange={(val: 'round_robin' | 'manual') => setDistributionMethod(val)}
                  disabled={!distributionEnabled}
                >
                  <SelectTrigger className="h-9 text-xs max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">
                      Round-Robin (Distribuição Equitativa Circular)
                    </SelectItem>
                    <SelectItem value="manual">Manual (Atribuição pelo Gestor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={handleSaveDistribution}
                disabled={savingDistribution}
                className="bg-[#0A1F3F] text-white text-xs gap-1.5 mt-2"
              >
                <Save className="h-3.5 w-3.5" />
                {savingDistribution ? 'Salvando...' : 'Salvar Preferências de Distribuição'}
              </Button>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Últimas Distribuições Registradas</h3>
                <p className="text-xs text-muted-foreground">
                  Registro em tempo real da alocação de leads.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {recentDistributions.length} distribuições recentes
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                  <tr>
                    <th className="p-3 pl-4">Lead</th>
                    <th className="p-3">Responsável Atribuído</th>
                    <th className="p-3">Método</th>
                    <th className="p-3 pr-4 text-right">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentDistributions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nenhuma distribuição automática registrada ainda.
                      </td>
                    </tr>
                  ) : (
                    recentDistributions.map((dist) => (
                      <tr key={dist.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-foreground">
                          {dist.expand?.lead_id?.name || dist.lead_id || 'Lead Jurídico'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 font-medium">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{dist.expand?.user_id?.name || dist.user_id || 'Advogado'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {dist.distribution_method || dist.metodo || 'round_robin'}
                          </Badge>
                        </td>
                        <td className="p-3 pr-4 text-right text-muted-foreground font-mono text-[11px]">
                          {dist.created
                            ? new Date(dist.created).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: SLA */}
        <TabsContent value="sla" className="pt-4 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                SLA de Primeiro Atendimento (Tempo de Resposta)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Defina o tempo máximo tolerado para o primeiro contato com novos leads jurídicos.
              </p>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Monitoramento de SLA Ativo</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Exibe alerta visual nos cards e linhas de leads com SLA violado.
                  </p>
                </div>
                <Switch
                  checked={slaIsActive}
                  onCheckedChange={setSlaIsActive}
                  aria-label="Ativar monitoramento de SLA"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold">
                  Tempo Máximo de Primeira Resposta (em minutos) *
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={slaFirstResponseMinutes}
                    onChange={(e) => setSlaFirstResponseMinutes(Number(e.target.value))}
                    className="h-9 text-xs w-36 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">
                    minutos ({Math.round((slaFirstResponseMinutes / 60) * 10) / 10}h)
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleSaveSlaConfig}
                disabled={savingSla}
                className="bg-[#0A1F3F] text-white text-xs gap-1.5 mt-2"
              >
                <Save className="h-3.5 w-3.5" />
                {savingSla ? 'Salvando...' : 'Salvar Regra de SLA'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: BASE DE CONHECIMENTO */}
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
          </div>
        </TabsContent>

        {/* TAB 6: SERVIÇOS JURÍDICOS */}
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

        {/* TAB 7: TEMPLATES DE MENSAGEM */}
        <TabsContent value="message_templates" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Templates de Mensagem
              </h3>
              <p className="text-xs text-muted-foreground">
                Modelos prontos de mensagens para acelerar o atendimento.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingMessageTemplate(null)
                setMessageTemplateData({
                  nome: '',
                  conteudo: '',
                  tipo: 'abordagem',
                  status: 'ativo',
                })
                setMessageTemplateModalOpen(true)
              }}
              className="h-8 text-xs bg-[#0A1F3F] text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Template
            </Button>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3 pl-4">Título / Nome</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Prévia do Conteúdo</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {messageTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum template de mensagem cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  messageTemplates.map((tmp) => (
                    <tr key={tmp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-foreground">{tmp.nome}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {tmp.tipo || 'outro'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-md truncate">
                        {tmp.conteudo}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={
                            tmp.status === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {tmp.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMessageTemplate(tmp)
                              setMessageTemplateData({
                                nome: tmp.nome,
                                conteudo: tmp.conteudo,
                                tipo: (tmp.tipo as any) || 'abordagem',
                                status: tmp.status || 'ativo',
                              })
                              setMessageTemplateModalOpen(true)
                            }}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <Edit2 className="h-3 w-3" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessageTemplate(tmp.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 8: CAMPOS PERSONALIZADOS */}
        <TabsContent value="custom_fields" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Campos Personalizados do Tenant
              </h3>
              <p className="text-xs text-muted-foreground">
                Crie atributos customizados para Leads, Clientes e Oportunidades.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingCustomField(null)
                setCustomFieldData({
                  nome: '',
                  modulo: 'lead',
                  tipo: 'texto',
                  opcoesStr: '',
                  obrigatorio: false,
                  ordem: (customFields.length + 1) * 10,
                })
                setCustomFieldModalOpen(true)
              }}
              className="h-8 text-xs bg-[#0A1F3F] text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Campo
            </Button>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 uppercase text-[11px] font-semibold border-b text-muted-foreground">
                <tr>
                  <th className="p-3 pl-4">Nome do Campo</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Opções</th>
                  <th className="p-3 text-center">Obrigatório</th>
                  <th className="p-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customFields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nenhum campo personalizado cadastrado.
                    </td>
                  </tr>
                ) : (
                  customFields.map((cf) => {
                    const opts = Array.isArray(cf.opcoes)
                      ? cf.opcoes.join(', ')
                      : typeof cf.opcoes === 'object' &&
                          cf.opcoes !== null &&
                          'options' in cf.opcoes
                        ? (cf.opcoes as any).options?.join(', ')
                        : '—'

                    return (
                      <tr key={cf.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-foreground">{cf.nome}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {cf.modulo === 'lead'
                              ? 'Lead'
                              : cf.modulo === 'customer' || cf.modulo === 'cliente'
                                ? 'Cliente'
                                : 'Oportunidade'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px] capitalize">{cf.tipo}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {opts || '—'}
                        </td>
                        <td className="p-3 text-center">
                          {cf.obrigatorio ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Não</span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCustomField(cf)
                                const curOpts = Array.isArray(cf.opcoes)
                                  ? cf.opcoes.join(', ')
                                  : typeof cf.opcoes === 'object' &&
                                      cf.opcoes !== null &&
                                      'options' in cf.opcoes
                                    ? (cf.opcoes as any).options?.join(', ') || ''
                                    : ''
                                setCustomFieldData({
                                  nome: cf.nome,
                                  modulo: (cf.modulo as any) || 'lead',
                                  tipo: (cf.tipo as any) || 'texto',
                                  opcoesStr: curOpts,
                                  obrigatorio: !!cf.obrigatorio,
                                  ordem: cf.ordem || 0,
                                })
                                setCustomFieldModalOpen(true)
                              }}
                              className="h-7 text-xs px-2 gap-1"
                            >
                              <Edit2 className="h-3 w-3" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomField(cf.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>

        {/* TAB 9: TAGS */}
        <TabsContent value="tags" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Tags &amp; Segmentação
              </h3>
              <p className="text-xs text-muted-foreground">
                Cadastre e gerencie marcadores coloridos para organizar leads e clientes.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTag(null)
                setNewTag({ nome: '', cor: '#2563eb', modulo: 'leads' })
                setTagModalOpen(true)
              }}
              className="h-8 text-xs bg-[#0A1F3F] text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Tag
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tags.map((t) => (
              <div
                key={t.id}
                className="bg-card border rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                    style={{ backgroundColor: t.cor || '#2563eb' }}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">{t.nome}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      Módulo: {t.modulo || 'Geral'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTag(t)
                      setNewTag({
                        nome: t.nome,
                        cor: t.cor || '#2563eb',
                        modulo: t.modulo || 'leads',
                      })
                      setTagModalOpen(true)
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(t.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================================================== */}
      {/* MODALS & DIALOGS */}
      {/* ==================================================== */}

      {/* CREATE USER DIALOG */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-500" />
              Adicionar Novo Usuário ao Escritório
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um membro da equipe. Uma senha temporária de 12 caracteres será gerada e
              exibida uma única vez.
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Papel / Role *</Label>
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
                    {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="user">Advogado / Consultor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Equipe / Time</Label>
                <Select
                  value={newUser.team || 'none'}
                  onValueChange={(val) =>
                    setNewUser({
                      ...newUser,
                      team: val === 'none' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem equipe</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border">
              <div className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Geração de Senha Temporária
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ao cadastrar, o sistema gerará uma senha segura de 12 caracteres e a exibirá com
                botão de cópia.
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

      {/* EDIT USER DIALOG (NEW FEATURE IN PHASE E) */}
      <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-amber-500" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize as informações de cadastro e perfil de {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditUser} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                required
                value={editUserData.name}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                className="h-9 text-xs"
                placeholder="Ex: Dra. Juliana Fernandes"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail Corporativo *</Label>
              <Input
                required
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className="h-9 text-xs"
                placeholder="exemplo@teixeiranascimento.adv.br"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Papel / Role *</Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(val: 'admin' | 'manager' | 'user') =>
                    setEditUserData({ ...editUserData, role: val })
                  }
                  disabled={!isAdmin && !isGestor}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="user">Advogado / Consultor</SelectItem>
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <p className="text-[10px] text-muted-foreground">
                    Gestores não podem promover usuários a Administrador.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Equipe / Time</Label>
                <Select
                  value={editUserData.team || 'none'}
                  onValueChange={(val) =>
                    setEditUserData({
                      ...editUserData,
                      team: val === 'none' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem equipe</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingEdit}
                onClick={() => setEditUserModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingEdit}
                className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white gap-1.5"
              >
                {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PASSWORD DISPLAY DIALOG (ONE-TIME VIEW WITH COPY BUTTON) */}
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
                  Copie e salve esta senha antes de fechar esta janela. O usuário poderá alterar a
                  senha a qualquer momento em Meu Perfil.
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

      {/* RESET PASSWORD DIALOG (RANDOM vs CUSTOM) */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              Resetar Senha do Usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina uma nova senha para <strong>{userToReset?.name}</strong> ({userToReset?.email}
              ).
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-200">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Hash Criptográfico Irreversível
            </AlertTitle>
            <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
              Por segurança, não é possível ver a senha atual do usuário (armazenamento
              irreversível). Redefina gerando uma senha temporária ou digitando uma nova.
            </AlertDescription>
          </Alert>

          <div className="space-y-3.5 py-1">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="resetPasswordMode"
                  value="random"
                  checked={resetPasswordMode === 'random'}
                  onChange={() => setResetPasswordMode('random')}
                  className="h-4 w-4 accent-amber-600"
                />
                Opção 1: Gerar senha temporária aleatória de 12 dígitos (Recomendado)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="resetPasswordMode"
                  value="custom"
                  checked={resetPasswordMode === 'custom'}
                  onChange={() => setResetPasswordMode('custom')}
                  className="h-4 w-4 accent-amber-600"
                />
                Opção 2: Digitar uma nova senha específica
              </label>
            </div>

            {resetPasswordMode === 'custom' && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-500/40 pt-1">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetCustomPassword((s) => !s)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showResetCustomPassword ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Visualizar
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nova Senha *</Label>
                  <Input
                    type={showResetCustomPassword ? 'text' : 'password'}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-9 text-xs"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Confirmar Nova Senha *</Label>
                  <Input
                    type={showResetCustomPassword ? 'text' : 'password'}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="h-9 text-xs"
                    autoComplete="new-password"
                  />
                  {resetConfirmPassword && resetNewPassword !== resetConfirmPassword && (
                    <p className="text-[10px] text-red-600 dark:text-red-400">
                      As senhas digitadas não conferem.
                    </p>
                  )}
                  {resetConfirmPassword &&
                    resetNewPassword === resetConfirmPassword &&
                    resetNewPassword.length >= 8 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> As senhas conferem.
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isResettingPassword}
              onClick={() => setResetPasswordModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                isResettingPassword ||
                (resetPasswordMode === 'custom' &&
                  (!resetNewPassword ||
                    resetNewPassword.length < 8 ||
                    resetNewPassword !== resetConfirmPassword))
              }
              onClick={handleResetPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {isResettingPassword
                ? 'Redefinindo...'
                : resetPasswordMode === 'custom'
                  ? 'Definir Senha'
                  : 'Gerar Senha Aleatória'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* CREATE / EDIT TAG MODAL */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif">
              {editingTag ? 'Editar Tag' : 'Cadastrar Nova Tag'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTag} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Tag *</Label>
              <Input
                required
                value={newTag.nome}
                onChange={(e) => setNewTag({ ...newTag, nome: e.target.value })}
                className="h-9 text-xs"
                placeholder="Ex: VIP, Decisor, Follow-up 24h"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor (Hexadecimal ou Picker)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTag.cor}
                    onChange={(e) => setNewTag({ ...newTag, cor: e.target.value })}
                    className="h-9 w-9 p-0.5 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    value={newTag.cor}
                    onChange={(e) => setNewTag({ ...newTag, cor: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
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
                {editingTag ? 'Salvar Alterações' : 'Cadastrar Tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT MESSAGE TEMPLATE MODAL */}
      <Dialog open={messageTemplateModalOpen} onOpenChange={setMessageTemplateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              {editingMessageTemplate ? 'Editar Template de Mensagem' : 'Novo Template de Mensagem'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMessageTemplate} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Template *</Label>
              <Input
                required
                placeholder="Ex: Abordagem Inicial - Tributário"
                value={messageTemplateData.nome}
                onChange={(e) =>
                  setMessageTemplateData({ ...messageTemplateData, nome: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria / Tipo *</Label>
                <Select
                  value={messageTemplateData.tipo}
                  onValueChange={(val: any) =>
                    setMessageTemplateData({ ...messageTemplateData, tipo: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abordagem">Abordagem</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="objeção">Objeção</SelectItem>
                    <SelectItem value="pós-venda">Pós-venda</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <div className="flex items-center gap-2 h-9 px-1">
                  <Switch
                    checked={messageTemplateData.status === 'ativo'}
                    onCheckedChange={(checked) =>
                      setMessageTemplateData({
                        ...messageTemplateData,
                        status: checked ? 'ativo' : 'inativo',
                      })
                    }
                  />
                  <span className="text-xs font-semibold">
                    {messageTemplateData.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Conteúdo da Mensagem *</Label>
              <Textarea
                required
                rows={5}
                placeholder="Olá, aqui é do escritório Teixeira & Nascimento Advogados..."
                value={messageTemplateData.conteudo}
                onChange={(e) =>
                  setMessageTemplateData({ ...messageTemplateData, conteudo: e.target.value })
                }
                className="text-xs leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMessageTemplateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                {editingMessageTemplate ? 'Salvar Alterações' : 'Criar Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT CUSTOM FIELD MODAL */}
      <Dialog open={customFieldModalOpen} onOpenChange={setCustomFieldModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {editingCustomField ? 'Editar Campo Personalizado' : 'Novo Campo Personalizado'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCustomField} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Campo *</Label>
              <Input
                required
                placeholder="Ex: Faturamento Mensal, Ramo de Atuação"
                value={customFieldData.nome}
                onChange={(e) => setCustomFieldData({ ...customFieldData, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Entidade Alvo *</Label>
                <Select
                  value={customFieldData.modulo}
                  onValueChange={(val: any) =>
                    setCustomFieldData({ ...customFieldData, modulo: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="opportunity">Oportunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo do Campo *</Label>
                <Select
                  value={customFieldData.tipo}
                  onValueChange={(val: any) =>
                    setCustomFieldData({ ...customFieldData, tipo: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="moeda">Moeda (R$)</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="selecao">Seleção (Dropdown)</SelectItem>
                    <SelectItem value="booleano">Booleano (Sim/Não)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {customFieldData.tipo === 'selecao' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Opções de Seleção (separadas por vírgula) *
                </Label>
                <Input
                  required
                  placeholder="Opção A, Opção B, Opção C"
                  value={customFieldData.opcoesStr}
                  onChange={(e) =>
                    setCustomFieldData({ ...customFieldData, opcoesStr: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={customFieldData.obrigatorio}
                  onCheckedChange={(checked) =>
                    setCustomFieldData({ ...customFieldData, obrigatorio: checked })
                  }
                />
                <Label className="text-xs cursor-pointer font-semibold">Obrigatório?</Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ordem de Exibição</Label>
                <Input
                  type="number"
                  value={customFieldData.ordem}
                  onChange={(e) =>
                    setCustomFieldData({ ...customFieldData, ordem: Number(e.target.value) })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomFieldModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#0A1F3F] text-white">
                {editingCustomField ? 'Salvar Alterações' : 'Criar Campo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SettingsPage
