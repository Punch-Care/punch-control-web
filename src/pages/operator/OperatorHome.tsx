import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, AlertTriangle, Sparkles, Ruler, ChevronRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { HelpButton } from '@/components/ui/help-button'
import { nextMeasurementTime } from './shared'
import type { DashboardStats, ProductionBatch } from '@/types'

export function OperatorHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLocale()
  const o = t.operator
  const { companyId } = useAdminCompany()

  const { data: emAndamento = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches', 'em-andamento', companyId],
    queryFn: async () => {
      const lotes = await api.get<ProductionBatch[]>('/production-batches', { params: { companyId, status: 'DRAFT' } }).then(r => r.data)
      // A lista não traz as medições; busca cada lote para saber a próxima hora
      return Promise.all(lotes.slice(0, 6).map(l => api.get<ProductionBatch>(`/production-batches/${l.id}`).then(r => r.data)))
    },
    refetchInterval: 60_000,
  })

  // Jogos ativos sujos: o mecânico resolve pelo fluxo de limpeza
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['stats-dashboard', companyId],
    queryFn: () => api.get('/stats/dashboard', { params: companyId ? { companyId } : {} }).then(r => r.data),
    refetchInterval: 5 * 60_000,
  })
  const sujos = stats?.attention?.setsNotClean ?? []

  const tarefas = [
    { key: 'start', icon: FlaskConical, title: o.taskStart, desc: o.taskStartDesc, to: '/operador/lote/novo/maquina' },
    { key: 'problem', icon: AlertTriangle, title: o.taskProblem, desc: o.taskProblemDesc, to: '/operador/problema/jogo' },
    { key: 'cleaning', icon: Sparkles, title: o.taskCleaning, desc: o.taskCleaningDesc, to: '/operador/limpeza/jogo' },
    { key: 'measure', icon: Ruler, title: o.taskMeasure, desc: o.taskMeasureDesc, to: '/operador/medir/jogo' },
  ]

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h1 className="text-[28px] leading-tight font-semibold">{o.hello(user?.name?.split(' ')[0] ?? '')}</h1>
          <p className="text-base text-[#52606D] mt-1">{o.homeSubtitle}</p>
        </div>
        <HelpButton content={o.helpHome} size="lg" />
      </div>

      {emAndamento.length > 0 && (
        <section className="space-y-3" aria-labelledby="em-andamento">
          <h2 id="em-andamento" className="text-lg font-semibold">{o.inProgress(emAndamento.length)}</h2>
          {emAndamento.map(lote => {
            const proxima = nextMeasurementTime(lote, lote.hourlyMeasurements ?? [])
            return (
              <article key={lote.id} className="rounded-2xl bg-white border-2 border-primary/40 overflow-hidden">
                <button type="button" onClick={() => navigate(`/operador/lote/${lote.id}`)} className="w-full text-left px-5 pt-4 pb-3">
                  <p className="text-base text-[#52606D]">{o.lotNumber(lote.loteNumero)}</p>
                  <p className="text-lg font-medium truncate">{lote.product.name}</p>
                  <p className="text-sm text-[#52606D] truncate">{lote.machine.name} · {o.setShort(lote.punchSet.code)}</p>
                </button>
                <div className="px-5 pb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#52606D] flex items-center gap-1"><Clock className="h-4 w-4" /> {o.nextMeasurement}</p>
                    <p className="text-5xl font-semibold tabular-nums tracking-tight leading-none mt-1">{proxima}</p>
                    <p className="text-sm text-[#52606D] mt-1">{o.measurementsDone(lote.hourlyMeasurements?.length ?? 0)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t">
                  <button type="button" onClick={() => navigate(`/operador/lote/${lote.id}/medicao`)} className="h-14 bg-primary text-white text-lg font-semibold">
                    {o.recordMeasurement}
                  </button>
                  <button type="button" onClick={() => navigate(`/operador/lote/${lote.id}/encerrar/kg`)} className="h-14 bg-white text-[#1F2933] text-lg font-medium border-l">
                    {o.finishLot}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {sujos.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/operador/limpeza/jogo')}
          className="w-full text-left rounded-2xl border-2 border-[#E8A317] bg-[#FFF8E6] px-4 py-4 flex items-center gap-4"
        >
          <Sparkles className="h-7 w-7 text-[#9A6B00] flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-semibold">{o.needsCleaning(sujos.length)}</span>
            <span className="block text-sm text-[#52606D] truncate">{sujos.map(s => s.code).join(', ')}</span>
            <span className="block text-sm text-[#52606D]">{o.needsCleaningHint}</span>
          </span>
          <ChevronRight className="h-6 w-6 text-[#9A6B00]" />
        </button>
      )}

      <section className="space-y-3" aria-labelledby="tarefas">
        <h2 id="tarefas" className="text-lg font-semibold">{o.whatToDo}</h2>
        <ul className="rounded-2xl bg-white border divide-y overflow-hidden">
          {tarefas.map(({ key, icon: Icon, title, desc, to }) => (
            <li key={key}>
              <button type="button" onClick={() => navigate(to)} className="w-full flex items-center gap-4 px-4 py-4 min-h-20 text-left hover:bg-[#F7F9FA]">
                <span className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${key === 'start' ? 'bg-primary text-white' : 'bg-[#EEF1F4] text-[#1F2933]'}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-medium">{title}</span>
                  <span className="block text-sm text-[#52606D]">{desc}</span>
                </span>
                <ChevronRight className="h-6 w-6 text-[#9AA5B1]" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
