import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Phone, Globe, MapPin, Users, Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { CrmService } from '@/services/crm'
import { EmpresaRecord, PessoaRecord } from '@/types/platform'
import { TimelineView } from '@/components/TimelineView'

export function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenant()
  const navigate = useNavigate()

  const [empresa, setEmpresa] = useState<EmpresaRecord | null>(null)
  const [pessoas, setPessoas] = useState<PessoaRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !tenant?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const [emps, allPessoas] = await Promise.all([
          CrmService.getEmpresas(tenant.id),
          CrmService.getPessoas(tenant.id),
        ])
        const found = emps.find((e) => e.id === id)
        setEmpresa(found || null)
        setPessoas(allPessoas.filter((p) => p.empresa_id === id))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, tenant?.id])

  if (loading) {
    return <div className="p-8 text-center">Carregando empresa...</div>
  }

  if (!empresa) {
    return (
      <div className="p-8 text-center">
        <h2>Empresa não encontrada</h2>
        <Button onClick={() => navigate('/empresas')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/empresas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-legal-serif">{empresa.razao_social}</h1>
            <p className="text-xs text-muted-foreground">
              {empresa.nome_fantasia || empresa.segmento} • CNPJ: {empresa.cnpj || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-5 space-y-3 text-xs">
          <h3 className="font-bold text-muted-foreground uppercase text-[11px]">
            Dados da Empresa
          </h3>
          <div>
            <span className="text-muted-foreground block">Porte &amp; Segmento:</span>
            <span className="font-semibold">
              {empresa.porte || 'Médio'} • {empresa.segmento || 'Geral'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Telefone:</span>
            <span className="font-semibold">{empresa.telefone || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Localização:</span>
            <span>
              {empresa.cidade || 'São Paulo'} - {empresa.estado || 'SP'}
            </span>
          </div>
          {empresa.site && (
            <div>
              <span className="text-muted-foreground block">Website:</span>
              <a
                href={empresa.site}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                {empresa.site}
              </a>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-bold text-sm mb-3">
              Sócios e Contatos Vinculados ({pessoas.length})
            </h3>
            {pessoas.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum contato vinculado ainda.</div>
            ) : (
              <div className="space-y-2">
                {pessoas.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold">{p.nome}</div>
                      <div className="text-muted-foreground">
                        {p.cargo} • {p.email || p.whatsapp}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/pessoas/${p.id}`)}>
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default EmpresaDetailPage
