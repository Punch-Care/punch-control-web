import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'
import { ScreenHeader, BottomAction, PrimaryButton, BigNumberField, apiMessage, toNumberOrNull } from './shared'
import type { BatchOccurrenceType, ProductionBatch, PunchSet } from '@/types'

const STEPS = ['kg', 'problemas', 'confirmar'] as const
type Step = typeof STEPS[number]
const TIPOS: BatchOccurrenceType[] = ['CAPPING', 'STICKING', 'TRAVAMENTO', 'QUEBRA', 'OXIDACAO', 'OUTROS']

type Draft = { kg: string; problemas: BatchOccurrenceType[]; observacoes: string }

/** Encerrar lote em páginas: kg produzidos → problemas → confirmar */
export function FinishBatch() {
  const { id, step } = useParams<{ id: string; step: Step }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t, locale } = useLocale()
  const o = t.operator
  const chave = `punch-operator-finish-${id}`

  const { data: lote } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
  })

  const [draft, setDraft] = useState<Draft>(() => {
    try { return { kg: '', problemas: [], observacoes: '', ...JSON.parse(sessionStorage.getItem(chave) ?? '{}') } } catch { return { kg: '', problemas: [], observacoes: '' } }
  })
  useEffect(() => { sessionStorage.setItem(chave, JSON.stringify(draft)) }, [draft, chave])
  // Problemas já anotados no lote entram marcados
  useEffect(() => {
    if (lote && draft.problemas.length === 0 && (lote.batchOccurrences?.length ?? 0) > 0) {
      setDraft(d => ({ ...d, problemas: [...new Set(lote.batchOccurrences!.map(b => b.type))] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote])

  const encerrar = useMutation({
    mutationFn: async () => {
      const antes = await api.get<PunchSet>(`/punch-sets/${lote!.punchSetId}`).then(r => r.data)
      await api.put(`/production-batches/${id}`, {
        status: 'COMPLETED',
        kgProduzidos: toNumberOrNull(draft.kg),
        batchOccurrences: draft.problemas.map(type => ({ type, notas: null })),
        observacoesOperador: draft.observacoes.trim() || null,
      })
      const depois = await api.get<PunchSet>(`/punch-sets/${lote!.punchSetId}`).then(r => r.data)
      return { antes: antes.usefulValue, depois: depois.usefulValue }
    },
    onSuccess: (vida) => {
      sessionStorage.removeItem(chave)
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      qc.invalidateQueries({ queryKey: ['production-batch', id] })
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      navigate(`/operador/lote/${id}/concluido`, { replace: true, state: vida })
    },
    onError: (e) => toast.error(apiMessage(e, o.finishError)),
  })

  const indice = STEPS.indexOf(step as Step)
  if (indice === -1) return <Navigate to={`/operador/lote/${id}/encerrar/kg`} replace />
  const kg = toNumberOrNull(draft.kg)
  if (indice > 0 && !(kg && kg > 0)) return <Navigate to={`/operador/lote/${id}/encerrar/kg`} replace />
  if (lote?.status === 'COMPLETED') return <Navigate to={`/operador/lote/${id}`} replace />

  const voltar = indice === 0 ? `/operador/lote/${id}` : `/operador/lote/${id}/encerrar/${STEPS[indice - 1]}`
  const proximo = () => navigate(`/operador/lote/${id}/encerrar/${STEPS[indice + 1]}`)
  const subtitulo = lote ? `${o.lotNumber(lote.loteNumero)} · ${lote.product.name}` : undefined
  const passo = { current: indice + 1, total: STEPS.length }

  if (step === 'kg') {
    return (
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (kg && kg > 0) proximo() }}>
        <ScreenHeader title={o.finishKgTitle} subtitle={subtitulo} back={voltar} step={passo} help={o.helpFinish} />
        <BigNumberField id="kg" label={o.kgProduced} unit="kg" value={draft.kg} onChange={v => setDraft(d => ({ ...d, kg: v }))} />
        <BottomAction><PrimaryButton type="submit" disabled={!(kg && kg > 0)}>{o.continue}</PrimaryButton></BottomAction>
      </form>
    )
  }

  if (step === 'problemas') {
    const alternar = (tipo: BatchOccurrenceType) =>
      setDraft(d => ({ ...d, problemas: d.problemas.includes(tipo) ? d.problemas.filter(p => p !== tipo) : [...d.problemas, tipo] }))
    return (
      <div className="space-y-6">
        <ScreenHeader title={o.finishProblemsTitle} subtitle={o.finishProblemsHint} back={voltar} step={passo} />
        <div className="grid grid-cols-2 gap-3">
          {TIPOS.map(tipo => {
            const marcado = draft.problemas.includes(tipo)
            return (
              <button key={tipo} type="button" onClick={() => alternar(tipo)} aria-pressed={marcado}
                className={cn('rounded-xl border-2 p-4 min-h-24 text-left bg-white', marcado ? 'border-[#C62828] bg-[#FDECEA]' : 'border-[#D9DEE3]')}>
                <p className="text-lg font-semibold flex items-center justify-between gap-2">
                  {t.production[tipo]}
                  {marcado && <CheckCircle2 className="h-5 w-5 text-[#C62828]" />}
                </p>
                <p className="text-sm text-[#52606D] mt-1">{o.problemDesc[tipo]}</p>
              </button>
            )
          })}
        </div>
        <div className="space-y-1">
          <label htmlFor="obs" className="block text-base font-medium">{o.operatorNoteOptional}</label>
          <textarea id="obs" rows={3} value={draft.observacoes} onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
            className="w-full rounded-xl border-2 border-[#D9DEE3] bg-white px-4 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-primary/25" />
        </div>
        <BottomAction>
          <PrimaryButton onClick={proximo}>{draft.problemas.length === 0 ? o.noProblemsContinue : o.continue}</PrimaryButton>
        </BottomAction>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ScreenHeader title={o.finishConfirmTitle} subtitle={subtitulo} back={voltar} step={passo} />
      <dl className="rounded-2xl bg-white border divide-y">
        <div className="px-4 py-3"><dt className="text-sm text-[#52606D]">{o.kgProduced}</dt><dd className="text-2xl font-semibold tabular-nums">{(toNumberOrNull(draft.kg) ?? 0).toLocaleString(locale)} kg</dd></div>
        <div className="px-4 py-3"><dt className="text-sm text-[#52606D]">{o.finishProblemsTitle}</dt><dd className="text-lg">{draft.problemas.length ? draft.problemas.map(p => t.production[p]).join(', ') : o.none}</dd></div>
        <div className="px-4 py-3"><dt className="text-sm text-[#52606D]">{o.stepSet}</dt><dd className="text-lg">{lote ? `${lote.punchSet.code} · ${lote.punchSet.name}` : '—'}</dd></div>
        <div className="px-4 py-3"><dt className="text-sm text-[#52606D]">{o.measurementsLabel}</dt><dd className="text-lg">{o.measurementsDone(lote?.hourlyMeasurements?.length ?? 0)}</dd></div>
      </dl>
      <p className="text-base text-[#52606D]">{o.finishWarning}</p>
      <BottomAction>
        <PrimaryButton onClick={() => encerrar.mutate()} loading={encerrar.isPending}>{o.finishLot}</PrimaryButton>
      </BottomAction>
    </div>
  )
}
