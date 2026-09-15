import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { ScreenHeader, BottomAction, PrimaryButton, BigNumberField, MEASUREMENT_FIELDS, nextMeasurementTime, apiMessage, toNumberOrNull, type MeasurementField } from './shared'
import type { ProductionBatch } from '@/types'

type CepStats = { medicaoStats?: Record<string, { min: number | null; max: number | null; median: number | null; amostras: number }> }

// Pares lado a lado, como a máquina tem: direito/esquerdo, lado 1/lado 2
const GRUPOS: { key: 'rolo' | 'rampa' | 'cfc' | 'cv'; fields: [MeasurementField, MeasurementField]; unit: string | null }[] = [
  { key: 'rolo', fields: ['roloCmpDir', 'roloCmpEsq'], unit: 'mm' },
  { key: 'rampa', fields: ['rampaDosDir', 'rampaDosEsq'], unit: 'mm' },
  { key: 'cfc', fields: ['pressaoCFCL1', 'pressaoCFCL2'], unit: null },
  { key: 'cv', fields: ['coefVarL1', 'coefVarL2'], unit: '%' },
]

/** Uma medição da hora numa tela só: horário, 8 valores e quem mediu */
export function MeasurementPage() {
  const { id, mid } = useParams<{ id: string; mid?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()
  const o = t.operator

  const { data: lote } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
  })
  const { data: cep } = useQuery<CepStats>({
    queryKey: ['cep-medicoes', lote?.productId, lote?.machineId],
    queryFn: () => api.get('/production-batches/cep', { params: { productId: lote!.productId, machineId: lote!.machineId } }).then(r => r.data),
    enabled: !!lote,
  })

  const [horario, setHorario] = useState('')
  const [valores, setValores] = useState<Record<MeasurementField, string>>(() => Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f, ''])) as Record<MeasurementField, string>)
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    if (!lote || carregado) return
    const medicoes = lote.hourlyMeasurements ?? []
    const existente = mid ? medicoes.find(m => m.id === mid) : undefined
    if (existente) {
      setHorario(existente.horario)
      setValores(Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f, existente[f] == null ? '' : String(existente[f]).replace('.', ',')])) as Record<MeasurementField, string>)
      setResponsavel(existente.responsavel ?? '')
      setObservacoes(existente.observacoes ?? '')
    } else {
      setHorario(nextMeasurementTime(lote, medicoes))
      // Quem mediu costuma ser a mesma pessoa do lote inteiro
      const ultima = [...medicoes].sort((a, b) => a.horario.localeCompare(b.horario)).at(-1)
      setResponsavel(ultima?.responsavel ?? user?.name ?? '')
    }
    setCarregado(true)
  }, [lote, mid, carregado, user])

  const payload = () => ({
    horario,
    ...Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f, toNumberOrNull(valores[f])])),
    responsavel: responsavel.trim() || null,
    observacoes: observacoes.trim() || null,
  })

  const salvar = useMutation({
    mutationFn: () => mid
      ? api.put(`/production-batches/${id}/measurements/${mid}`, payload())
      : api.post(`/production-batches/${id}/measurements`, payload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-batch', id] })
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      toast.success(o.measurementSaved(horario))
      navigate(`/operador/lote/${id}`)
    },
    onError: (e) => toast.error(apiMessage(e, o.saveError)),
  })

  const excluir = useMutation({
    mutationFn: () => api.delete(`/production-batches/${id}/measurements/${mid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-batch', id] })
      toast.success(o.measurementDeleted)
      navigate(`/operador/lote/${id}`)
    },
    onError: (e) => toast.error(apiMessage(e, o.saveError)),
  })

  const preenchidos = MEASUREMENT_FIELDS.filter(f => toNumberOrNull(valores[f]) !== null).length
  const horarioValido = /^\d{2}:\d{2}$/.test(horario)

  const faixa = (f: MeasurementField) => {
    const s = cep?.medicaoStats?.[f]
    if (!s || s.amostras === 0 || s.min == null || s.max == null) return undefined
    return { min: s.min, max: s.max, label: o.usualRange(s.min, s.max) }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (horarioValido && preenchidos > 0) salvar.mutate() }}>
      <ScreenHeader
        title={mid ? o.fixMeasurementTitle : o.measurementTitle}
        subtitle={lote ? `${o.lotNumber(lote.loteNumero)} · ${lote.product.name}` : undefined}
        back={`/operador/lote/${id}`}
        help={o.helpMeasurement}
      />

      <div className="space-y-1">
        <label htmlFor="horario" className="block text-base font-medium">{o.measurementTime}</label>
        <input id="horario" type="time" value={horario} onChange={e => setHorario(e.target.value)}
          className="w-44 h-12 rounded-lg border border-input bg-background px-3 text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {GRUPOS.map(g => (
        <fieldset key={g.key} className="rounded-xl bg-card shadow-sm border p-4 space-y-3">
          <legend className="px-1 text-lg font-semibold">{o.groups[g.key]}</legend>
          <div className="grid grid-cols-2 gap-3">
            {g.fields.map((f, i) => {
              const r = faixa(f)
              return (
                <BigNumberField
                  key={f}
                  id={f}
                  label={g.key === 'rolo' || g.key === 'rampa' ? (i === 0 ? o.right : o.left) : (i === 0 ? o.side1 : o.side2)}
                  unit={g.unit}
                  value={valores[f]}
                  onChange={v => setValores(prev => ({ ...prev, [f]: v }))}
                  min={r?.min}
                  max={r?.max}
                  rangeLabel={r?.label}
                />
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="resp" className="block text-base font-medium">{o.whoMeasured}</label>
          <input id="resp" value={responsavel} onChange={e => setResponsavel(e.target.value)}
            className="w-full h-12 rounded-lg border border-input bg-background px-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label htmlFor="obs" className="block text-base font-medium">{o.noteOptional}</label>
          <input id="obs" value={observacoes} onChange={e => setObservacoes(e.target.value)}
            className="w-full h-12 rounded-lg border border-input bg-background px-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {mid && (
        <button type="button" onClick={() => { if (confirm(o.deleteMeasurementConfirm)) excluir.mutate() }}
          className="h-12 px-3 rounded-lg text-base text-red-600 inline-flex items-center gap-2 hover:bg-red-50">
          <Trash2 className="h-5 w-5" /> {o.deleteMeasurement}
        </button>
      )}

      <BottomAction>
        {preenchidos === 0 && <p className="text-base text-muted-foreground mb-2">{o.fillAtLeastOne}</p>}
        <PrimaryButton type="submit" disabled={!horarioValido || preenchidos === 0} loading={salvar.isPending}>
          {o.saveMeasurement}
        </PrimaryButton>
      </BottomAction>
    </form>
  )
}
