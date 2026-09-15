import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Package, Sparkles, TrendingDown, FlaskConical } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import type { DashboardStats } from '@/types'

type Group = {
  key: string
  icon: typeof AlertTriangle
  tone: string
  title: string
  hint?: string
  items: { key: string; label: ReactNode; to: string }[]
  action: { label: string; to: string }
}

/**
 * Primeira coisa que o gestor vê: o que está esperando alguém agir, em frases
 * curtas e com o botão que resolve. Sem gráfico para interpretar.
 */
export function AttentionPanel({ companyId }: { companyId?: string }) {
  const { t, locale } = useLocale()
  const a = t.attention
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['stats-dashboard', companyId],
    queryFn: () => api.get('/stats/dashboard', { params: companyId ? { companyId } : {} }).then(r => r.data),
  })
  if (isLoading || !stats) return null

  const at = stats.attention
  const pct = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 })
  const grupos: Group[] = []

  if (at && at.batchesInProgress.length > 0) {
    grupos.push({
      key: 'batches', icon: FlaskConical, tone: 'text-primary bg-primary/10',
      title: a.batchesInProgress(at.batchesInProgress.length),
      items: at.batchesInProgress.map(b => ({ key: b.id, label: a.batchItem(b.loteNumero, b.productName, b.machineName), to: `/production/${b.id}` })),
      action: { label: a.viewAll, to: '/production' },
    })
  }
  if (at && at.recentOpenOccurrences.length > 0) {
    grupos.push({
      key: 'occ', icon: AlertTriangle, tone: 'text-red-600 bg-red-50',
      title: a.occurrences(stats.openOccurrences),
      items: at.recentOpenOccurrences.map(o => ({
        key: o.id,
        label: <><span className="font-mono">{o.setCode}</span> · {t.occurrenceType[o.type]} · <span className="text-muted-foreground">{o.description}</span></>,
        to: '/occurrences',
      })),
      action: { label: a.openOccurrences, to: '/occurrences' },
    })
  }
  if (stats.belowCritical && stats.belowCritical.length > 0) {
    grupos.push({
      key: 'critical', icon: TrendingDown, tone: 'text-orange-600 bg-orange-50',
      title: a.belowCritical(stats.belowCritical.length),
      items: stats.belowCritical.map(s => ({ key: s.setId, label: a.belowCriticalItem(s.setCode, pct(s.usefulValue), s.limit), to: `/sets/${s.setId}?tab=rfq` })),
      action: { label: a.openRfq, to: `/sets/${stats.belowCritical[0].setId}?tab=rfq` },
    })
  }
  if (stats.upcomingCritical.length > 0) {
    grupos.push({
      key: 'upcoming', icon: Clock, tone: 'text-amber-700 bg-amber-50',
      title: a.upcoming(stats.upcomingCritical.length),
      items: stats.upcomingCritical.map(u => ({ key: u.setId, label: a.upcomingItem(u.setCode, u.daysLeft), to: `/sets/${u.setId}?tab=rfq` })),
      action: { label: a.openRfq, to: `/sets/${stats.upcomingCritical[0].setId}?tab=rfq` },
    })
  }
  if (at && at.setsNotClean.length > 0) {
    grupos.push({
      key: 'clean', icon: Sparkles, tone: 'text-sky-700 bg-sky-50',
      title: a.setsNotClean(at.setsNotClean.length), hint: a.setsNotCleanHint,
      items: at.setsNotClean.map(s => ({
        key: s.id,
        label: <><span className="font-mono">{s.code}</span> · {t.jogo.statuses[s.statusJogo]}</>,
        to: `/sets/${s.id}?tab=anexos`,
      })),
      action: { label: a.viewAll, to: '/sets' },
    })
  }
  if (stats.componentsToRestock.length > 0) {
    grupos.push({
      key: 'restock', icon: Package, tone: 'text-amber-700 bg-amber-50',
      title: a.restock(stats.componentsToRestock.length),
      items: stats.componentsToRestock.map(c => ({
        key: `${c.setId}-${c.tipo}`, label: a.restockItem(c.setCode, t.componentTypes[c.tipo], c.sobra), to: `/lifecycle?setId=${c.setId}`,
      })),
      action: { label: a.openStock, to: `/lifecycle?setId=${stats.componentsToRestock[0].setId}` },
    })
  }

  return (
    <section aria-labelledby="atencao-hoje" className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      <h2 id="atencao-hoje" className="px-5 pt-4 pb-3 text-lg font-semibold">{a.title}</h2>
      {grupos.length === 0 ? (
        <p className="px-5 pb-5 flex items-center gap-3 text-base">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" /> {a.allGood}
        </p>
      ) : (
        <ul className="divide-y border-t">
          {grupos.map(({ key, icon: Icon, tone, title, hint, items, action }) => (
            <li key={key} className="px-5 py-4 flex gap-4">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-base font-semibold">{title}</p>
                  <Link to={action.to} className="text-sm font-medium text-primary inline-flex items-center gap-0.5 hover:underline">
                    {action.label} <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
                <ul className="space-y-1">
                  {items.slice(0, 4).map(i => (
                    <li key={i.key}>
                      <Link to={i.to} className="block text-sm truncate rounded-md -mx-2 px-2 py-1 hover:bg-muted/60">{i.label}</Link>
                    </li>
                  ))}
                  {items.length > 4 && <li className="text-sm text-muted-foreground px-0">+{items.length - 4}</li>}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
