import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OccurrenceType = 'CAPPING' | 'STICKING' | 'TRAVAMENTO' | 'QUEBRA' | 'OXIDACAO' | 'OUTROS'

interface YearData {
  year: number
  CAPPING: number
  STICKING: number
  TRAVAMENTO: number
  QUEBRA: number
  OXIDACAO: number
  OUTROS: number
  total: number
}

interface ProductData {
  produto: string
  anos: YearData[]
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
        <p className="text-xs text-muted-foreground">Por produto e ano, com totalização e média mensal</p>
      </div>

      {data.map(({ produto, anos }) => {
        const allYears = anos.sort((a, b) => a.year - b.year)
        const totalGeral = allYears.reduce((s, a) => s + a.total, 0)

        return (
          <Card key={produto} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{produto}</CardTitle>
              <p className="text-xs text-muted-foreground">{allYears.length} ano(s) · {totalGeral} ocorrência(s) total</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
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
                        <td className="px-3 py-2 font-semibold">{a.year}</td>
                        {OCC_TYPES.map(t => (
                          <td key={t} className={`text-center px-2 py-2 ${a[t] > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                            {a[t] > 0 ? a[t] : '—'}
                          </td>
                        ))}
                        <td className="text-center px-2 py-2 font-bold">{a.total}</td>
                      </tr>
                    ))}
                    {/* Linha de totais */}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-3 py-2">TOTAL</td>
                      {OCC_TYPES.map(t => {
                        const sum = allYears.reduce((s, a) => s + (a[t] ?? 0), 0)
                        return <td key={t} className="text-center px-2 py-2">{sum > 0 ? sum : '—'}</td>
                      })}
                      <td className="text-center px-2 py-2">{totalGeral}</td>
                    </tr>
                    {/* Média mensal (total / anos) */}
                    {allYears.length > 0 && (
                      <tr className="text-muted-foreground italic">
                        <td className="px-3 py-1 text-[10px]">Média/ano</td>
                        {OCC_TYPES.map(t => {
                          const sum = allYears.reduce((s, a) => s + (a[t] ?? 0), 0)
                          const avg = allYears.length > 0 ? (sum / allYears.length).toFixed(1) : '—'
                          return <td key={t} className="text-center px-2 py-1 text-[10px]">{parseFloat(avg) > 0 ? avg : '—'}</td>
                        })}
                        <td className="text-center px-2 py-1 text-[10px]">{(totalGeral / allYears.length).toFixed(1)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
