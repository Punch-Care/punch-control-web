import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OccurrenceType = 'CAPPING' | 'STICKING' | 'TRAVAMENTO' | 'QUEBRA' | 'OXIDACAO' | 'OUTROS'

type CountsByType = Record<OccurrenceType, number>

interface YearData extends CountsByType {
  year: number
  total: number
  /** Meses de exposição do ano — 12 nos anos fechados, os decorridos no ano atual */
  meses: number
  taxaMensal: CountsByType
  taxaMensalTotal: number
}

interface ProductData {
  produto: string
  produtoId: string
  produtoCodigo: string | null
  anos: YearData[]
  /** Mediana das taxas mensais entre os anos — a linha de base da planilha */
  baseline: Record<OccurrenceType, number | null>
  baselineTotal: number | null
}

const OCC_TYPES: OccurrenceType[] = ['CAPPING', 'STICKING', 'TRAVAMENTO', 'QUEBRA', 'OXIDACAO', 'OUTROS']
const OCC_LABELS: Record<OccurrenceType, string> = {
  CAPPING: 'Capping',
  STICKING: 'Sticking',
  TRAVAMENTO: 'Travamento',
  QUEBRA: 'Quebra',
  OXIDACAO: 'Oxidação',
  OUTROS: 'Outros',
}

export function OccurrencesAnalytics() {
  const { companyId: adminCompanyId } = useAdminCompany()

  const { data = [], isLoading } = useQuery<ProductData[]>({
    queryKey: ['occurrences-analytics', adminCompanyId],
    queryFn: () => api.get('/stats/occurrences-analytics', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>

  if (data.length === 0) return (
    <div className="text-center py-12">
      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Nenhum dado de ocorrências registrado</p>
      <p className="text-xs text-muted-foreground mt-1">Os dados aparecem após registrar lotes de produção com ocorrências</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Análise Histórica de Ocorrências</h3>
        <p className="text-xs text-muted-foreground">
          Por produto e ano. A comparação entre anos usa a taxa mensal — o total dividido pelos meses de
          produção — para que o ano em curso não pareça melhor só por estar incompleto.
        </p>
      </div>

      {data.map(({ produto, produtoId, produtoCodigo, anos, baseline, baselineTotal }) => {
        const allYears = [...anos].sort((a, b) => a.year - b.year)
        const totalGeral = allYears.reduce((s, a) => s + a.total, 0)

        return (
          <Card key={produtoId} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {produto}
                {produtoCodigo && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{produtoCodigo}</span>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{allYears.length} ano(s) · {totalGeral} ocorrência(s) total</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contagem absoluta por ano */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2 font-medium">Ano</th>
                      <th className="text-center px-2 py-2 font-medium">Meses</th>
                      {OCC_TYPES.map(t => (
                        <th key={t} className="text-center px-2 py-2 font-medium">{OCC_LABELS[t]}</th>
                      ))}
                      <th className="text-center px-2 py-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allYears.map(a => (
                      <tr key={a.year} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 font-semibold tabular-nums">{a.year}</td>
                        <td className="text-center px-2 py-2 tabular-nums text-muted-foreground">{a.meses}</td>
                        {OCC_TYPES.map(t => (
                          <td key={t} className={`text-center px-2 py-2 tabular-nums ${a[t] > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                            {a[t] > 0 ? a[t] : '—'}
                          </td>
                        ))}
                        <td className="text-center px-2 py-2 font-bold tabular-nums">{a.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                      {OCC_TYPES.map(t => {
                        const sum = allYears.reduce((s, a) => s + a[t], 0)
                        return <td key={t} className="text-center px-2 py-2 tabular-nums">{sum > 0 ? sum : '—'}</td>
                      })}
                      <td className="text-center px-2 py-2 tabular-nums">{totalGeral}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Taxa mensal e linha de base — o comparativo da planilha */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Taxa mensal por ano
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium">Ano</th>
                        {OCC_TYPES.map(t => (
                          <th key={t} className="text-center px-2 py-2 font-medium">{OCC_LABELS[t]}</th>
                        ))}
                        <th className="text-center px-2 py-2 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allYears.map(a => (
                        <tr key={a.year} className="border-b hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-semibold tabular-nums">{a.year}</td>
                          {OCC_TYPES.map(t => {
                            const base = baseline[t]
                            const acima = base !== null && a.taxaMensal[t] > base
                            return (
                              <td
                                key={t}
                                className={`text-center px-2 py-1.5 tabular-nums ${acima ? 'text-red-600 font-semibold' : a.taxaMensal[t] > 0 ? '' : 'text-muted-foreground'}`}
                              >
                                {a.taxaMensal[t] > 0 ? a.taxaMensal[t].toFixed(1) : '—'}
                              </td>
                            )
                          })}
                          <td className="text-center px-2 py-1.5 font-semibold tabular-nums">{a.taxaMensalTotal.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="bg-primary/5 font-semibold border-t">
                        <td className="px-3 py-1.5">MEDIANA</td>
                        {OCC_TYPES.map(t => (
                          <td key={t} className="text-center px-2 py-1.5 tabular-nums">
                            {baseline[t] !== null ? baseline[t]!.toFixed(1) : '—'}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1.5 tabular-nums">
                          {baselineTotal !== null ? baselineTotal.toFixed(1) : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Em vermelho, os anos acima da mediana histórica daquele tipo de ocorrência.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
