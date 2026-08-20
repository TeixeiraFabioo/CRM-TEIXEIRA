import React, { useState, useEffect } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Share2,
  MessageSquare,
  Search,
  FileCheck,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'

export function IntegrationsPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const integrations = [
    {
      id: 'meta_ads',
      name: 'Meta Ads & Conversions API (CAPI)',
      desc: 'Sincronização de leads do Instagram e Facebook Ads + disparo automático do evento Purchase na conversão de contratos.',
      icon: Share2,
      status: 'connected',
      details: `Pixel Ativo: ${tenant?.meta_pixel_id || '948271038592014'}`,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API & Chatbot',
      desc: 'Distribuição automática de leads e disparo de templates de primeiro contato em até 15 minutos.',
      icon: MessageSquare,
      status: 'connected',
      details: 'Número: +55 (11) 98765-4321',
    },
    {
      id: 'google_ads',
      name: 'Google Ads & Enhanced Conversions',
      desc: 'Rastreamento de conversões offline de pesquisas jurídicas fundo de funil.',
      icon: Search,
      status: 'connected',
      details: 'Conta: 842-109-3820',
    },
    {
      id: 'zapsign',
      name: 'ZapSign Assinaturas Eletrônicas',
      desc: 'Disparo de contratos de honorários com assinatura válida pela MP 2.200-2/2001 e webhook de confirmação.',
      icon: FileCheck,
      status: 'connected',
      details: 'Token configurado • Webhook Ativo',
    },
    {
      id: 'calendly',
      name: 'Calendly & Google Meet',
      desc: 'Agendamento de reuniões com clientes e sincronização instantânea na aba Tarefas do Lead.',
      icon: Calendar,
      status: 'connected',
      details: 'Sincronizado com agenda dos sócios',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-legal-serif">Central de Integrações Jurídicas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conectores ativos com tráfego, plataformas de assinatura digital, mensageria e CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                </div>

                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-3 border-t flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">{item.details}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({ title: 'Integração sincronizada com sucesso!' })}
                  className="h-7 text-xs"
                >
                  Sincronizar
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default IntegrationsPage
