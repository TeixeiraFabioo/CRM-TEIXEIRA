import React, { useState, useEffect } from 'react'
import { DollarSign, Plus, CheckCircle2, Clock, User, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { CommissionRecord } from '@/types/platform'

export function ComissoesPage() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<CommissionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      const list = await CrmService.getCommissions(tenant.id)
      setCommissions(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id])

  const totalCommissions = commissions.reduce((sum, c) => sum + (c.valor || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">Comissões &amp; Repasses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de comissionamento de advogados, consultores e equipes comerciais.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-xl text-right">
          <span className="text-[10px] text-primary block font-semibold uppercase">
            Total a Pagar/Pago
          </span>
          <span className="text-sm font-bold">R$ {totalCommissions.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
            <tr>
              <th className="p-3.5 pl-4">Advogado / Beneficiário</th>
              <th className="p-3.5">Tipo de Comissão</th>
              <th className="p-3.5">Percentual / Base</th>
              <th className="p-3.5">Valor do Repasse</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 pr-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Carregando comissões...
                </td>
              </tr>
            ) : commissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhuma comissão registrada.
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-3.5 pl-4 font-semibold text-foreground">
                    {c.expand?.usuario_id?.name || 'Advogado'}
                  </td>
                  <td className="p-3.5">{c.tipo}</td>
                  <td className="p-3.5">{c.percentual ? `${c.percentual}%` : 'Fixo'}</td>
                  <td className="p-3.5 font-bold">
                    R$ {Number(c.valor || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3.5">
                    <Badge variant="outline">{c.status}</Badge>
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await CrmService.updateCommission(c.id, {
                          status: c.status === 'paga' ? 'pendente' : 'paga',
                          data_pagamento:
                            c.status === 'paga' ? undefined : new Date().toISOString(),
                        })
                        toast({ title: 'Status da comissão atualizado!' })
                        loadData()
                      }}
                      className="h-7 text-xs"
                    >
                      {c.status === 'paga' ? 'Reabrir' : 'Pagar'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default ComissoesPage
