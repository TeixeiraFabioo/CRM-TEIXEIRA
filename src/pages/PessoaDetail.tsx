import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, Building2, Calendar, Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { PessoaRecord, OpportunityRecord } from '@/types/platform'
import { TimelineView } from '@/components/TimelineView'

export function PessoaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenant()
  const navigate = useNavigate()

  const [pessoa, setPessoa] = useState<PessoaRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !tenant?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const pessoas = await CrmService.getPessoas(tenant.id)
        const found = pessoas.find((p) => p.id === id)
        setPessoa(found || null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, tenant?.id])

  if (loading) {
    return <div className="p-8 text-center">Carregando contato...</div>
  }

  if (!pessoa) {
    return (
      <div className="p-8 text-center">
        <h2>Pessoa não encontrada</h2>
        <Button onClick={() => navigate('/pessoas')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/pessoas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-legal-serif">{pessoa.nome}</h1>
            <p className="text-xs text-muted-foreground">
              {pessoa.cargo || 'Contato Jurídico'} •{' '}
              {pessoa.expand?.empresa_id?.razao_social || 'Autônomo'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-5 space-y-3 text-xs">
          <h3 className="font-bold text-muted-foreground uppercase text-[11px]">
            Informações de Contato
          </h3>
          <div>
            <span className="text-muted-foreground block">Telefone/WhatsApp:</span>
            <span className="font-semibold">{pessoa.whatsapp || pessoa.telefone || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">E-mail:</span>
            <span className="font-semibold">{pessoa.email || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">CPF:</span>
            <span className="font-mono">{pessoa.cpf || '—'}</span>
          </div>
        </div>

        <div className="md:col-span-2 bg-card border rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4">Linha do Tempo e Relacionamento</h3>
          <TimelineView
            items={[
              {
                id: '1',
                type: 'creation',
                title: 'Contato Cadastrado',
                description: `Vinculado como ${pessoa.cargo || 'Decisor'}.`,
                date: pessoa.created || '',
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
export default PessoaDetailPage
