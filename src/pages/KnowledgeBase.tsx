import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Save,
  Clock,
  User,
  Shield,
  Sparkles,
  Info,
  CheckCircle2,
  FileText,
  HelpCircle,
  Eye,
  Edit3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { KnowledgeBaseRecord } from '@/types/platform'
import pb from '@/lib/pocketbase/client'

export function KnowledgeBasePage() {
  const { tenant, user } = useTenant()
  const { toast } = useToast()

  const [record, setRecord] = useState<KnowledgeBaseRecord | null>(null)
  const [content, setContent] = useState<string>('')
  const [initialContent, setInitialContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  // Role permissions check: admin or manager can edit; other roles are read-only
  const canEdit = user?.role === 'admin' || user?.role === 'manager'

  const loadKnowledgeBase = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const kb = await CrmService.getKnowledgeBase(tenant.id)
      if (kb) {
        setRecord(kb as unknown as KnowledgeBaseRecord)
        setContent(kb.content || '')
        setInitialContent(kb.content || '')
      } else {
        // Sample baseline template if completely empty
        const defaultTemplate = `# BASE DE CONHECIMENTO DO ESCRITÓRIO

## 1. DIRETRIZES & TESES JURÍDICAS PRINCIPAIS
- **Direito Tributário:** Recuperação de PIS/COFINS (Tema 69 STF), Não incidência de INSS sobre verbas indenizatórias.
- **Direito Bancário:** Revisão de juros e contratos bancários de capital de giro (CCB).
- **Direito Trabalhista:** Compliance corporativo preventivo e homologação de acordos extrajudiciais.

## 2. POLÍTICA DE HONORÁRIOS E DESCONTOS
- Pro Labore de entrada padrão: R$ 5.000 a R$ 25.000 (parcelado em até 6x).
- Alçada de desconto: Consultor Comercial (até 5%), Gestor (até 10%), Sócios (acima de 10%).
- Honorários de êxito (ad exitum): 15% a 25% sobre o benefício econômico auferido.

## 3. PROCEDIMENTOS DE QUALIFICAÇÃO
1. Identificar se o contato é decisor (Sócio/CFO/Diretor).
2. Levantar regime tributário e faturamento médio.
3. Agendar reunião de diagnóstico técnico de 30 minutos.`
        setContent(defaultTemplate)
        setInitialContent(defaultTemplate)
      }
    } catch (err) {
      console.error('Erro ao carregar base de conhecimento:', err)
      toast({
        title: 'Erro ao carregar base de conhecimento',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKnowledgeBase()
  }, [tenant?.id])

  const handleSave = async () => {
    if (!tenant?.id) return
    if (!canEdit) {
      toast({
        title: 'Ação não permitida',
        description: 'Apenas administradores e gestores podem atualizar a Base de Conhecimento.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const updated = await CrmService.upsertKnowledgeBase(tenant.id, content.trim())
      setRecord(updated as unknown as KnowledgeBaseRecord)
      setInitialContent(content.trim())
      toast({
        title: 'Base de Conhecimento atualizada!',
        description:
          'O Assistente IA agora utilizará as novas regras e teses em todas as consultas.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar base de conhecimento:', err)
      toast({
        title: 'Erro ao salvar base de conhecimento',
        description: err?.message || 'Falha ao persistir no servidor.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const hasUnsavedChanges = content !== initialContent

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold font-legal-serif tracking-tight text-foreground">
              Base de Conhecimento Jurídico
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold gap-1"
            >
              <Sparkles className="h-3 w-3" /> Contexto para Assistente IA
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Centralize teses jurídicas, políticas de honorários, procedimentos de qualificação e
            regras de acordo que alimentam a Inteligência Artificial do escritório.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || (!hasUnsavedChanges && !!record)}
              className="bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white text-xs gap-1.5 shadow-xs"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : hasUnsavedChanges ? 'Salvar Alterações' : 'Salvo'}
            </Button>
          </div>
        )}
      </div>

      {/* Audit & Permissions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Última Atualização</div>
            <div className="text-xs font-semibold text-foreground truncate">
              {record?.updated
                ? new Date(record.updated).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Ainda não registrado'}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Atualizado por</div>
            <div className="text-xs font-semibold text-foreground truncate">
              {record?.expand?.updated_by?.name || (record ? 'Administrador' : 'Padrão do Sistema')}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Nível de Permissão</div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              {canEdit ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Edição Habilitada (Admin/Gestor)
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Modo Somente Leitura
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!canEdit && (
        <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-200">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300">
            Modo Somente Leitura
          </AlertTitle>
          <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
            Você está visualizando a Base de Conhecimento do escritório. Para alterar teses ou
            políticas de honorários, solicite permissão a um Administrador ou Gestor do tenant.
          </AlertDescription>
        </Alert>
      )}

      {/* Editor & Preview Workspace */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-border/70 bg-muted/20">
            <TabsList className="bg-muted/70 p-0.5 h-8">
              <TabsTrigger
                value="editor"
                className="text-xs h-7 gap-1.5 data-[state=active]:bg-background"
              >
                <Edit3 className="h-3.5 w-3.5" /> Editor
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="text-xs h-7 gap-1.5 data-[state=active]:bg-background"
              >
                <Eye className="h-3.5 w-3.5" /> Visualização Formatada
              </TabsTrigger>
            </TabsList>

            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>{content.length} caracteres</span>
              <span>•</span>
              <span>{content.split(/\s+/).filter(Boolean).length} palavras</span>
            </div>
          </div>

          {/* TAB EDITOR */}
          <TabsContent value="editor" className="p-5 m-0 focus-visible:outline-none">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Carregando base de conhecimento...
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={content}
                  readOnly={!canEdit}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva ou cole aqui as políticas de honorários, teses jurídicas, argumentos de vendas e procedimentos..."
                  className={`min-h-[500px] font-mono text-xs leading-relaxed resize-y ${
                    !canEdit ? 'bg-muted/30 cursor-not-allowed opacity-90' : 'bg-background'
                  }`}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      Suporta formatação Markdown (títulos com <code>#</code>, listas com{' '}
                      <code>-</code>, negrito com <code>**</code>).
                    </span>
                  </div>
                  {hasUnsavedChanges && canEdit && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      ● Há alterações não salvas
                    </span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB PREVIEW */}
          <TabsContent value="preview" className="p-6 m-0 focus-visible:outline-none min-h-[500px]">
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-4">
              <div className="bg-muted/30 p-5 rounded-xl border border-border/60 whitespace-pre-line font-sans text-xs text-foreground/90 leading-relaxed">
                {content || (
                  <span className="text-muted-foreground italic">
                    Nenhum conteúdo na base de conhecimento.
                  </span>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Practical Guide Tips */}
      <div className="bg-muted/30 border border-border/70 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-primary" /> Boas Práticas para Alimentar a IA
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1">
            <strong className="text-foreground block">Teses e Jurisprudências</strong>
            <p className="text-[11px] leading-relaxed">
              Inclua o número do tema (ex: Tema 69/STF), documentos fiscais necessários e perfil de
              empresa elegível.
            </p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1">
            <strong className="text-foreground block">Alçada de Honorários</strong>
            <p className="text-[11px] leading-relaxed">
              Defina faixas de preço de entrada, percentuais de êxito e quem tem autorização para
              conceder descontos.
            </p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-1">
            <strong className="text-foreground block">Scripts e Qualificação</strong>
            <p className="text-[11px] leading-relaxed">
              Oriente a IA sobre as perguntas-chave para descobrir se o lead possui real potencial
              de fechamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default KnowledgeBasePage
