import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Product, Machine, PunchSet } from '@/types'
import { format } from 'date-fns'

type CepRow = {
  batchId: string
  loteNumero: string
  dataProducao: string
  product: string
  machine: string
  punchSet: string
  kgProduzidos: number | null
  roloCmpDir: { inicio: number | null; meio: number | null; fim: number | null }
  roloCmpEsq: { inicio: number | null; meio: number | null; fim: number | null }
  difRoloCmpDir: number | null
  difRoloCmpEsq: number | null
  ampRoloCompressao: number | null
  ampRoloDosagem: number | null
  coefVarL1: number | null
  coefVarL2: number | null
  occurrences: string[]
}

type CepStats = {
  rows: CepRow[]
  stats: Record<string, { min: number | null; avg: number | null; max: number | null; median: number | null }>
}

const fmt = (v: number | null, decimals = 2) => v !== null ? v.toFixed(decimals) : '—'

const alert = (v: number | null, min: number | null, max: number | null) => {
  if (v === null || min === null || max === null) return ''
  if (v < min || v > max) return 'text-red-600 font-semibold'
  return ''
}

export function CepTab() {
  const { t } = useLocale()
  const p = t.production
  const { companyId: adminCompanyId } = useAdminCompany()
  const [productId, setProductId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [punchSetId, setPunchSetId] = useState('')

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', adminCompanyId],
    queryFn: () => api.get('/products', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines', adminCompanyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })
  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })

  const { data: cep, isLoading } = useQuery<CepStats>({
    queryKey: ['cep', adminCompanyId, productId, machineId, punchSetId],
    queryFn: () => api.get('/production-batches/cep', {
      params: { companyId: adminCompanyId, productId: productId || undefined, machineId: machineId || undefined, punchSetId: punchSetId || undefined },
    }).then(r => r.data),
  })

  const stats = cep?.stats ?? {}

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{p.cepSubtitle}</p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Produto</Label>
          <Select value={productId || '__all__'} onValueChange={v => setProductId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Máquina</Label>
          <Select value={machineId || '__all__'} onValueChange={v => setMachineId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Conjunto de Punções</Label>
          <Select value={punchSetId || '__all__'} onValueChange={v => setPunchSetId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {sets.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.common.loading}</p>
      ) : !cep || cep.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{p.noCepData}</p>
      ) : (
        <>
          {/* Estatísticas resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['difRoloCmpDir', 'difRoloCmpEsq', 'ampRoloCompressao', 'ampRoloDosagem'] as const).map(key => (
              <Card key={key}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground">
                    {key === 'difRoloCmpDir' ? 'Dif. Rolo Cmp. Dir.' :
                     key === 'difRoloCmpEsq' ? 'Dif. Rolo Cmp. Esq.' :
                     key === 'ampRoloCompressao' ? 'Amp. Compressão' : 'Amp. Dosagem'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-0.5">
                  <p className="text-xs"><span className="font-medium">MÍN:</span> {fmt(stats[key]?.min ?? null)}</p>
                  <p className="text-xs"><span className="font-medium">MÉD:</span> {fmt(stats[key]?.avg ?? null)}</p>
                  <p className="text-xs"><span className="font-medium">MÁX:</span> {fmt(stats[key]?.max ?? null)}</p>
                  <p className="text-xs"><span className="font-medium text-primary">MED:</span> {fmt(stats[key]?.median ?? null)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela CEP */}
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Lote</th>
                  <th className="text-left px-3 py-2 font-medium">Data</th>
                  <th className="text-center px-3 py-2 font-medium" colSpan={3}>Rolo Cmp. Dir. (mm)</th>
                  <th className="text-center px-3 py-2 font-medium">Dif.</th>
                  <th className="text-center px-3 py-2 font-medium" colSpan={3}>Rolo Cmp. Esq. (mm)</th>
                  <th className="text-center px-3 py-2 font-medium">Dif.</th>
                  <th className="text-center px-3 py-2 font-medium">Amp. Cmp.</th>
                  <th className="text-center px-3 py-2 font-medium">Amp. Dos.</th>
                  <th className="text-center px-3 py-2 font-medium">CV L1</th>
                  <th className="text-center px-3 py-2 font-medium">CV L2</th>
                  <th className="text-left px-3 py-2 font-medium">Ocorrências</th>
                  <th className="text-right px-3 py-2 font-medium">KG</th>
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th colSpan={2}></th>
                  <th className="px-3 py-1 font-normal">Ini.</th>
                  <th className="px-3 py-1 font-normal">Mei.</th>
                  <th className="px-3 py-1 font-normal">Fim</th>
                  <th></th>
                  <th className="px-3 py-1 font-normal">Ini.</th>
                  <th className="px-3 py-1 font-normal">Mei.</th>
                  <th className="px-3 py-1 font-normal">Fim</th>
                  <th colSpan={6}></th>
                </tr>
              </thead>
              <tbody>
                {/* Stats rows */}
                {(['min', 'avg', 'max', 'median'] as const).map(stat => (
                  <tr key={stat} className={`border-b ${stat === 'median' ? 'bg-primary/5 font-semibold' : 'bg-muted/30'}`}>
                    <td className="px-3 py-1.5 font-medium text-muted-foreground" colSpan={2}>
                      {stat === 'min' ? 'MÍNIMO' : stat === 'avg' ? 'MÉDIA' : stat === 'max' ? 'MÁXIMO' : 'MEDIANA'}
                    </td>
                    <td className="px-3 py-1.5 text-center" colSpan={3}>—</td>
                    <td className="px-3 py-1.5 text-center">{fmt(stats.difRoloCmpDir?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center" colSpan={3}>—</td>
                    <td className="px-3 py-1.5 text-center">{fmt(stats.difRoloCmpEsq?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(stats.ampRoloCompressao?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(stats.ampRoloDosagem?.[stat] ?? null)}</td>
                    <td colSpan={4}></td>
                  </tr>
                ))}
                {/* Data rows */}
                {cep.rows.map(row => (
                  <tr key={row.batchId} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono font-semibold">{row.loteNumero}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{format(new Date(row.dataProducao), 'dd/MM/yy')}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.inicio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.meio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.fim)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.difRoloCmpDir, null, 0.5)}`}>{fmt(row.difRoloCmpDir)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.inicio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.meio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.fim)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.difRoloCmpEsq, null, 0.5)}`}>{fmt(row.difRoloCmpEsq)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.ampRoloCompressao, null, 1.0)}`}>{fmt(row.ampRoloCompressao)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.ampRoloDosagem, null, 1.0)}`}>{fmt(row.ampRoloDosagem)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.coefVarL1, null, 10)}`}>{fmt(row.coefVarL1)}</td>
                    <td className={`px-3 py-1.5 text-center ${alert(row.coefVarL2, null, 10)}`}>{fmt(row.coefVarL2)}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {row.occurrences.map(o => (
                          <Badge key={o} variant="destructive" className="text-xs px-1 py-0">{o}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{row.kgProduzidos ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
