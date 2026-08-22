import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Scale,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
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
import pb from '@/lib/pocketbase/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useTenant()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      toast({
        title: 'Acesso autorizado',
        description: 'Bem-vindo(a) ao CRM Teixeira & Nascimento.',
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMessage(
        err?.message || 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickDemoLogin = async () => {
    setEmail('fabio.saantost@gmail.com')
    setPassword('Skip@Pass')
    setIsLoading(true)
    setErrorMessage(null)
    try {
      await login('fabio.saantost@gmail.com', 'Skip@Pass')
      toast({
        title: 'Login de Administrador efetuado',
        description: 'Bem-vindo de volta, Dr. Fabio Santos.',
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao autenticar admin padrão.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: 'Informe seu e-mail',
        description: 'Digite o e-mail no formulário para enviarmos o link de recuperação.',
        variant: 'destructive',
      })
      return
    }

    setIsResetting(true)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setResetSent(true)
      toast({
        title: 'E-mail de recuperação enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro na solicitação',
        description: err?.message || 'Não foi possível enviar o e-mail de recuperação.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#061224] flex flex-col justify-center items-center p-4 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
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
              Advogados Associados • CRM Jurídico
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-[#152e59] bg-[#0A1F3F]/90 backdrop-blur-xl shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              Acesso ao Sistema
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Entre com suas credenciais corporativas para acessar o painel de inteligência
              comercial.
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
                <Label htmlFor="email" className="text-xs font-medium text-slate-200">
                  E-mail Corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.nome@escritorio.adv.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-[#07162c] border-[#1e3a6d] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-200">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(!showForgotModal)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
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

              {showForgotModal && (
                <div className="p-3 rounded-lg bg-[#07162c] border border-amber-500/30 text-xs space-y-2">
                  <div className="text-slate-300">
                    Informe seu e-mail acima e clique no botão abaixo para receber o link de
                    recuperação de senha:
                  </div>
                  {resetSent ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> E-mail de redefinição enviado com
                      sucesso!
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePasswordReset}
                      disabled={isResetting}
                      className="w-full border-amber-500/50 text-amber-300 hover:bg-amber-500/10 text-xs h-8"
                    >
                      {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      Enviar e-mail de recuperação
                    </Button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 text-sm h-10 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    Entrar no CRM
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col gap-3 pt-2 border-t border-[#152e59]/60 text-center">
            <div className="text-xs text-slate-300">
              Novo escritório ou filial jurídica?{' '}
              <Link
                to="/cadastro"
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4"
              >
                Cadastrar escritório
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          Conexão Segura e Criptografia LGPD Jurídica
        </div>
      </div>
    </div>
  )
}
