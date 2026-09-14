import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { parseDateOnly } from '@/lib/utils'
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

type StatBlock = { min: number | null; avg: number | null; max: number | null; median: number | null; amostras: number }

type CepStats = {
  rows: CepRow[]
  stats: Record<string, StatBlock>
  /** Estatísticas dos parâmetros fixos, indexadas pelo nome do parâmetro */
  paramStats: Record<string, StatBlock>
  /** Limiares de alerta da configuração produto+máquina, quando há uma só */
  limiares: { limiteDifRolo: number; limiteAmplitude: number; limiteCoefVar: number }
}

const fmt = (v: number | null, decimals = 2) => v !== null ? v.toFixed(decimals) : '—'

/** Destaca a leitura que passou do limiar configurado para aquele produto + máquina */
const alertAcima = (v: number | null, limite: number | null | undefined) => {
  if (v === null || limite === null || limite === undefined) return ''
  return v > limite ? 'text-red-600 font-semibold' : ''
}

export function CepTab() {
  const { t } = useLocale()
  const p = t.production
  const c = t.cep
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
  const paramStats = cep?.paramStats ?? {}
  const limiares = cep?.limiares ?? { limiteDifRolo: 0.5, limiteAmplitude: 1.0, limiteCoefVar: 10 }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{p.cepSubtitle}</p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{c.product}</Label>
          <Select value={productId || '__all__'} onValueChange={v => setProductId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={c.allM} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{c.allM}</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{c.machine}</Label>
          <Select value={machineId || '__all__'} onValueChange={v => setMachineId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={c.allF} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{c.allF}</SelectItem>
              {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{c.set}</Label>
          <Select value={punchSetId || '__all__'} onValueChange={v => setPunchSetId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={c.allM} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{c.allM}</SelectItem>
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
                    {key === 'difRoloCmpDir' ? c.difRoloDir :
                     key === 'difRoloCmpEsq' ? c.difRoloEsq :
                     key === 'ampRoloCompressao' ? c.ampCmp : c.ampDos}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-0.5">
                  <p className="text-xs"><span className="font-medium">{c.minShort}</span> {fmt(stats[key]?.min ?? null)}</p>
                  <p className="text-xs"><span className="font-medium">{c.avgShort}</span> {fmt(stats[key]?.avg ?? null)}</p>
                  <p className="text-xs"><span className="font-medium">{c.maxShort}</span> {fmt(stats[key]?.max ?? null)}</p>
                  <p className="text-xs"><span className="font-medium text-primary">{c.medShort}</span> {fmt(stats[key]?.median ?? null)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Estatísticas dos parâmetros fixos — a mediana daqui alimenta o sugerido */}
          {Object.keys(paramStats).length > 0 && (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">{c.fixedHistory}</p>
                <p className="text-xs text-muted-foreground">
                  {c.fixedHistoryHint}
                </p>
              </div>
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">{c.param}</th>
                      <th className="text-center px-3 py-2 font-medium">{c.min}</th>
                      <th className="text-center px-3 py-2 font-medium">{c.avg}</th>
                      <th className="text-center px-3 py-2 font-medium">{c.max}</th>
                      <th className="text-center px-3 py-2 font-medium text-primary">{c.median}</th>
                      <th className="text-right px-3 py-2 font-medium">{c.lots}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(paramStats)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([nome, s]) => (
                        <tr key={nome} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-1.5">{nome}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums">{fmt(s.min)}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums">{fmt(s.avg)}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums">{fmt(s.max)}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums font-semibold text-primary">{fmt(s.median)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{s.amostras}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela CEP */}
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">{c.lot}</th>
                  <th className="text-left px-3 py-2 font-medium">{c.date}</th>
                  <th className="text-center px-3 py-2 font-medium" colSpan={3}>{c.roloDirMm}</th>
                  <th className="text-center px-3 py-2 font-medium">{c.diff}</th>
                  <th className="text-center px-3 py-2 font-medium" colSpan={3}>{c.roloEsqMm}</th>
                  <th className="text-center px-3 py-2 font-medium">{c.diff}</th>
                  <th className="text-center px-3 py-2 font-medium">{c.ampCmpShort}</th>
                  <th className="text-center px-3 py-2 font-medium">{c.ampDosShort}</th>
                  <th className="text-center px-3 py-2 font-medium">CV L1</th>
                  <th className="text-center px-3 py-2 font-medium">CV L2</th>
                  <th className="text-left px-3 py-2 font-medium">{c.occurrences}</th>
                  <th className="text-right px-3 py-2 font-medium">KG</th>
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th colSpan={2}></th>
                  <th className="px-3 py-1 font-normal">{c.start}</th>
                  <th className="px-3 py-1 font-normal">{c.middle}</th>
                  <th className="px-3 py-1 font-normal">{c.end}</th>
                  <th></th>
                  <th className="px-3 py-1 font-normal">{c.start}</th>
                  <th className="px-3 py-1 font-normal">{c.middle}</th>
                  <th className="px-3 py-1 font-normal">{c.end}</th>
                  <th colSpan={6}></th>
                </tr>
              </thead>
              <tbody>
                {/* Stats rows */}
                {(['min', 'avg', 'max', 'median'] as const).map(stat => (
                  <tr key={stat} className={`border-b ${stat === 'median' ? 'bg-primary/5 font-semibold' : 'bg-muted/30'}`}>
                    <td className="px-3 py-1.5 font-medium text-muted-foreground" colSpan={2}>
                      {stat === 'min' ? c.rowMin : stat === 'avg' ? c.rowAvg : stat === 'max' ? c.rowMax : c.rowMedian}
                    </td>
                    {(['inicio', 'meio', 'fim'] as const).map(ponto => (
                      <td key={`dir-${ponto}`} className="px-3 py-1.5 text-center tabular-nums">
                        {fmt(stats[`roloCmpDir.${ponto}`]?.[stat] ?? null)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.difRoloCmpDir?.[stat] ?? null)}</td>
                    {(['inicio', 'meio', 'fim'] as const).map(ponto => (
                      <td key={`esq-${ponto}`} className="px-3 py-1.5 text-center tabular-nums">
                        {fmt(stats[`roloCmpEsq.${ponto}`]?.[stat] ?? null)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.difRoloCmpEsq?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.ampRoloCompressao?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.ampRoloDosagem?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.coefVarL1?.[stat] ?? null)}</td>
                    <td className="px-3 py-1.5 text-center tabular-nums">{fmt(stats.coefVarL2?.[stat] ?? null)}</td>
                    <td colSpan={2}></td>
                  </tr>
                ))}
                {/* Data rows */}
                {cep.rows.map(row => (
                  <tr key={row.batchId} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono font-semibold">{row.loteNumero}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{format(parseDateOnly(row.dataProducao), 'dd/MM/yy')}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.inicio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.meio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpDir.fim)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.difRoloCmpDir, limiares.limiteDifRolo)}`}>{fmt(row.difRoloCmpDir)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.inicio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.meio)}</td>
                    <td className="px-3 py-1.5 text-center">{fmt(row.roloCmpEsq.fim)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.difRoloCmpEsq, limiares.limiteDifRolo)}`}>{fmt(row.difRoloCmpEsq)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.ampRoloCompressao, limiares.limiteAmplitude)}`}>{fmt(row.ampRoloCompressao)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.ampRoloDosagem, limiares.limiteAmplitude)}`}>{fmt(row.ampRoloDosagem)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.coefVarL1, limiares.limiteCoefVar)}`}>{fmt(row.coefVarL1)}</td>
                    <td className={`px-3 py-1.5 text-center ${alertAcima(row.coefVarL2, limiares.limiteCoefVar)}`}>{fmt(row.coefVarL2)}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {row.occurrences.map(o => (
                          <Badge key={o} variant="destructive" className="text-xs px-1 py-0">{p[o as keyof typeof p] ?? o}</Badge>
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
