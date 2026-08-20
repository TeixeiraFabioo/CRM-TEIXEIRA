import React from 'react'
import { Award, Trophy, Medal, Star, TrendingUp, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function RankingPage() {
  const rankingData = [
    {
      rank: 1,
      name: 'Dr. Fabio Santos',
      role: 'Sócio & Especialista Tributário',
      contratos: 18,
      valor: 450000,
      conversao: '34%',
    },
    {
      rank: 2,
      name: 'Dra. Amanda Teixeira',
      role: 'Sócia Contencioso Bancário',
      contratos: 14,
      valor: 310000,
      conversao: '29%',
    },
    {
      rank: 3,
      name: 'Dr. Bruno Nascimento',
      role: 'Consultor Trabalhista Patronal',
      contratos: 11,
      valor: 215000,
      conversao: '24%',
    },
    {
      rank: 4,
      name: 'Dra. Camila Ribeiro',
      role: 'Advogada Cível e Consumidor',
      contratos: 8,
      valor: 140000,
      conversao: '19%',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-legal-serif">
            Ranking Comercial &amp; Performance
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classificação e reconhecimento de advogados e consultores por fechamentos e conversão.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rankingData.slice(0, 3).map((item, idx) => (
          <div
            key={item.rank}
            className={`p-5 rounded-xl border flex flex-col items-center text-center relative overflow-hidden ${
              idx === 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-card border-border/80'
            }`}
          >
            {idx === 0 && (
              <div className="absolute top-2 right-2 text-amber-500">
                <Trophy className="h-6 w-6 animate-bounce" />
              </div>
            )}
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg mb-2 text-primary">
              #{item.rank}
            </div>
            <h3 className="font-bold text-sm">{item.name}</h3>
            <p className="text-[11px] text-muted-foreground">{item.role}</p>

            <div className="mt-4 w-full pt-3 border-t grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Contratos:</span>
                <span className="font-bold">{item.contratos}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Receita:</span>
                <span className="font-bold text-emerald-600">
                  R$ {item.valor.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b text-[11px]">
            <tr>
              <th className="p-3.5 pl-4">Posição</th>
              <th className="p-3.5">Advogado / Consultor</th>
              <th className="p-3.5">Contratos Fechados</th>
              <th className="p-3.5">Volume Total Gerado</th>
              <th className="p-3.5">Taxa de Conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rankingData.map((row) => (
              <tr key={row.rank} className="hover:bg-muted/30">
                <td className="p-3.5 pl-4 font-bold">#{row.rank}</td>
                <td className="p-3.5 font-semibold">{row.name}</td>
                <td className="p-3.5">{row.contratos}</td>
                <td className="p-3.5 font-bold">R$ {row.valor.toLocaleString('pt-BR')}</td>
                <td className="p-3.5">{row.conversao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default RankingPage
