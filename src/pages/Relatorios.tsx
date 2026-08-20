import React, { useState } from 'react'
import {
  FileSpreadsheet,
  Download,
  Filter,
  BarChart,
  Calendar,
  Users,
  Target,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function RelatoriosPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState('vendas')

  const reports = [
    {
      id: 'vendas',
      name: 'Relatório Geral de Vendas & Contratos Fechados',
      desc: 'Consolidado de contratos, valores, clientes e advogados responsáveis.',
    },
    {
      id: 'leads',
      name: 'Relatório de Aquisição & Origens de Leads',
      desc: 'Volume de leads por Meta Ads, Google Ads, Indicação e Taxas de Conversão.',
    },
    {
      id: 'perdas',
      name: 'Relatório de Motivos de Perda & Objeções',
      desc: 'Mapeamento de desqualificação e recusas de propostas.',
    },
    {
      id: 'sla',
      name: 'Relatório de SLA & Tempo de Primeiro Contato',
      desc: 'Tempo de resposta da equipe comercial aos novos leads.',
    },
  ]

  const handleExport = async (repId: string) => {
    toast({
      title: 'Exportando relatório...',
      description: 'O download do CSV iniciará em instantes.',
    })
    if (tenant?.id) {
      await CrmService.logAudit(tenant.id, 'export_report', 'reports', undefined, null, {
        report: repId,
      })
    }
    const csvContent =
      'data:text/csv;charset=utf-8,ID;Data;Item;Valor;Status;Responsavel\n1;2026-08-01;Assessoria Tributaria;25000;Ganho;Dr. Fabio\n2;2026-08-02;Defesa Bancaria;12000;Ganho;Dra. Amanda\n'
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_${repId}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">
            Relatórios Executivos &amp; Exportações
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geração de relatórios com filtros avançados e exportação para CSV/Excel com trilha de
            auditoria.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-sm">{rep.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{rep.desc}</p>
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Formato: CSV / Excel</span>
              <Button
                size="sm"
                onClick={() => handleExport(rep.id)}
                className="h-8 gap-1.5 text-xs bg-[#0A1F3F] text-white"
              >
                <Download className="h-3.5 w-3.5" /> Exportar Relatório
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default RelatoriosPage
