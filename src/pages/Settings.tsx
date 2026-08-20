import React, { useState } from 'react'
import {
  Building2,
  Share2,
  ShieldCheck,
  Save,
  CheckCircle2,
  Globe,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  Code2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenant } from '@/contexts/TenantContext'
import { useMetaPixel } from '@/hooks/useMetaPixel'
import { useToast } from '@/hooks/use-toast'
import { MetaPixelDiagnosticsCard } from '@/components/MetaPixelDiagnosticsCard'

export const SettingsPage: React.FC = () => {
  const { tenant, pixelId, updatePixelId } = useTenant()
  const { hasConsent, setConsent } = useMetaPixel()
  const { toast } = useToast()

  const [tenantName, setTenantName] = useState(tenant?.name || '')
  const [metaPixelInput, setMetaPixelInput] = useState(pixelId || '')
  const [lgpdRequired, setLgpdRequired] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  React.useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name || '')
      setMetaPixelInput(tenant.meta_pixel_id || tenant.settings?.meta_pixel_id || '')
    }
  }, [tenant])

  const handleSavePixelSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updatePixelId(metaPixelInput.trim())
      toast({
        title: 'Configurações Salvas!',
        description: `Meta Pixel ID (${metaPixelInput.trim() || 'vazio'}) salvo e injetado com sucesso no tenant ${tenant?.name}.`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Configurações do Tenant &amp; Plataforma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina parâmetros gerais, ID do Meta Pixel para rastreamento comercial e conformidade
            LGPD.
          </p>
        </div>

        <Badge
          variant="outline"
          className="h-7 px-3 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 w-fit"
        >
          Tenant: {tenant?.name} ({tenant?.slug})
        </Badge>
      </div>

      <Tabs defaultValue="meta_pixel" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 w-full md:w-[500px]">
          <TabsTrigger value="meta_pixel" className="gap-2">
            <Share2 className="h-4 w-4" /> Meta Pixel
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" /> Geral &amp; Empresa
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> LGPD &amp; Privacidade
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Meta Pixel */}
        <TabsContent value="meta_pixel" className="space-y-6">
          <form onSubmit={handleSavePixelSettings}>
            <Card className="border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Configuração de Meta Pixel por Tenant
                      </CardTitle>
                      <CardDescription>
                        Insira o Meta Pixel ID oficial para injetar automaticamente o script em
                        todas as páginas deste tenant.
                      </CardDescription>
                    </div>
                  </div>
                  {metaPixelInput && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Pixel Definido
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="meta_pixel_id"
                      className="text-sm font-semibold flex items-center justify-between"
                    >
                      <span>Meta Pixel ID (Dataset ID)</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Obrigatório para rastreio
                      </span>
                    </Label>
                    <Input
                      id="meta_pixel_id"
                      placeholder="Ex: 98127391823 ou 123456789012345"
                      value={metaPixelInput}
                      onChange={(e) => setMetaPixelInput(e.target.value)}
                      className="font-mono text-base tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      O script{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
                        fbq(&apos;init&apos;, &apos;{metaPixelInput || 'ID'}&apos;)
                      </code>{' '}
                      é injetado no <strong>&lt;head&gt;</strong> da plataforma em runtime.
                    </p>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mapeamento de Eventos Automáticos
                    </h4>
                    <ul className="text-xs space-y-2 text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong>PageView:</strong> Disparado em todas as mudanças de rota.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong>Lead:</strong> Disparado na criação e qualificação de leads no
                          CRM.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong>SubmitApplication:</strong> Disparado ao enviar proposta
                          comercial.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong>Purchase:</strong> Disparado quando oportunidade é marcada como
                          ganha.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Respeitar Consentimento LGPD</div>
                      <div className="text-xs text-muted-foreground">
                        Só dispara eventos do Pixel se o usuário tiver consentimento concedido no
                        navegador.
                      </div>
                    </div>
                  </div>
                  <Switch checked={hasConsent} onCheckedChange={(val) => setConsent(val)} />
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t py-4 bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMetaPixelInput(tenant?.meta_pixel_id || '')}
                  disabled={isSaving}
                >
                  Restaurar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Configurações do Pixel'}
                </Button>
              </CardFooter>
            </Card>
          </form>

          {/* Live Diagnostics Card */}
          <MetaPixelDiagnosticsCard />
        </TabsContent>

        {/* Tab 2: General */}
        <TabsContent value="general">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Empresa / Tenant</CardTitle>
              <CardDescription>
                Informações cadastrais da sua conta na Plataforma SKIP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Organização</Label>
                  <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Slug do Tenant</Label>
                  <Input value={tenant?.slug || ''} disabled className="bg-muted font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Plano Atual</Label>
                  <Input
                    value={tenant?.plan?.toUpperCase() || 'ENTERPRISE'}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moeda Padrão</Label>
                  <Input value="BRL (R$)" disabled className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: LGPD */}
        <TabsContent value="lgpd">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Conformidade LGPD &amp; Cookies</CardTitle>
              <CardDescription>
                Regras de proteção de dados e rastreamento anônimo conforme Lei Geral de Proteção de
                Dados (Lei nº 13.709/2018).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      Exigir Consentimento para Scripts de Terceiros
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bloqueia a execução do Meta Pixel até que o usuário aceite a política de
                      cookies.
                    </div>
                  </div>
                  <Switch checked={lgpdRequired} onCheckedChange={setLgpdRequired} />
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-background text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-blue-500" />
                  Hook useMetaPixel com Verificação de Consentimento:
                </div>
                <p className="text-muted-foreground">
                  O hook interno{' '}
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">
                    useMetaPixel()
                  </code>{' '}
                  verifica o estado de{' '}
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">hasConsent()</code> antes
                  de despachar eventos para o{' '}
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">window.fbq</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
