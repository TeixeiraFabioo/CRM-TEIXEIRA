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
import {
  ServiceRecord,
  TagRecord,
  TemplateRecord,
  MessageTemplateRecord,
  CustomFieldRecord,
  SlaConfigRecord,
  UserRecord,
  LeadDistributionRecord,
} from '@/types/platform'
import { MessageSquareText, SlidersHorizontal, Edit2, Check } from 'lucide-react'

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
  // Reset password mode: 'random' (default) or 'custom'
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  // Edit User modal state
  const [editUserModalOpen, setEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    team: '',
  })
  const isAdmin = userRole === 'admin'

  /**
=======
=======
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
  // Reset Password Confirmation
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  // Reset password mode: 'random' (default) or 'custom'
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

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

  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
=======
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
  // Reset Password Confirmation
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  // Reset password mode: 'random' (default) or 'custom'
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

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

  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
  const isAdmin = userRole === 'admin'

  /**
=======
=======
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
  // Reset Password Confirmation
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  // Reset password mode: 'random' (default) or 'custom'
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

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

  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

  const generateSecurePassword = (length = 12) => {
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
=======
=======
=======
  const isAdmin = userRole === 'admin'

  /**
=======
  // Reset Password Confirmation
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  // Reset password mode: 'random' (default) or 'custom'
  const [resetPasswordMode, setResetPasswordMode] = useState<'random' | 'custom'>('random')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // Toggle User Active Status state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

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

  // Role-based hierarchy:
  //   admin  → can manage any user (incl. other admins), except self
  //   gestor → can only manage users whose role is NOT 'admin' (i.e. manager
  //            and user/advogado), except self
  //   advogado → never reaches this page (RequireRole blocks it), but keep
  //            a safe fallback.
  const isAdmin = userRole === 'admin'

  /**
   * Whether the current user is allowed to perform management actions
   * (reset password / delete / toggle active / edit) on `target`.
   * Admins: anyone but self. Gestor: only non-admin users (and not self,
   * but self-handling stays in each handler for a clearer toast).
   */
  const canManageUser = (target: UserRecord): boolean => {
    if (!target) return false
    if (isAdmin) return true
    if (userRole === 'gestor') return target.role !== 'admin'
    return false
  }

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
      const [sList, tList, msgTmpList, cfList, tmpList, slaList, uList, distConfig, distRecent] =
        await Promise.all([
          CrmService.getServices(tenant.id),
          CrmService.getTags(tenant.id),
          CrmService.getMessageTemplates(tenant.id),
          CrmService.getCustomFields(tenant.id),
          CrmService.getTemplates(tenant.id),
          CrmService.getSlaConfigs(tenant.id),
          CrmService.getUsers(tenant.id),
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

    // Defense-in-depth: never allow resetting an admin's password from a
    // gestor session, even if the dialog was somehow opened.
    if (!canManageUser(userToReset)) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode redefinir a senha de um administrador.',
        variant: 'destructive',
      })
      setResetPasswordModalOpen(false)
      setUserToReset(null)
      return
    }

    let newPassword = ''

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
          description: 'Confirme a nova senha digitando-a novamente.',
          variant: 'destructive',
        })
        return
      }
      newPassword = resetNewPassword
    } else {
      newPassword = generateSecurePassword(12)
    }

    setIsResettingPassword(true)

    try {
      await pb.collection('users').update(userToReset.id, {
        password: newPassword,
        passwordConfirm: newPassword,
      })

      await CrmService.logAudit(tenant.id, 'reset_password_user', 'user', userToReset.id, null, {
        userEmail: userToReset.email,
        mode: resetPasswordMode,
      })

      toast({
        title: 'Senha redefinida com sucesso!',
        description:
          resetPasswordMode === 'custom'
            ? `Senha personalizada definida para ${userToReset.name}.`
            : `Nova senha aleatória gerada para ${userToReset.name}.`,
      })

      setResetPasswordModalOpen(false)

      // Only reveal the generated password when it was randomly generated;
      // a custom password is already known to the gestor/admin.
      if (resetPasswordMode === 'random') {
        setPasswordModalData({
          userEmail: userToReset.email,
          userName: userToReset.name,
          password: newPassword,
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
        description: err?.message || 'Falha ao atualizar a senha do usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id || !editingUser) return

    // Defense-in-depth: gestor cannot edit an admin.
    if (!canManageUser(editingUser)) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode editar um administrador.',
        variant: 'destructive',
      })
      setEditUserModalOpen(false)
      return
    }

    if (!editUserData.name.trim() || !editUserData.email.trim()) {
      toast({ title: 'Preencha nome e e-mail', variant: 'destructive' })
      return
    }

    setIsSavingEdit(true)
    try {
      const updated = await pb.collection('users').update<UserRecord>(editingUser.id, {
        name: editUserData.name.trim(),
        email: editUserData.email.trim().toLowerCase(),
        role: editUserData.role,
        team: editUserData.team || '',
      })

      await CrmService.logAudit(tenant.id, 'update_user', 'user', editingUser.id, null, {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        team: updated.team,
      })

      toast({
        title: 'Usuário atualizado com sucesso!',
        description: `Dados de ${updated.name} foram salvos.`,
      })

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)),
      )

      setEditUserModalOpen(false)
      setEditingUser(null)
    } catch (err: any) {
      console.error('Error editing user:', err)
      const errorMsg =
        err?.data?.data?.email?.message ||
        err?.message ||
        'Não foi possível atualizar o usuário.'
      toast({
        title: 'Erro ao atualizar usuário',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdit(false)
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
      <div>
        <h1 className="text-2xl font-bold font-legal-serif">Configurações do Escritório</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestão multi-tenant, equipes jurídicas, catálogo de serviços, distribuição de leads, SLAs
          e auditoria.
        </p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-10 bg-transparent gap-4 overflow-x-auto">
          <TabsTrigger
            value="empresa"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Escritório &amp; Pixel
          </TabsTrigger>
          <TabsTrigger
            value="distribuicao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Distribuição de Leads
          </TabsTrigger>
          <TabsTrigger
            value="sla"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            SLA de Atendimento
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
            value="usuarios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs px-2 whitespace-nowrap"
          >
            Equipe &amp; Usuários ({users.length})
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
                {!isAdmin && (
                  <span className="mt-1 block text-amber-600 dark:text-amber-400">
                    Como Gestor, você gerencia apenas usuários não-administradores (Gestores e
                    Advogados). Administradores não podem ser editados, desativados ou removidos por
                    você.
                  </span>
                )}
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
                    <th className="p-3">Equipe</th>
                    <th className="p-3">Data de Criação</th>
                    <th className="p-3">Último Acesso</th>
                    <th className="p-3 text-center">Status (Ativo)</th>
                    <th className="p-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Carregando usuários do escritório...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Nenhum usuário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isUserActive = u.active !== false && u.status !== 'inactive'
                      const isSelf = u.id === user?.id
                      const canManage = canManageUser(u)

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
                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {u.last_login
                              ? new Date(u.last_login).toLocaleString('pt-BR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'Nunca acessou'}
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

                          <td className="p-3 pr-4 text-right">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(u)
                                    setEditUserData({
                                      name: u.name,
                                      email: u.email,
                                      role: (u.role as 'admin' | 'manager' | 'user') || 'user',
                                      team: (u.team as string) || '',
                                    })
                                    setEditUserModalOpen(true)
                                  }}
                                  title="Editar usuário"
                                  className="h-7 text-xs px-2 gap-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Editar</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setUserToReset(u)
                                    setResetPasswordMode('random')
                                    setResetNewPassword('')
                                    setResetConfirmPassword('')
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
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                Sem ação
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

        {/* TAB TEMPLATES DE MENSAGEM */}
        <TabsContent value="message_templates" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Templates de Mensagem
              </h3>
              <p className="text-xs text-muted-foreground">
                Modelos prontos de mensagens (abordagem, follow-up, propostas, etc.) para acelerar o
                atendimento no chat.
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

        {/* TAB CAMPOS PERSONALIZADOS */}
        <TabsContent value="custom_fields" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm font-legal-serif flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Campos Personalizados do Tenant
              </h3>
              <p className="text-xs text-muted-foreground">
                Crie atributos customizados para qualificar Leads, Clientes e Oportunidades.
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
                  <th className="p-3">Entidade Alvo (Módulo)</th>
                  <th className="p-3">Tipo de Dado</th>
                  <th className="p-3">Opções (se seleção)</th>
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

        {/* TAB TAGS */}
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

        {/* TAB DISTRIBUIÇÃO DE LEADS */}
        <TabsContent value="distribuicao" className="pt-4 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Distribuição Automática de Leads (Round-Robin)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Distribua novos leads criados automaticamente em fila circular (round-robin) entre
                os vendedores e atendentes ativos do escritório.
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
                <p className="text-[11px] text-muted-foreground">
                  O algoritmo Round-Robin divide os leads em sequência igualitária entre todos os
                  usuários ativos com papel de Vendedor/Atendente ou Consultor.
                </p>
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

          {/* Histórico das últimas distribuições */}
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Últimas Distribuições Registradas</h3>
                <p className="text-xs text-muted-foreground">
                  Registro em tempo real da alocação de leads aos vendedores.
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
                    <th className="p-3">Vendedor / Responsável Atribuído</th>
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
                            <span>{dist.expand?.user_id?.name || dist.user_id || 'Vendedor'}</span>
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

        {/* TAB SLA */}
        <TabsContent value="sla" className="pt-4 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                SLA de Primeiro Atendimento (Tempo de Resposta)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Defina o tempo máximo tolerado para o primeiro contato/mensagem com novos leads.
                Leads sem interação que ultrapassarem esse limite serão sinalizados como atrasados
                em toda a plataforma.
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
                <p className="text-[11px] text-muted-foreground">
                  Padrão do mercado jurídico de alta conversão: <strong>15 a 30 minutos</strong>{' '}
                  para leads de campanhas digitais (Meta/Google).
                </p>
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

          <div className="bg-card border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm">Políticas de SLA Cadastradas</h3>
            {slas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma política de SLA configurada.</p>
            ) : (
              slas.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-muted/40 rounded-lg flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold">
                      {s.equipe || 'Comercial Geral'} • Origem: {s.origem || 'Todas as Origens'}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Horário de Atendimento: {s.horario_inicio || '08:00'} às{' '}
                      {s.horario_fim || '19:00'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {s.first_response_minutes ?? s.tempo_resposta_minutos ?? 15} minutos
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                      {s.is_active !== false && s.ativo !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
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
                <Label className="text-xs font-semibold">Status (is_active)</Label>
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
                placeholder="Olá, aqui é do escritório Teixeira & Nascimento Advogados. Identificamos uma oportunidade para sua empresa..."
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
                placeholder="Ex: Faturamento Mensal, Ramo de Atuação, Decisor"
                value={customFieldData.nome}
                onChange={(e) => setCustomFieldData({ ...customFieldData, nome: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Entidade Alvo (Módulo) *</Label>
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
                    <SelectItem value="customer">Cliente (Customer)</SelectItem>
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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              Resetar Senha do Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja resetar a senha de <strong>{userToReset?.name}</strong> (
              {userToReset?.email})? A senha anterior deixará de funcionar imediatamente. Por
              segurança, não é possível ver a senha atual do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-1">
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
                Gerar senha aleatória (padrão)
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
                Definir senha personalizada
              </label>
            </div>

            {resetPasswordMode === 'custom' && (
              <div className="space-y-2.5 pl-6 border-l-2 border-amber-500/30">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nova Senha *</Label>
                  <Input
                    type="password"
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
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="h-9 text-xs"
                    autoComplete="new-password"
                  />
                  {resetConfirmPassword &&
                    resetNewPassword !== resetConfirmPassword && (
                      <p className="text-[10px] text-red-600 dark:text-red-400">
                        As senhas não conferem.
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isResettingPassword ||
                (resetPasswordMode === 'custom' &&
                  (!resetNewPassword ||
                    resetNewPassword.length < 8 ||
                    resetNewPassword !== resetConfirmPassword))
              }
              onClick={handleResetPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isResettingPassword
                ? 'Redefinindo...'
                : resetPasswordMode === 'custom'
                  ? 'Definir Senha'
                  : 'Gerar Nova Senha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-legal-serif flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-amber-500" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize os dados de {editingUser?.name}. As alterações são salvas diretamente no
              cadastro do usuário.
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
                <Label className="text-xs font-semibold">Papel / Nível de Acesso *</Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(val: 'admin' | 'manager' | 'user') =>
                    setEditUserData({ ...editUserData, role: val })
                  }
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="user">Advogado / Consultor</SelectItem>
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <p className="text-[10px] text-muted-foreground">
                    Como Gestor, você não pode alterar o papel de um usuário.
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
