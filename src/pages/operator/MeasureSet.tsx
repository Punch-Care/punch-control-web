import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Ruler } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { usePunchSetsQuery } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import {
  ScreenHeader, BottomAction, PrimaryButton, SecondaryButton, SetChoiceList, BigNumberField, DoneScreen,
  apiMessage, readDraft, toNumberOrNull,
} from './shared'
import type { DimensionSpec, DimensionSpecsResponse } from '@/types'

const DRAFT_KEY = 'punch-operator-measure'
type Draft = { setId: string; values: Record<string, string> }
const vazio: Draft = { setId: '', values: {} }

const foraDaFaixa = (sp: DimensionSpec, v: number) =>
  (sp.lowerLimit != null && v < sp.lowerLimit) || (sp.upperLimit != null && v > sp.upperLimit)

/**
 * Medir jogo: uma medida por página, com verde/vermelho na hora. A lista vem da
 * especificação cadastrada pelo gestor — o mecânico não decide o que medir.
 */
export function MeasureSet() {
  const { step = 'jogo' } = useParams<{ step: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { fora: number } }
  const qc = useQueryClient()
  const { t, locale } = useLocale()
  const f = t.opFlows
  const { companyId } = useAdminCompany()
  const [draft, setDraft] = useState<Draft>(() => readDraft(DRAFT_KEY, vazio))
  useEffect(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) }, [draft])

  const { data: sets = [], isLoading } = usePunchSetsQuery(companyId)
  const { data: specData, isLoading: carregandoSpecs } = useQuery<DimensionSpecsResponse>({
    queryKey: ['dimension-specs', draft.setId],
    queryFn: () => api.get(`/punch-sets/${draft.setId}/dimension-records/specs`).then(r => r.data),
    enabled: !!draft.setId,
  })
  const specs = specData?.specs ?? []
  const punchSet = sets.find(s => s.id === draft.setId)
  const num = (v: number | null) => (v == null ? '—' : v.toLocaleString(locale, { maximumFractionDigits: 4 }))

  const medidas = specs
    .map(sp => ({ sp, v: toNumberOrNull(draft.values[sp.id] ?? '') }))
    .filter((x): x is { sp: DimensionSpec; v: number } => x.v !== null)

  const salvar = useMutation({
    mutationFn: () => api.post<{ occurrenceId: string | null }>(`/punch-sets/${draft.setId}/dimension-records`, {
      setId: draft.setId,
      values: medidas.map(({ sp, v }) => ({ parameter: sp.parameter, value: v, unit: sp.unit })),
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dimension-records'] })
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      qc.invalidateQueries({ queryKey: ['stats-dashboard'] })
      const fora = medidas.filter(({ sp, v }) => foraDaFaixa(sp, v)).length
      sessionStorage.removeItem(DRAFT_KEY)
      navigate('/operador/medir/pronto', { replace: true, state: { fora } })
    },
    onError: (e) => toast.error(apiMessage(e, f.saveError)),
  })

  if (step === 'pronto') {
    const fora = state?.fora ?? 0
    return (
      <DoneScreen
        tone={fora > 0 ? 'warn' : 'ok'}
        title={fora > 0 ? f.measureDoneNok : f.measureDoneOk}
        text={fora > 0 ? `${f.outCount(fora)}. ${f.measureDoneNokText}` : f.measureDoneOkText}
        primary={{ label: f.backHome, onClick: () => navigate('/operador') }}
        secondary={{ label: f.measureAnother, onClick: () => { setDraft(vazio); navigate('/operador/medir/jogo') } }}
      />
    )
  }

  if (isLoading || (draft.setId && carregandoSpecs && step !== 'jogo')) {
    return <p className="text-lg text-[#52606D]">{t.common.loading}</p>
  }

  // jogo + uma página por medida + conferir
  const total = specs.length + 2
  const voltarPara = (s: string) => `/operador/medir/${s}`

  if (step === 'jogo') {
    return (
      <div className="space-y-5">
        <ScreenHeader title={f.pickSet} subtitle={f.pickSetHint} back="/operador" step={{ current: 1, total: Math.max(total, 3) }} help={f.helpMeasure} />
        <SetChoiceList
          sets={sets.filter(s => s.status === 'ACTIVE' || s.status === 'IN_REPAIR')}
          selectedId={draft.setId}
          onPick={s => { setDraft(d => (d.setId === s.id ? d : { setId: s.id, values: {} })); navigate('/operador/medir/medida-1') }}
          emptyText={f.noSets}
        />
      </div>
    )
  }

  if (!draft.setId) return <Navigate to="/operador/medir/jogo" replace />

  if (specs.length === 0) {
    return (
      <div className="space-y-6">
        <ScreenHeader title={f.noSpecTitle} back="/operador/medir/jogo" help={f.helpMeasure} />
        <div className="rounded-2xl bg-white border p-5 flex gap-4">
          <Ruler className="h-8 w-8 text-[#52606D] flex-shrink-0" />
          <p className="text-lg">{f.noSpecText}</p>
        </div>
        <div className="space-y-3">
          <PrimaryButton onClick={() => navigate('/operador/medir/jogo')}>{f.pickOtherSet}</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/operador')}>{f.backHome}</SecondaryButton>
        </div>
      </div>
    )
  }

  const m = /^medida-(\d+)$/.exec(step)
  if (m) {
    const i = parseInt(m[1], 10)
    if (i < 1 || i > specs.length) return <Navigate to="/operador/medir/revisar" replace />
    const sp = specs[i - 1]
    const valor = draft.values[sp.id] ?? ''
    const n = toNumberOrNull(valor)
    const temFaixa = sp.lowerLimit != null || sp.upperLimit != null
    const avancar = () => navigate(i < specs.length ? voltarPara(`medida-${i + 1}`) : voltarPara('revisar'))
    return (
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); avancar() }}>
        <ScreenHeader
          title={sp.parameter}
          subtitle={`${punchSet?.code ?? ''} · ${f.measureOf(i, specs.length)}`}
          back={voltarPara(i === 1 ? 'jogo' : `medida-${i - 1}`)}
          step={{ current: i + 1, total }}
          help={f.helpMeasure}
        />
        <div className="rounded-2xl bg-white border p-4 space-y-1 text-base">
          {sp.nominal != null && <p>{f.nominal(num(sp.nominal), sp.unit)}</p>}
          {temFaixa && <p className="font-medium">{f.accepted(num(sp.lowerLimit), num(sp.upperLimit), sp.unit)}</p>}
        </div>
        <BigNumberField
          key={sp.id}
          id={`medida-${sp.id}`}
          label={f.valueLabel}
          unit={sp.unit}
          value={valor}
          onChange={v => setDraft(d => ({ ...d, values: { ...d.values, [sp.id]: v } }))}
          min={sp.lowerLimit}
          max={sp.upperLimit}
          strict
        />
        {n !== null && temFaixa && (
          foraDaFaixa(sp, n)
            ? <p className="text-xl font-semibold text-[#C62828] flex items-center gap-2"><XCircle className="h-7 w-7" /> {f.outRange}</p>
            : <p className="text-xl font-semibold text-[#1E8E3E] flex items-center gap-2"><CheckCircle2 className="h-7 w-7" /> {f.inRange}</p>
        )}
        <BottomAction>
          <div className="space-y-2">
            <PrimaryButton type="submit" disabled={n === null}>{i < specs.length ? f.nextMeasure : f.continue}</PrimaryButton>
            {n === null && (
              <button type="button" onClick={avancar} className="w-full h-12 rounded-xl text-base text-[#52606D] hover:bg-black/5">{f.skipMeasure}</button>
            )}
          </div>
        </BottomAction>
      </form>
    )
  }

  if (step !== 'revisar') return <Navigate to="/operador/medir/jogo" replace />

  const fora = medidas.filter(({ sp, v }) => foraDaFaixa(sp, v)).length
  return (
    <div className="space-y-5">
      <ScreenHeader title={f.reviewMeasuresTitle} subtitle={f.reviewMeasuresHint} back={voltarPara(`medida-${specs.length}`)} step={{ current: total, total }} />
      <ul className="rounded-2xl bg-white border divide-y">
        {specs.map((sp, idx) => {
          const v = toNumberOrNull(draft.values[sp.id] ?? '')
          const ruim = v !== null && foraDaFaixa(sp, v)
          return (
            <li key={sp.id}>
              <button type="button" onClick={() => navigate(voltarPara(`medida-${idx + 1}`))} className="w-full text-left flex items-center gap-3 px-4 py-3 min-h-16 hover:bg-[#F7F9FA]">
                <span className="flex-1 min-w-0">
                  <span className="block text-base">{sp.parameter}</span>
                  <span className={cn('block text-lg font-semibold tabular-nums', v === null ? 'text-[#9AA5B1] font-normal' : ruim ? 'text-[#C62828]' : 'text-[#1E8E3E]')}>
                    {v === null ? f.notMeasured : `${num(v)} ${sp.unit}`}
                  </span>
                </span>
                {v !== null && (ruim ? <XCircle className="h-6 w-6 text-[#C62828]" /> : <CheckCircle2 className="h-6 w-6 text-[#1E8E3E]" />)}
              </button>
            </li>
          )
        })}
      </ul>
      <BottomAction>
        {medidas.length === 0
          ? <p className="text-base text-[#9A6B00] font-medium mb-2">{f.needOne}</p>
          : <p className={cn('text-base font-medium mb-2 flex items-center gap-2', fora > 0 ? 'text-[#C62828]' : 'text-[#1E8E3E]')}>
              {fora > 0 ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              {fora > 0 ? f.outCount(fora) : f.allInRange}
            </p>}
        <PrimaryButton onClick={() => salvar.mutate()} disabled={medidas.length === 0} loading={salvar.isPending}>{f.saveMeasures}</PrimaryButton>
      </BottomAction>
    </div>
  )
}
