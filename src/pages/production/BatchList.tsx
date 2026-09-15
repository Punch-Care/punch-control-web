import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { cn, matchesSearch, parseDateOnly } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { BatchActionsMenu } from './BatchActionsMenu'
import type { ProductionBatch } from '@/types'

type Filtro = 'andamento' | 'concluidos' | 'todos'

/**
 * Lotes separados pelo que importa no dia: os em andamento em cartões com a
 * ação do momento; os concluídos numa tabela limpa, com as demais ações no "⋯".
 */
export function BatchList({ batches }: { batches: ProductionBatch[] }) {
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const b = t.batchPage
  const o = t.operator

  const andamento = batches.filter(x => x.status !== 'COMPLETED')
  const concluidos = batches.filter(x => x.status === 'COMPLETED')
  const [filtro, setFiltro] = useState<Filtro>(andamento.length > 0 ? 'andamento' : 'concluidos')
  const [busca, setBusca] = useState('')

  const filtrar = (lista: ProductionBatch[]) =>
    lista.filter(x => matchesSearch(busca, [x.loteNumero, x.product.name, x.machine.name, x.punchSet.code, x.punchSet.name]))
  const data = (x: ProductionBatch) => format(parseDateOnly(x.dataProducao), 'dd/MM/yyyy')

  const opcoes: { id: Filtro; label: string; n: number }[] = [
    { id: 'andamento', label: b.inProgressTab, n: andamento.length },
    { id: 'concluidos', label: b.completedTab, n: concluidos.length },
    { id: 'todos', label: b.allTab, n: batches.length },
  ]

  const cartoes = filtro !== 'concluidos' ? filtrar(andamento) : []
  const tabela = filtro !== 'andamento' ? filtrar(concluidos) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div role="tablist" className="inline-flex rounded-lg border bg-background p-1 self-start">
          {opcoes.map(op => (
            <button key={op.id} role="tab" aria-selected={filtro === op.id} type="button" onClick={() => setFiltro(op.id)}
              className={cn('px-3 h-9 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors',
                filtro === op.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {op.label}
              <span className={cn('text-xs rounded-full px-1.5 tabular-nums', filtro === op.id ? 'bg-white/20' : 'bg-muted')}>{op.n}</span>
            </button>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-72">
          <SearchInput value={busca} onChange={setBusca} placeholder={t.search.batches} />
        </div>
      </div>

      {/* Em andamento: cartões com a próxima ação */}
      {filtro !== 'concluidos' && (
        cartoes.length === 0 ? (
          filtro === 'andamento' && <p className="rounded-xl border border-dashed bg-background px-5 py-8 text-center text-sm text-muted-foreground">{busca ? t.search.noResults : b.emptyInProgress}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {cartoes.map(x => (
              <article key={x.id} className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
                <button type="button" onClick={() => navigate(`/production/${x.id}`)} className="text-left px-4 pt-4 pb-3 hover:bg-muted/30 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-primary">{x.loteNumero}</span>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.startedAt(data(x), x.horaInicio)}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate">{x.product.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{x.machine.name} · {o.setShort(x.punchSet.code)}</p>
                  <p className="text-xs text-muted-foreground mt-2">{b.measurementsCount(x._count?.hourlyMeasurements ?? 0)}</p>
                </button>
                <div className="flex gap-2 px-4 pb-4">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/operador/lote/${x.id}/medicao`)}>{b.recordMeasurement}</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/operador/lote/${x.id}/encerrar/kg`)}>{b.finish}</Button>
                  <BatchActionsMenu batch={x} />
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {/* Concluídos: tabela enxuta, linha inteira abre o lote */}
      {filtro !== 'andamento' && (
        <div className="space-y-2">
          {filtro === 'todos' && cartoes.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground pt-2">{b.completedTab}</h3>}
          {tabela.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-background px-5 py-8 text-center text-sm text-muted-foreground">{busca ? t.search.noResults : b.emptyCompleted}</p>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">{b.colLot}</th>
                    <th className="text-left font-medium px-3 py-2.5">{b.colDate}</th>
                    <th className="text-left font-medium px-3 py-2.5">{b.colProduct}</th>
                    <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">{b.colMachine}</th>
                    <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">{b.colSet}</th>
                    <th className="text-right font-medium px-3 py-2.5">{b.colKg}</th>
                    <th className="text-center font-medium px-3 py-2.5 hidden sm:table-cell">{b.colProblems}</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tabela.map(x => {
                    const probs = x._count?.batchOccurrences ?? 0
                    return (
                      <tr key={x.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/production/${x.id}`)}>
                        <td className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">
                          {x.loteNumero}
                          {probs > 0 && <AlertTriangle className="inline h-3.5 w-3.5 ml-1.5 text-red-600 sm:hidden" aria-label={b.colProblems} />}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{data(x)}</td>
                        <td className="px-3 py-3 max-w-[14rem] truncate">{x.product.name}</td>
                        <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">{x.machine.name}</td>
                        <td className="px-3 py-3 hidden lg:table-cell font-mono text-xs text-muted-foreground max-w-[10rem] truncate">{x.punchSet.code}</td>
                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{x.kgProduzidos != null ? x.kgProduzidos.toLocaleString(locale) : '—'}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {probs > 0
                            ? <span className="inline-flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="h-3.5 w-3.5" />{probs}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end">
                            <BatchActionsMenu batch={x} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
