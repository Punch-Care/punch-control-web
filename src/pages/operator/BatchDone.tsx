import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { PrimaryButton, SecondaryButton } from './shared'
import type { LifecycleData, ProductionBatch } from '@/types'

/** Confirmação clara de que o lote foi encerrado e quanto o jogo gastou */
export function BatchDone() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { antes: number; depois: number } }
  const { t, locale } = useLocale()
  const o = t.operator

  const { data: lote } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
  })
  const { data: vida } = useQuery<LifecycleData>({
    queryKey: ['lifecycle', lote?.punchSetId],
    queryFn: () => api.get(`/punch-sets/${lote!.punchSetId}/lifecycle`).then(r => r.data),
    enabled: !!lote,
  })

  const proximo = vida?.forecast?.limits.find(l => !l.reached && l.daysLeft !== null)
  const pct = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 })

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-3">
        <CheckCircle2 className="h-20 w-20 text-[#1E8E3E] mx-auto" />
        <h1 className="text-[28px] font-semibold">{o.doneTitle}</h1>
        {lote && <p className="text-lg text-[#52606D]">{o.doneSubtitle(lote.loteNumero, (lote.kgProduzidos ?? 0).toLocaleString(locale))}</p>}
      </div>

      {lote && (
        <div className="rounded-2xl bg-white border p-5 space-y-2">
          <p className="text-base text-[#52606D]">{o.setUsefulLife(lote.punchSet.code)}</p>
          <p className="text-4xl font-semibold tabular-nums">{pct(state?.depois ?? vida?.forecast?.usefulValue ?? 0)}%</p>
          {state && state.antes > state.depois && <p className="text-base text-[#52606D]">{o.lifeUsed(pct(state.antes - state.depois))}</p>}
          {proximo && <p className="text-base">{o.nextLimitIn(proximo.label ?? `${proximo.percentual}%`, proximo.daysLeft ?? 0)}</p>}
        </div>
      )}

      <div className="space-y-3">
        <PrimaryButton onClick={() => navigate('/operador')}>{o.backHome}</PrimaryButton>
        <SecondaryButton onClick={() => navigate('/operador/lote/novo/maquina')}>{o.startAnother}</SecondaryButton>
      </div>
    </div>
  )
}
