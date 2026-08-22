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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/platform'

/**
 * "Meu Perfil" page — accessible to every authenticated user (admin, gestor
 * and advogado). Lets the user update their own name, e-mail and avatar URL,
 * and change their own password (requiring the current password as a guard).
 * All writes go straight to PocketBase's `users` collection; the update API
 * rule allows self-update regardless of role.
 */
export default function MeuPerfilPage() {
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

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setAvatarUrl(user.avatar || '')
    }
  }, [user?.id])

  if (!user) {
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
    if (!user) return
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
      // avatar is a file field in the schema, but the product spec asks for a
      // simple URL input. We send it through; PocketBase will ignore/validate
      // as appropriate. If the user typed nothing, send empty to clear.
      if (avatarUrl.trim()) {
        payload.avatar = avatarUrl.trim()
      }

      await pb.collection('users').update(user.id, payload)

      try {
        await pb.collection('audit_logs').create({
          tenant_id: user.tenant_id,
          user_id: user.id,
          action: 'update_profile',
          resource_type: 'user',
          resource_id: user.id,
          new_value: { name: name.trim(), email: email.trim().toLowerCase() },
        })
      } catch {
        /* audit logging is best-effort */
      }

      // Refresh the auth context so the header/sidebar reflect the new name.
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
    if (!user) return

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
      await pb.collection('users').update(user.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })

      try {
        await pb.collection('audit_logs').create({
          tenant_id: user.tenant_id,
          user_id: user.id,
          action: 'change_own_password',
          resource_type: 'user',
          resource_id: user.id,
        })
      } catch {
        /* audit logging is best-effort */
      }

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Use a nova senha no próximo acesso.',
      })

      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Error changing password:', err)
      const raw = err?.data?.data
      let description = err?.message || 'Não foi possível alterar a senha.'
      // PocketBase returns 400 with a message like "Invalid old password."
      // or "something went wrong" under data.data.oldPassword / password.
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout()
                window.location.assign('/login')
              }}
              className="text-xs h-8 border-red-500/40 text-red-300 hover:bg-red-950/40 hover:text-red-200"
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
              <Label className="text-xs font-semibold">E-mail *</Label>
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
                Cole a URL de uma imagem para usar como avatar. Deixe em branco para manter o avatar
                com a inicial do nome.
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Segurança da Conta
              </AlertTitle>
              <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                Informe sua senha atual para confirmar a alteração. A nova senha deve ter no mínimo
                8 caracteres. Por segurança, não é possível ver a senha atual.
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
                placeholder="Sua senha atual"
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
