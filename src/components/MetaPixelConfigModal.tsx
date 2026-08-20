import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, ShieldCheck, Sparkles, ExternalLink, HelpCircle } from 'lucide-react'

interface MetaPixelConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MetaPixelConfigModal: React.FC<MetaPixelConfigModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { tenant, pixelId, updatePixelId } = useTenant()
  const { toast } = useToast()

  const [inputPixelId, setInputPixelId] = useState<string>(pixelId || '')
  const [autoSync, setAutoSync] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state with prop/context when opening
  React.useEffect(() => {
    if (open) {
      setInputPixelId(pixelId || '')
    }
  }, [open, pixelId])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)

    try {
      await updatePixelId(inputPixelId.trim())
      toast({
        title: 'Meta Pixel salvo com sucesso!',
        description: inputPixelId.trim()
          ? `O Pixel ID (${inputPixelId.trim()}) foi configurado e injetado para o tenant ${tenant?.name}.`
          : 'O Pixel ID foi removido.',
      })
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o Pixel ID.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg">Configurar Meta Pixel (Meta Ads)</DialogTitle>
              <DialogDescription className="text-xs">
                Tenant: <strong className="text-foreground">{tenant?.name}</strong> • Gestão de
                Rastreamento
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pixel-id-input" className="text-sm font-medium">
                ID do Meta Pixel (Dataset ID)
              </Label>
              <a
                href="https://business.facebook.com/events_manager2"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Gerenciador de Eventos Meta <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <Input
              id="pixel-id-input"
              placeholder="Ex: 98127391823 ou 123456789012345"
              value={inputPixelId}
              onChange={(e) => setInputPixelId(e.target.value)}
              className="font-mono text-sm"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3 shrink-0" />
              Encontre seu identificador numérico de 15 a 16 dígitos na aba &ldquo;Fontes de
              Dados&rdquo; da Meta.
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Sincronizar Eventos de Funil CRM</Label>
                <p className="text-[11px] text-muted-foreground">
                  Disparar automaticamente eventos <code>Lead</code>, <code>Contact</code> e{' '}
                  <code>Purchase</code> nas alterações de negócios.
                </p>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                Conforme com LGPD &amp; Marco Civil da Internet (respeita consentimento do
                visitante).
              </span>
            </div>
          </div>

          {inputPixelId && (
            <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Ao salvar, o script oficial{' '}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                  fbq(&apos;init&apos;, &apos;{inputPixelId}&apos;)
                </code>{' '}
                será injetado no <strong>&lt;head&gt;</strong> de todas as páginas.
              </span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Injetar Pixel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
