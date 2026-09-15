import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, CheckCircle2, AlertTriangle, ChevronRight, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { parseDateOnly } from '@/lib/utils'
import { ScreenHeader, PrimaryButton, SecondaryButton, MEASUREMENT_FIELDS, nextMeasurementTime } from './shared'
import type { ProductionBatch } from '@/types'

/** Painel do lote em andamento: próxima medição em destaque e encerrar lote */
export function BatchRun() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const o = t.operator

  const { data: lote, isLoading } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
  })

  if (isLoading || !lote) return <p className="text-lg text-[#52606D]">{t.common.loading}</p>

  const medicoes = [...(lote.hourlyMeasurements ?? [])].sort((a, b) => a.horario.localeCompare(b.horario))
  const proxima = nextMeasurementTime(lote, medicoes)
  const desvios = (lote.fixedParams ?? []).filter(p => p.isOk === false).length
  const encerrado = lote.status === 'COMPLETED'

  return (
    <div className="space-y-6">
      <ScreenHeader
        title={o.lotNumber(lote.loteNumero)}
        subtitle={`${lote.product.name} · ${lote.machine.name} · ${o.setShort(lote.punchSet.code)}`}
        back="/operador"
        help={o.helpRun}
      />

      {encerrado ? (
        <div className="rounded-2xl bg-white border-2 border-[#1E8E3E]/40 p-5 flex items-start gap-3">
          <CheckCircle2 className="h-7 w-7 text-[#1E8E3E] flex-shrink-0" />
          <div>
            <p className="text-lg font-semibold">{o.lotClosed}</p>
            <p className="text-base text-[#52606D]">{o.lotClosedKg((lote.kgProduzidos ?? 0).toLocaleString(locale))}</p>
          </div>
        </div>
      ) : (
        <section className="rounded-2xl bg-white border-2 border-primary/40 p-5 space-y-4">
          <div>
            <p className="text-base text-[#52606D] flex items-center gap-1.5"><Clock className="h-5 w-5" /> {o.nextMeasurement}</p>
            <p className="text-6xl font-semibold tabular-nums tracking-tight leading-none mt-2">{proxima}</p>
          </div>
          <PrimaryButton onClick={() => navigate(`/operador/lote/${lote.id}/medicao`)}>{o.recordMeasurementAt(proxima)}</PrimaryButton>
        </section>
      )}

      {desvios > 0 && (
        <p className="rounded-xl bg-[#FDECEA] text-[#C62828] px-4 py-3 text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" /> {o.setupDeviations(desvios)}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{o.measurementsTitle(medicoes.length)}</h2>
        {medicoes.length === 0 ? (
          <p className="text-base text-[#52606D]">{o.noMeasurementsYet}</p>
        ) : (
          <ul className="rounded-2xl bg-white border divide-y overflow-hidden">
            {medicoes.map(m => {
              const preenchidos = MEASUREMENT_FIELDS.filter(f => m[f] != null).length
              return (
                <li key={m.id}>
                  <button type="button" disabled={encerrado} onClick={() => navigate(`/operador/lote/${lote.id}/medicao/${m.id}`)}
                    className="w-full flex items-center gap-4 px-4 py-3 min-h-16 text-left hover:bg-[#F7F9FA] disabled:hover:bg-transparent">
                    <span className="text-2xl font-semibold tabular-nums w-20">{m.horario}</span>
                    <span className="flex-1 text-base text-[#52606D]">
                      {o.valuesFilled(preenchidos, MEASUREMENT_FIELDS.length)}{m.responsavel ? ` · ${m.responsavel}` : ''}
                    </span>
                    {!encerrado && <span className="text-base text-primary inline-flex items-center">{o.fix}<ChevronRight className="h-5 w-5" /></span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="space-y-3 pt-2">
        {!encerrado && <SecondaryButton onClick={() => navigate(`/operador/lote/${lote.id}/encerrar/kg`)}>{o.finishLot}</SecondaryButton>}
        <button type="button" onClick={() => navigate(`/production/${lote.id}`)} className="w-full h-12 text-base text-[#52606D] inline-flex items-center justify-center gap-2 hover:text-[#1F2933]">
          <FileText className="h-5 w-5" /> {o.openFullForm}
        </button>
        <p className="text-sm text-center text-[#52606D]">{o.startedAt(format(parseDateOnly(lote.dataProducao), 'dd/MM/yyyy'), lote.horaInicio)}</p>
      </div>
    </div>
  )
}
