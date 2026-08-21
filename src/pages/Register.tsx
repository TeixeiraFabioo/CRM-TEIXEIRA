import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Scale,
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTenant } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useTenant()
  const { toast } = useToast()

  const [officeName, setOfficeName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!officeName.trim() || !adminName.trim() || !email.trim() || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.')
      return
    }

    setIsLoading(true)
    try {
      await register({
        officeName: officeName.trim(),
        name: adminName.trim(),
        email: email.trim(),
        password,
      })

      toast({
        title: 'Escritório cadastrado com sucesso!',
        description: 'Seu workspace foi configurado e você já está autenticado.',
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error('Registration error:', err)
      setErrorMessage(
        err?.message ||
          'Falha ao criar o escritório. Verifique se o e-mail já está cadastrado e tente novamente.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#061224] flex flex-col justify-center items-center p-4 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-300/40">
            <Scale className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-slate-100 font-legal-serif">
              TEIXEIRA &amp; NASCIMENTO
            </h1>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-medium">
              Plataforma de Inteligência Comercial e CRM Jurídico
            </p>
          </div>
        </div>

        {/* Register Card */}
        <Card className="border border-[#152e59] bg-[#0A1F3F]/90 backdrop-blur-xl shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" />
              Cadastrar Novo Escritório
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Crie uma conta para o seu escritório ou filial e configure seu workspace comercial
              jurídico.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-0">
              {errorMessage && (
                <Alert
                  variant="destructive"
                  className="bg-red-950/50 border-red-800 text-red-200 text-xs py-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="officeName" className="text-xs font-medium text-slate-200">
                  Nome do Escritório / Razão Social *
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="officeName"
                    type="text"
                    placeholder="Ex: Teixeira & Nascimento Advogados"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    required
                    className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminName" className="text-xs font-medium text-slate-200">
                  Nome do Sócio / Administrador *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Ex: Dr. Fabio Santos"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-200">
                  E-mail Corporativo do Administrador *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@escritorio.adv.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-200">
                    Senha (mín. 8 caracteres) *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-200">
                    Confirmar Senha *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#07162c] border border-[#1e3a6d] text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Workspace Incluso:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                  <li>Funil Kanban e pipeline de vendas jurídicas</li>
                  <li>Módulo de propostas e contratos com assinatura</li>
                  <li>Metas, comissões e relatórios com inteligência comercial</li>
                  <li>Integração com Meta Pixel e Conversions API</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 text-sm h-10 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando escritório e configurando...
                  </>
                ) : (
                  <>
                    Criar Conta &amp; Acessar CRM
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex justify-center pt-2 border-t border-[#152e59]/60">
            <div className="text-xs text-slate-300">
              Já possui uma conta ativa?{' '}
              <Link
                to="/login"
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4"
              >
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          Seus dados são protegidos por RLS e criptografia nativa
        </div>
      </div>
    </div>
  )
}
