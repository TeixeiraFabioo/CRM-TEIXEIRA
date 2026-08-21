import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Scale,
  ShieldCheck,
  Award,
  Users2,
  Clock,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Building,
  Landmark,
  Briefcase,
  Sparkles,
  Star,
  ChevronRight,
  Send,
  Lock,
  MessageSquare,
  FileText,
  HelpCircle,
  Gavel,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { LandingPageService } from '@/services/landing'
import { LandingChatWidget } from '@/components/LandingChatWidget'

export function LandingPage() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  // SEO Meta tags dynamically setup
  useEffect(() => {
    document.title = 'Teixeira & Nascimento Advogados | Advocacia Estratégica e Especializada'

    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute(
      'content',
      'Escritório de advocacia com atuação de excelência em Direito Tributário, Bancário, Trabalhista e Consumidor. Defesa técnica, recuperação de ativos e segurança jurídica para sua empresa.',
    )

    // OpenGraph Tags
    const setOgMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', content)
    }

    setOgMeta('og:title', 'Teixeira & Nascimento Advogados | Advocacia Estratégica')
    setOgMeta(
      'og:description',
      'Soluções jurídicas de alta performance em Direito Tributário, Bancário, Trabalhista e Consumidor.',
    )
    setOgMeta('og:type', 'website')
  }, [])

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    area: 'Direito Tributário',
    mensagem: '',
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [leadCreatedId, setLeadCreatedId] = useState<string | null>(null)

  // Extract UTMs from URL parameters
  const utmSource = searchParams.get('utm_source') || ''
  const utmMedium = searchParams.get('utm_medium') || ''
  const utmCampaign = searchParams.get('utm_campaign') || ''
  const utmTerm = searchParams.get('utm_term') || ''
  const utmContent = searchParams.get('utm_content') || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe seu nome completo.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.phone.trim()) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Por favor, informe um número de telefone/WhatsApp para contato.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const createdLead = await LandingPageService.submitLead({
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.phone,
        email: formData.email,
        area: formData.area,
        mensagem: formData.mensagem,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        landing_page: window.location.pathname,
        url_origem: window.location.href,
      })

      setLeadCreatedId(createdLead.id)
      setSubmitted(true)
      toast({
        title: 'Solicitação enviada com sucesso!',
        description: 'Nossa equipe de advogados entrará em contato em breve.',
      })
    } catch (err: any) {
      console.error('Erro ao enviar lead da landing page:', err)
      toast({
        title: 'Erro ao enviar dados',
        description:
          err?.message || 'Houve uma instabilidade temporária. Por favor, tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetForm = () => {
    setSubmitted(false)
    setFormData({
      name: '',
      phone: '',
      email: '',
      area: 'Direito Tributário',
      mensagem: '',
    })
  }

  const scrollToContact = () => {
    document.getElementById('contato-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A1F3F] font-sans antialiased selection:bg-amber-400 selection:text-[#0A1F3F]">
      {/* Top Bar / Announcement */}
      <div className="bg-[#0A1F3F] text-amber-200/90 border-b border-amber-500/20 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold text-[10px] uppercase tracking-wider border border-amber-400/30">
              <Sparkles className="h-2.5 w-2.5" /> Atendimento Nacional
            </span>
            <span>Assessoria Jurídica de Alto Padrão para Empresas e Pessoas Físicas</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-400" /> Seg a Sex: 08h às 19h
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-400" /> São Paulo • Rio de Janeiro • Brasília
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#0A1F3F] text-amber-400 flex items-center justify-center shadow-md border border-amber-400/30">
              <Scale className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="block text-xl font-bold font-legal-serif text-[#0A1F3F] tracking-tight leading-none">
                TEIXEIRA &amp; NASCIMENTO
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-[0.25em] text-amber-600 mt-1">
                Advogados Associados
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
            <a href="#areas" className="hover:text-[#0A1F3F] transition-colors">
              Áreas de Atuação
            </a>
            <a href="#diferenciais" className="hover:text-[#0A1F3F] transition-colors">
              Diferenciais
            </a>
            <a href="#depoimentos" className="hover:text-[#0A1F3F] transition-colors">
              Depoimentos
            </a>
            <a href="#contato-form" className="hover:text-[#0A1F3F] transition-colors">
              Contato
            </a>
          </nav>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <Button
              onClick={scrollToContact}
              className="bg-[#0A1F3F] hover:bg-[#133363] text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm px-4 sm:px-5 h-10 rounded-lg shadow-md border border-amber-400/30 transition-all"
            >
              Fale com um Especialista
            </Button>
            <Link
              to="/login"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0A1F3F] font-medium px-2 py-1 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" /> Acesso CRM
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A1F3F] via-[#0E284F] to-[#0A1F3F] text-white py-16 sm:py-24 lg:py-28">
        {/* Background Decorative Pattern */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25px 25px, #D4AF37 2%, transparent 0%), radial-gradient(circle at 75px 75px, #D4AF37 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        />
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wide">
                <ShieldCheck className="h-4 w-4" /> Tradição, Rigor Técnico e Resultados Concretos
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-legal-serif text-white tracking-tight leading-[1.15]">
                Advocacia Estratégica para Proteger e Impulsionar seu Patrimônio.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                Atuação combativa e personalizada em <strong>Direito Tributário</strong>,{' '}
                <strong>Bancário</strong>, <strong>Trabalhista</strong> e{' '}
                <strong>Consumidor</strong>. Aliamos profunda fundamentação jurídica e velocidade de
                resposta para assegurar o melhor desfecho para o seu negócio.
              </p>

              {/* Highlights badge grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-xl mx-auto lg:mx-0">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
                  <div className="text-amber-400 font-bold text-xl sm:text-2xl font-legal-serif">
                    +R$ 85M
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Em passivos recuperados</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
                  <div className="text-amber-400 font-bold text-xl sm:text-2xl font-legal-serif">
                    +1.800
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Causas patrocinadas</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs col-span-2 sm:col-span-1">
                  <div className="text-amber-400 font-bold text-xl sm:text-2xl font-legal-serif">
                    98,4%
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Satisfação de clientes</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={scrollToContact}
                  className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-[#0A1F3F] font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 gap-2 transition-all hover:scale-[1.02]"
                >
                  Solicitar Diagnóstico Jurídico <ArrowRight className="h-4 w-4" />
                </Button>
                <a
                  href="#areas"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium py-2 px-3 transition-colors"
                >
                  Conhecer áreas de atuação ↓
                </a>
              </div>
            </div>

            {/* Right Card: Quick Capture Form in Hero */}
            <div className="lg:col-span-5" id="contato-form">
              <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-amber-400/40 relative">
                {/* Gold Ribbon Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0A1F3F] to-[#133363] text-amber-300 text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full border border-amber-400/50 shadow-md">
                  Consulta Sigilosa &amp; Sem Compromisso
                </div>

                {submitted ? (
                  <div className="py-8 text-center space-y-4 animate-in fade-in-50 duration-300">
                    <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold font-legal-serif text-[#0A1F3F]">
                        Recebemos sua mensagem!
                      </h3>
                      <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                        Um dos nossos advogados especialistas entrará em contato via
                        WhatsApp/telefone nas próximas horas para entender os detalhes do seu caso.
                      </p>
                    </div>

                    {leadCreatedId && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border text-[11px] text-slate-500 font-mono">
                        Protocolo de atendimento: #{leadCreatedId.slice(-6).toUpperCase()}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetForm}
                      className="text-xs text-[#0A1F3F] border-slate-300 hover:bg-slate-50"
                    >
                      Enviar outra solicitação
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="text-left space-y-1 border-b pb-3">
                      <h3 className="text-lg font-bold font-legal-serif text-[#0A1F3F]">
                        Fale com nossos Advogados
                      </h3>
                      <p className="text-xs text-slate-500">
                        Preencha os campos abaixo para uma triagem preliminar sigilosa.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nome Completo <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Dr. Marcelo Albuquerque"
                        className="h-10 text-xs bg-slate-50 border-slate-300 focus-visible:ring-[#0A1F3F]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Telefone / WhatsApp <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 99876-5432"
                          className="h-10 text-xs bg-slate-50 border-slate-300 focus-visible:ring-[#0A1F3F]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="marcelo@empresa.com"
                          className="h-10 text-xs bg-slate-50 border-slate-300 focus-visible:ring-[#0A1F3F]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-semibold text-slate-700">
                        Área de Interesse
                      </Label>
                      <Select
                        value={formData.area}
                        onValueChange={(val) => setFormData({ ...formData, area: val })}
                      >
                        <SelectTrigger className="h-10 text-xs bg-slate-50 border-slate-300 focus:ring-[#0A1F3F]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Direito Tributário">
                            ⚖️ Direito Tributário (Recuperação de Créditos e Teses)
                          </SelectItem>
                          <SelectItem value="Direito Bancário">
                            🏦 Direito Bancário (Revisão Contratual e Juros)
                          </SelectItem>
                          <SelectItem value="Direito Trabalhista">
                            💼 Direito Trabalhista (Defesa e Consultoria Preventiva)
                          </SelectItem>
                          <SelectItem value="Direito do Consumidor">
                            🛡️ Direito do Consumidor de Alta Complexidade
                          </SelectItem>
                          <SelectItem value="Outro Assunto Jurídico">
                            📁 Outro Assunto Jurídico / Geral
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-semibold text-slate-700">
                        Resumo da Demanda / Mensagem (Opcional)
                      </Label>
                      <Textarea
                        rows={3}
                        value={formData.mensagem}
                        onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                        placeholder="Descreva brevemente a situação ou dúvida..."
                        className="text-xs bg-slate-50 border-slate-300 resize-none focus-visible:ring-[#0A1F3F]"
                      />
                    </div>

                    {/* UTM indicators if present */}
                    {utmSource && (
                      <div className="text-[10px] text-slate-400 font-mono text-left truncate">
                        Origem detectada: {utmSource} {utmCampaign ? `(${utmCampaign})` : ''}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-[#0A1F3F] hover:bg-[#133363] text-amber-300 hover:text-amber-200 font-bold text-xs sm:text-sm rounded-lg shadow-md border border-amber-400/40 gap-2"
                    >
                      {loading ? (
                        'Processando envio...'
                      ) : (
                        <>
                          <Send className="h-4 w-4 text-amber-400" /> Enviar Mensagem para Análise
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      <span>
                        Seus dados estão protegidos sob sigilo profissional (Lei 8.906/94).
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BANNER / CREDENTIALS */}
      <section className="bg-slate-100 border-y border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <ShieldCheck className="h-6 w-6 text-amber-600 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#0A1F3F]">Compliance Total</div>
                <div className="text-[11px] text-slate-500">Conformidade e Ética OAB</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Scale className="h-6 w-6 text-amber-600 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#0A1F3F]">Teses Atualizadas</div>
                <div className="text-[11px] text-slate-500">STF, STJ e Tribunais Regionais</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Award className="h-6 w-6 text-amber-600 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#0A1F3F]">Excelência Técnica</div>
                <div className="text-[11px] text-slate-500">Corpo jurídico especializado</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-6 w-6 text-amber-600 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#0A1F3F]">Agilidade Comercial</div>
                <div className="text-[11px] text-slate-500">Retorno rápido e assertivo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="areas" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-300 font-semibold uppercase tracking-wider text-xs px-3 py-1"
            >
              Nossa Expertise
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-legal-serif text-[#0A1F3F] tracking-tight">
              Áreas de Atuação Especializada
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Soluções jurídicas estruturadas para mitigar riscos, otimizar cargas tributárias e
              reaver valores pagos indevidamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 1. Direito Tributário */}
            <div className="group bg-[#F8FAFC] hover:bg-white rounded-2xl p-7 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-[#0A1F3F] text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold font-legal-serif text-[#0A1F3F]">
                  Direito Tributário
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Recuperação de créditos tributários sobre a folha e faturamento (Tema 69 STF,
                  PIS/COFINS, ICMS, INSS verbas indenizatórias) e defesas fiscais administrativas e
                  judiciais.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Recuperação de Tributos Federais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Planejamento Tributário Eficiente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Anulação de Autos de Infração</span>
                  </li>
                </ul>
              </div>
              <Button
                variant="ghost"
                onClick={scrollToContact}
                className="mt-6 w-full justify-between text-xs font-semibold text-[#0A1F3F] group-hover:text-amber-600 group-hover:bg-amber-50 p-2"
              >
                Analisar caso tributário <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 2. Direito Bancário */}
            <div className="group bg-[#F8FAFC] hover:bg-white rounded-2xl p-7 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-[#0A1F3F] text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Landmark className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold font-legal-serif text-[#0A1F3F]">
                  Direito Bancário
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Revisão minuciosa de contratos de financiamento, Cédulas de Crédito Bancário
                  (CCB), capital de giro, tarifas indevidas e limitação de juros abusivos.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Renegociação de Dívidas Bancárias</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Revisão de Juros Abusivos em CCB</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Desbloqueio de Bens e Contas</span>
                  </li>
                </ul>
              </div>
              <Button
                variant="ghost"
                onClick={scrollToContact}
                className="mt-6 w-full justify-between text-xs font-semibold text-[#0A1F3F] group-hover:text-amber-600 group-hover:bg-amber-50 p-2"
              >
                Revisar contratos bancários <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 3. Direito Trabalhista */}
            <div className="group bg-[#F8FAFC] hover:bg-white rounded-2xl p-7 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-[#0A1F3F] text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold font-legal-serif text-[#0A1F3F]">
                  Direito Trabalhista
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Consultoria preventiva empresarial, auditoria de passivos e defesa em reclamações
                  trabalhistas de alto impacto financeiro para empresas e executivos.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Auditoria Preventiva de Riscos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Contencioso Trabalhista Estratégico</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Acordos Extrajudiciais Homologados</span>
                  </li>
                </ul>
              </div>
              <Button
                variant="ghost"
                onClick={scrollToContact}
                className="mt-6 w-full justify-between text-xs font-semibold text-[#0A1F3F] group-hover:text-amber-600 group-hover:bg-amber-50 p-2"
              >
                Consultar área trabalhista <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 4. Direito do Consumidor */}
            <div className="group bg-[#F8FAFC] hover:bg-white rounded-2xl p-7 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-[#0A1F3F] text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold font-legal-serif text-[#0A1F3F]">
                  Direito do Consumidor
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Defesa em litígios complexos de consumo, fraudes digitais, indenizações por danos
                  morais e materiais decorrentes de falha grave na prestação de serviços.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Fraudes Financeiras e Golpes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Negativação e Danos Morais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Rescisão Contratual e Restituição</span>
                  </li>
                </ul>
              </div>
              <Button
                variant="ghost"
                onClick={scrollToContact}
                className="mt-6 w-full justify-between text-xs font-semibold text-[#0A1F3F] group-hover:text-amber-600 group-hover:bg-amber-50 p-2"
              >
                Analisar direito do consumidor <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US / METHODOLOGY */}
      <section id="diferenciais" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="bg-amber-400/10 text-amber-300 border-amber-400/30 text-xs uppercase tracking-wider px-3 py-1"
              >
                Nossos Diferenciais
              </Badge>

              <h2 className="text-3xl sm:text-4xl font-bold font-legal-serif tracking-tight leading-tight">
                Por que o Teixeira &amp; Nascimento é a Escolha Certa para o Seu Caso?
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
                Compreendemos que demandas jurídicas afetam diretamente o fluxo de caixa, o
                patrimônio e a tranquilidade de nossos clientes. Por isso, operamos com
                transparência irrestrita e foco obstinado em resultados.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Gavel className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-legal-serif text-white">
                      Análise Prévia de Viabilidade Econômica
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Antes de qualquer protocolo, calculamos os riscos e a relação custo-benefício
                      para que você tome decisões 100% embasadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-legal-serif text-white">
                      Comunicação Clara e Acompanhamento em Tempo Real
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Relatórios periódicos em linguagem acessível e canal direto via WhatsApp com o
                      advogado responsável pelo seu processo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-legal-serif text-white">
                      Honorários Alinhados ao Sucesso (Ad Exitum)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Modelos de contratação flexíveis em que a maior parte da remuneração é
                      atrelada ao ganho financeiro efetivo gerado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right illustration / quote box */}
            <div className="bg-gradient-to-br from-[#0A1F3F] to-[#163B6E] p-8 sm:p-10 rounded-3xl border border-amber-500/30 shadow-2xl relative">
              <div className="space-y-6">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <blockquote className="text-lg sm:text-xl font-legal-serif text-slate-100 italic leading-relaxed">
                  "A excelência jurídica não reside apenas no domínio estrito da lei, mas na
                  capacidade de traduzir teses complexas em segurança financeira e prosperidade para
                  quem confia em nosso trabalho."
                </blockquote>

                <div className="pt-4 border-t border-white/10 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold font-legal-serif">
                    TN
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Conselho Diretivo</div>
                    <div className="text-xs text-amber-300/80">
                      Teixeira &amp; Nascimento Advogados
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (PLACEHOLDER REALISTA) */}
      <section id="depoimentos" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-14">
            <Badge
              variant="outline"
              className="bg-amber-100/60 text-amber-800 border-amber-300 font-semibold uppercase tracking-wider text-xs px-3 py-1"
            >
              Depoimentos &amp; Casos de Sucesso
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-legal-serif text-[#0A1F3F] tracking-tight">
              O que dizem os clientes que defendemos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Depoimento 1 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Recuperamos mais de R$ 420 mil em créditos tributários sobre a folha de pagamento
                  em menos de 6 meses. O atendimento da equipe tributária foi cirúrgico e sem nenhum
                  susto com o fisco."
                </p>
              </div>
              <div className="pt-3 border-t flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#0A1F3F] text-amber-300 flex items-center justify-center text-xs font-bold font-legal-serif">
                  RA
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0A1F3F]">Roberto Alencar</div>
                  <div className="text-[11px] text-slate-500">
                    Diretor Financeiro • Grupo Alencar Log
                  </div>
                </div>
              </div>
            </div>

            {/* Depoimento 2 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Estávamos sofrendo com juros abusivos em uma Cédula de Crédito Bancário que
                  sufocava nossa operação. O Teixeira & Nascimento negociou uma redução expressiva
                  de 45% do saldo devedor."
                </p>
              </div>
              <div className="pt-3 border-t flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#0A1F3F] text-amber-300 flex items-center justify-center text-xs font-bold font-legal-serif">
                  FM
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0A1F3F]">Fernanda Medeiros</div>
                  <div className="text-[11px] text-slate-500">
                    Sócia-Fundadora • Medeiros Indústria
                  </div>
                </div>
              </div>
            </div>

            {/* Depoimento 3 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Assessoria trabalhista preventiva de altíssimo nível. Reformularam todos os
                  contratos e rotinas da nossa empresa, zerando novos passivos nos últimos dois
                  anos."
                </p>
              </div>
              <div className="pt-3 border-t flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#0A1F3F] text-amber-300 flex items-center justify-center text-xs font-bold font-legal-serif">
                  CL
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0A1F3F]">Carlos Lima Jr.</div>
                  <div className="text-[11px] text-slate-500">CEO • TechServices Brasil</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="bg-gradient-to-r from-[#0A1F3F] via-[#102D58] to-[#0A1F3F] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <Scale className="h-12 w-12 text-amber-400 mx-auto stroke-[1.8]" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-legal-serif tracking-tight text-white">
            Não Deixe Seus Direitos Prescreverem. Converse com um Advogado Hoje.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-light">
            Nossa equipe está pronta para realizar uma análise prévia e orientar os caminhos
            jurídicos mais seguros e rentáveis para você ou sua empresa.
          </p>
          <div className="pt-2">
            <Button
              size="lg"
              onClick={scrollToContact}
              className="h-12 px-8 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-[#0A1F3F] font-bold text-sm rounded-xl shadow-xl shadow-amber-500/25 transition-transform hover:scale-105"
            >
              Falar com a Equipe Jurídica Agora
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#061429] text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5 text-white">
                <div className="h-8 w-8 rounded-lg bg-[#0A1F3F] text-amber-400 flex items-center justify-center border border-amber-400/40">
                  <Scale className="h-4 w-4" />
                </div>
                <span className="font-bold font-legal-serif text-base tracking-wide">
                  TEIXEIRA &amp; NASCIMENTO ADVOGADOS
                </span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed text-[11px]">
                Sociedade de advogados com registro na OAB/SP sob nº 438.921. Atuação contenciosa e
                consultiva com foco em resultados econômicos e integridade jurídica.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-legal-serif uppercase tracking-wider text-amber-400">
                Áreas de Atuação
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>Direito Tributário e Fiscal</li>
                <li>Direito Bancário e Financeiro</li>
                <li>Direito Trabalhista Empresarial</li>
                <li>Direito do Consumidor Estratégico</li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-legal-serif uppercase tracking-wider text-amber-400">
                Atendimento
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-amber-400" />
                  <span>(11) 3450-8900 / (11) 99876-5432</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-amber-400" />
                  <span>contato@teixeiranascimento.adv.br</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  <span>Av. Paulista, 1842 - 14º andar, SP</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Teixeira &amp; Nascimento Advogados Associados. Todos os
              direitos reservados.
            </div>
            <div className="flex gap-4">
              <span>Termos de Uso</span>
              <span>•</span>
              <span>Política de Privacidade &amp; LGPD</span>
              <span>•</span>
              <Link to="/login" className="hover:text-amber-400 transition-colors">
                Área Restrita CRM
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* FLOATING CHATBOT WIDGET */}
      <LandingChatWidget onScheduleClick={scrollToContact} />
    </div>
  )
}

export default LandingPage
