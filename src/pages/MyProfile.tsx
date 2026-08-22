import React, { useState, useEffect } from 'react'
import {
  UserCircle,
  Mail,
  ShieldCheck,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import pb from '@/lib/pocketbase/client'

/**
 * "Meu Perfil" / MyProfile page — accessible to EVERY authenticated user.
 * Allows editing own name, email, avatar and changing password.
 * Always targets `pb.authStore.model.id` / `pb.authStore.record.id` to guarantee
 * a user ONLY edits themselves.
 */
export default function MyProfile() {
  const { user, refreshTenant, logout, userRole } = useTenant()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password change form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const currentUserId = pb.authStore.record?.id || user?.id

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setAvatarUrl(user.avatar || '')
    }
  }, [user?.id])

  if (!user || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Carregando perfil...
      </div>
    )
  }

  const roleLabel =
    user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gestor' : 'Advogado'

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Preencha nome e e-mail',
        variant: 'destructive',
      })
      return
    }

    setIsSavingProfile(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      }

      if (avatarUrl.trim()) {
        payload.avatar = avatarUrl.trim()
      }

      // STRICT: Always update ONLY self via current authenticated user id
      await pb.collection('users').update(currentUserId, payload)

      try {
        await pb.collection('audit_logs').create({
          tenant_id: user.tenant_id,
          user_id: currentUserId,
          action: 'update_profile',
          resource_type: 'user',
          resource_id: currentUserId,
          new_value: { name: name.trim(), email: email.trim().toLowerCase() },
        })
      } catch {
        /* audit logging is best-effort */
      }

      await refreshTenant()

      toast({
        title: 'Perfil atualizado com sucesso!',
        description: 'Seus dados foram salvos.',
      })
    } catch (err: any) {
      console.error('Error updating profile:', err)
      const errorMsg =
        err?.data?.data?.email?.message || err?.message || 'Não foi possível atualizar seu perfil.'
      toast({
        title: 'Erro ao atualizar perfil',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Preencha todos os campos de senha',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Nova senha muito curta',
        description: 'A nova senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'As senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword === oldPassword) {
      toast({
        title: 'Senha inválida',
        description: 'A nova senha deve ser diferente da senha atual.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingPassword(true)
    try {
      // STRICT: Always update self password
      await pb.collection('users').update(currentUserId, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })

      try {
        await pb.collection('audit_logs').create({
          tenant_id: user.tenant_id,
          user_id: currentUserId,
          action: 'change_own_password',
          resource_type: 'user',
          resource_id: currentUserId,
        })
      } catch {
        /* audit logging is best-effort */
      }

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua nova senha já está ativa para os próximos acessos.',
      })

      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Error changing password:', err)
      const raw = err?.data?.data
      let description = err?.message || 'Não foi possível alterar a senha.'
      if (raw) {
        if (raw.oldPassword?.message) description = raw.oldPassword.message
        else if (raw.password?.message) description = raw.password.message
      }
      toast({
        title: 'Erro ao alterar senha',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-legal-serif flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-amber-500" />
          Meu Perfil
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie seus dados de acesso e segurança pessoal no CRM jurídico.
        </p>
      </div>

      {/* Profile summary card */}
      <Card className="bg-[#0A1F3F] text-white border-[#152e59] shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold flex items-center justify-center text-xl ring-2 ring-amber-400/30 shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base text-slate-100 truncate">{user.name}</div>
                <div className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-amber-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {roleLabel}
                  </Badge>
                  {user.active !== false && user.status !== 'inactive' ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      Conta Ativa
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                      Conta Inativa
                    </Badge>
                  )}
                  {user.team && (
                    <Badge className="bg-blue-400/20 text-blue-200 border-blue-400/30 text-[10px]">
                      Equipe:{' '}
                      {user.team === 'comercial'
                        ? 'Comercial'
                        : user.team === 'juridico'
                          ? 'Jurídico'
                          : user.team === 'financeiro'
                            ? 'Financeiro'
                            : user.team}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout()
                window.location.assign('/login')
              }}
              className="text-xs h-8 border-red-500/40 text-red-300 hover:bg-red-950/40 hover:text-red-200 w-fit"
            >
              Encerrar Sessão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" />
            Dados Pessoais
          </CardTitle>
          <CardDescription className="text-xs">
            Atualize suas informações básicas de identificação no escritório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail de Acesso *</Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
                placeholder="seu.email@escritorio.adv.br"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL do Avatar</Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="h-9 text-xs"
                placeholder="https://..."
              />
              <p className="text-[10px] text-muted-foreground">
                Cole a URL de uma foto ou imagem para seu avatar. Deixe em branco para usar a
                inicial do seu nome.
              </p>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isSavingProfile}
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            Alterar Senha
          </CardTitle>
          <CardDescription className="text-xs">
            Altere sua senha de acesso pessoal. Você precisará informar sua senha atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Segurança da Conta &amp; Criptografia Irreversível
              </AlertTitle>
              <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                As senhas no sistema são armazenadas em hash irreversível (bcrypt). Nem os
                administradores nem o suporte podem visualizar sua senha atual. Informe a senha
                atual para confirmar a troca.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPasswords((s) => !s)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Ocultar senhas
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Mostrar senhas
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Senha Atual *</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-9 text-xs"
                autoComplete="current-password"
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nova Senha *</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confirmar Nova Senha *</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs"
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-red-600 dark:text-red-400">
                    As senhas não conferem.
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> As senhas conferem.
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={
                isSavingPassword ||
                !oldPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                newPassword.length < 8
              }
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {isSavingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
