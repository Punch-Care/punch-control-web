import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertTriangle, CheckCircle2, FlaskConical, Package, RefreshCw, Ruler, Sparkles, Tag, Wrench,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'
import type { ComponentInventoryType, JogoStatus, OccurrenceType, SetStatus } from '@/types'

type HistoryItem = {
  kind: 'STATUS' | 'CLEANING' | 'MAINTENANCE' | 'MEASUREMENT' | 'OCCURRENCE_OPENED' | 'OCCURRENCE_CLOSED'
    | 'BATCH_STARTED' | 'BATCH_COMPLETED' | 'PRODUCTION_MANUAL'
  at: string
  userName: string | null
  from?: string | null
  to?: string
  reason?: string | null
  acao?: string
  componente?: ComponentInventoryType
  quantidade?: number
  notas?: string | null
  total?: number
  outOfRange?: number
  type?: OccurrenceType
  description?: string
  resolution?: string | null
  batchId?: string
  loteNumero?: string
  kg?: number | null
}

type Filtro = 'all' | 'production' | 'care' | 'quality' | 'status'
const GRUPO: Record<HistoryItem['kind'], Exclude<Filtro, 'all'>> = {
  STATUS: 'status', CLEANING: 'care', MAINTENANCE: 'care', MEASUREMENT: 'quality',
  OCCURRENCE_OPENED: 'quality', OCCURRENCE_CLOSED: 'quality',
  BATCH_STARTED: 'production', BATCH_COMPLETED: 'production', PRODUCTION_MANUAL: 'production',
}

/** Linha do tempo do jogo com tudo que os módulos registraram — rastreabilidade para auditoria */
export function SetHistory({ setId }: { setId: string }) {
  const { t, locale } = useLocale()
  const h = t.setHistory
  const [filtro, setFiltro] = useState<Filtro>('all')

  const { data: itens = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ['set-history', setId],
    queryFn: () => api.get(`/punch-sets/${setId}/history`).then(r => r.data),
  })

  const kg = (v: number | null | undefined) => (v ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })
  const setStatus = (s?: string | null) => (s ? t.status[s as SetStatus] ?? s : '—')
  const jogoStatus = (s?: string | null) => (s ? t.jogo.statuses[s as JogoStatus] ?? s : '—')

  const descrever = (i: HistoryItem): { icon: typeof Tag; tone: string; text: string; detail?: string | null; link?: string } => {
    switch (i.kind) {
      case 'STATUS':
        return i.from
          ? { icon: RefreshCw, tone: 'bg-slate-100 text-slate-700', text: h.statusChanged(setStatus(i.from), setStatus(i.to)), detail: i.reason }
          : { icon: Tag, tone: 'bg-slate-100 text-slate-700', text: h.created }
      case 'CLEANING': {
        const rotulo = i.acao && i.acao in h.cleaning ? h.cleaning[i.acao as keyof typeof h.cleaning] : h.conditionChanged(jogoStatus(i.to))
        return { icon: Sparkles, tone: 'bg-sky-50 text-sky-700', text: rotulo }
      }
      case 'MAINTENANCE': {
        const peca = i.componente ? t.componentTypes[i.componente] : ''
        const n = Math.abs(i.quantidade ?? 0)
        return { icon: Wrench, tone: 'bg-amber-50 text-amber-700', text: (i.quantidade ?? 0) >= 0 ? h.partsIn(n, peca) : h.partsOut(n, peca), detail: i.notas }
      }
      case 'MEASUREMENT':
        return {
          icon: Ruler, tone: i.outOfRange ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700',
          text: h.measured(i.total ?? 0, i.outOfRange ?? 0), link: `/dimensioning?setId=${setId}`,
        }
      case 'OCCURRENCE_OPENED':
        return { icon: AlertTriangle, tone: 'bg-red-50 text-red-600', text: h.problemOpened(i.type ? t.occurrenceType[i.type] : ''), detail: i.description, link: '/occurrences' }
      case 'OCCURRENCE_CLOSED':
        return { icon: CheckCircle2, tone: 'bg-green-50 text-green-700', text: h.problemClosed(i.type ? t.occurrenceType[i.type] : ''), detail: i.resolution, link: '/occurrences' }
      case 'BATCH_STARTED':
        return { icon: FlaskConical, tone: 'bg-primary/10 text-primary', text: h.batchStarted(i.loteNumero ?? ''), link: `/production/${i.batchId}` }
      case 'BATCH_COMPLETED':
        return { icon: CheckCircle2, tone: 'bg-primary/10 text-primary', text: h.batchCompleted(i.loteNumero ?? '', kg(i.kg)), link: `/production/${i.batchId}` }
      case 'PRODUCTION_MANUAL':
        return { icon: Package, tone: 'bg-primary/10 text-primary', text: h.productionManual(i.loteNumero ?? '', kg(i.kg)), link: `/lifecycle?setId=${setId}` }
    }
  }

  const visiveis = itens.filter(i => filtro === 'all' || GRUPO[i.kind] === filtro)
  const contagem = (f: Filtro) => (f === 'all' ? itens.length : itens.filter(i => GRUPO[i.kind] === f).length)

  return (
    <section className="rounded-xl border bg-background overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b space-y-3">
        <div>
          <h3 className="font-semibold text-base">{h.title}</h3>
          <p className="text-sm text-muted-foreground">{h.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'production', 'care', 'quality', 'status'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFiltro(f)}
              className={cn('text-xs px-3 h-8 rounded-full border inline-flex items-center gap-1.5 transition-colors',
                filtro === f ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground')}>
              {h.filters[f]} <span className="tabular-nums opacity-70">{contagem(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">{t.common.loading}</p>
      ) : visiveis.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">{h.empty}</p>
      ) : (
        <ol className="divide-y">
          {visiveis.map((i, k) => {
            const d = descrever(i)
            const Icon = d.icon
            return (
              <li key={`${i.kind}-${i.at}-${k}`} className="px-4 sm:px-5 py-3 flex gap-3">
                <span className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', d.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{d.text}</p>
                  {d.detail && <p className="text-sm text-muted-foreground line-clamp-2">{d.detail}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(i.at), 'dd/MM/yyyy HH:mm')} · {i.userName ? h.by(i.userName) : h.system}
                  </p>
                </div>
                {d.link && (
                  <Link to={d.link} className="text-xs text-primary self-center hover:underline flex-shrink-0">{h.open}</Link>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
