import type { ReactNode } from 'react'
import { ArrowLeft, Check, Loader2, CheckCircle2, AlertTriangle, Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'
import { HelpButton, type HelpContent } from '@/components/ui/help-button'
import { cn } from '@/lib/utils'
import type { BatchHourlyMeasurement, ProductionBatch, PunchSet } from '@/types'

/** Mensagem que a API devolveu, ou o texto padrão */
export const apiMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback

export const MEASUREMENT_FIELDS = [
  'roloCmpDir', 'roloCmpEsq', 'rampaDosDir', 'rampaDosEsq',
  'pressaoCFCL1', 'pressaoCFCL2', 'coefVarL1', 'coefVarL2',
] as const
export type MeasurementField = typeof MEASUREMENT_FIELDS[number]

/** Horário da próxima medição: uma hora depois da última, ou a hora de início do lote */
export function nextMeasurementTime(batch: Pick<ProductionBatch, 'horaInicio'>, measurements: Pick<BatchHourlyMeasurement, 'horario'>[]) {
  const ultima = [...measurements].sort((a, b) => a.horario.localeCompare(b.horario)).at(-1)
  if (!ultima) return batch.horaInicio.slice(0, 2) + ':00'
  const hora = (parseInt(ultima.horario.slice(0, 2), 10) + 1) % 24
  return `${String(hora).padStart(2, '0')}:00`
}

/** Cabeçalho das telas internas: voltar + título grande + passo (quando é sequência) */
export function ScreenHeader({ title, subtitle, back, step, help }: {
  title: string
  subtitle?: string
  back?: string | (() => void)
  step?: { current: number; total: number }
  help?: HelpContent
}) {
  const navigate = useNavigate()
  const { t } = useLocale()
  const o = t.operator
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between min-h-11">
        {back ? (
          <button
            type="button"
            onClick={() => (typeof back === 'function' ? back() : navigate(back))}
            className="inline-flex items-center gap-2 -ml-2 px-2 h-11 rounded-lg text-base text-[#1F2933] hover:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" /> {o.back}
          </button>
        ) : <span />}
        {step && <span className="text-sm text-[#52606D]">{o.stepOf(step.current, step.total)}</span>}
      </div>
      {step && (
        <div className="h-1.5 rounded-full bg-[#D9DEE3] overflow-hidden" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${(step.current / step.total) * 100}%` }} />
        </div>
      )}
      <div>
        <div className="flex items-start gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-semibold text-[#1F2933]">{title}</h1>
          {help && <HelpButton content={help} size="lg" className="-mt-1 -mr-2" />}
        </div>
        {subtitle && <p className="mt-1 text-base text-[#52606D]">{subtitle}</p>}
      </div>
    </div>
  )
}

/** Opção grande de toque (máquina, produto, jogo…) */
export function ChoiceButton({ selected, disabled, onClick, title, detail, aside, note }: {
  selected?: boolean
  disabled?: boolean
  onClick: () => void
  title: ReactNode
  detail?: ReactNode
  aside?: ReactNode
  note?: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full text-left rounded-xl border-2 px-4 py-3 min-h-16 flex items-center gap-3 transition-colors bg-white',
        selected ? 'border-primary bg-primary/5' : 'border-[#D9DEE3] hover:border-[#9AA5B1]',
        disabled && 'opacity-60 cursor-not-allowed hover:border-[#D9DEE3]',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-lg font-medium text-[#1F2933] truncate">{title}</p>
        {detail && <p className="text-sm text-[#52606D] truncate">{detail}</p>}
        {note && <p className="text-sm mt-0.5">{note}</p>}
      </div>
      {aside}
      {selected && (
        <span className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}

/** Barra da ação principal, presa ao rodapé ao alcance do polegar */
export function BottomAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#EEF1F4] via-[#EEF1F4] to-transparent">
      {children}
    </div>
  )
}

export function PrimaryButton({ children, loading, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'w-full h-14 rounded-xl bg-primary text-white text-lg font-semibold inline-flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99] transition-transform',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
        className,
      )}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'w-full h-14 rounded-xl border-2 border-[#9AA5B1] bg-white text-[#1F2933] text-lg font-medium inline-flex items-center justify-center gap-2',
        'disabled:opacity-50 hover:border-[#1F2933] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Campo numérico grande com vírgula, faixa de referência e sinal verde/vermelho */
export function BigNumberField({ id, label, unit, value, onChange, min, max, rangeLabel, strict }: {
  id: string
  label: string
  unit?: string | null
  value: string
  onChange: (v: string) => void
  min?: number | null
  max?: number | null
  rangeLabel?: string
  /** true = faixa é limite (vermelho); false = faixa é só referência habitual (âmbar) */
  strict?: boolean
}) {
  const n = value.trim() === '' ? null : Number(value.replace(',', '.'))
  const valido = n !== null && Number.isFinite(n)
  const fora = valido && ((min != null && n! < min) || (max != null && n! > max))
  const tom = !valido ? 'border-[#D9DEE3]' : fora ? (strict ? 'border-[#C62828] bg-[#FDECEA]' : 'border-[#E8A317] bg-[#FFF8E6]') : (min != null || max != null) ? 'border-[#1E8E3E]' : 'border-[#D9DEE3]'
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-base font-medium text-[#1F2933]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
          className={cn('w-full h-14 rounded-xl border-2 bg-white px-4 text-2xl tabular-nums text-[#1F2933] focus:outline-none focus:ring-4 focus:ring-primary/25', tom)}
        />
        {unit && <span className="text-base text-[#52606D] w-12">{unit}</span>}
      </div>
      {rangeLabel && <p className={cn('text-sm', fora ? (strict ? 'text-[#C62828] font-medium' : 'text-[#9A6B00] font-medium') : 'text-[#52606D]')}>{rangeLabel}</p>}
    </div>
  )
}

export const toNumberOrNull = (v: string) => {
  const n = v.trim() === '' ? null : Number(v.replace(',', '.'))
  return n !== null && Number.isFinite(n) ? n : null
}

/** Lista de jogos para tocar e escolher, com a condição de limpeza à vista */
export function SetChoiceList({ sets, selectedId, onPick, disabledReason, emptyText }: {
  sets: PunchSet[]
  selectedId?: string
  onPick: (s: PunchSet) => void
  disabledReason?: (s: PunchSet) => string | null
  emptyText: string
}) {
  const { t } = useLocale()
  const o = t.operator
  const ordenados = [...sets].sort((a, b) => a.code.localeCompare(b.code))
  return (
    <div className="space-y-3">
      {ordenados.map(s => {
        const motivo = disabledReason?.(s) ?? null
        const limpo = s.statusJogo === 'LIMPO'
        return (
          <ChoiceButton
            key={s.id}
            selected={selectedId === s.id}
            disabled={!!motivo}
            onClick={() => onPick(s)}
            title={<>{s.code} <span className="font-normal text-[#52606D]">· {s.name}</span></>}
            detail={o.usefulLife(Math.round(s.usefulValue))}
            note={motivo
              ? <span className="text-[#C62828]">{motivo}</span>
              : <span className={limpo ? 'text-[#1E8E3E]' : 'text-[#9A6B00]'}>{t.jogo.statuses[s.statusJogo]}</span>}
          />
        )
      })}
      {ordenados.length === 0 && <p className="text-base text-[#52606D]">{emptyText}</p>}
    </div>
  )
}

/** Linhas de conferência antes de salvar, cada uma com "Trocar" */
export function ReviewList({ rows }: { rows: { label: string; value: ReactNode; onChange?: () => void }[] }) {
  const { t } = useLocale()
  return (
    <dl className="rounded-2xl bg-white border divide-y">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-3 min-h-16">
          <div className="flex-1 min-w-0">
            <dt className="text-sm text-[#52606D]">{r.label}</dt>
            <dd className="text-lg font-medium break-words">{r.value}</dd>
          </div>
          {r.onChange && (
            <button type="button" onClick={r.onChange} className="h-11 px-3 rounded-lg text-base text-primary hover:bg-primary/10">{t.operator.change}</button>
          )}
        </div>
      ))}
    </dl>
  )
}

/** Tela final: o que aconteceu, em letras grandes, e para onde ir agora */
export function DoneScreen({ title, text, tone = 'ok', children, primary, secondary }: {
  title: string
  text?: ReactNode
  tone?: 'ok' | 'warn'
  children?: ReactNode
  primary: { label: string; onClick: () => void }
  secondary?: { label: string; onClick: () => void }
}) {
  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-3">
        {tone === 'ok'
          ? <CheckCircle2 className="h-20 w-20 text-[#1E8E3E] mx-auto" />
          : <AlertTriangle className="h-20 w-20 text-[#C27C00] mx-auto" />}
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {text && <p className="text-lg text-[#52606D]">{text}</p>}
      </div>
      {children}
      <div className="space-y-3">
        <PrimaryButton onClick={primary.onClick}>{primary.label}</PrimaryButton>
        {secondary && <SecondaryButton onClick={secondary.onClick}>{secondary.label}</SecondaryButton>}
      </div>
    </div>
  )
}

/** Quantidade com botões grandes de − e + (dedo sujo, luva, tela pequena) */
export function QuantityStepper({ value, onChange, min = 1, max = 999, label }: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  label: string
}) {
  const ajustar = (n: number) => onChange(Math.min(max, Math.max(min, n)))
  return (
    <div className="flex items-center justify-center gap-4" role="group" aria-label={label}>
      <button type="button" aria-label="−" onClick={() => ajustar(value - 1)} disabled={value <= min}
        className="h-20 w-20 rounded-2xl border-2 border-[#9AA5B1] bg-white flex items-center justify-center disabled:opacity-40">
        <Minus className="h-8 w-8" />
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={String(value)}
        onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); ajustar(Number.isNaN(n) ? min : n) }}
        className="h-20 w-28 rounded-2xl border-2 border-[#D9DEE3] bg-white text-center text-5xl font-semibold tabular-nums focus:outline-none focus:ring-4 focus:ring-primary/25"
      />
      <button type="button" aria-label="+" onClick={() => ajustar(value + 1)} disabled={value >= max}
        className="h-20 w-20 rounded-2xl bg-primary text-white flex items-center justify-center disabled:opacity-40">
        <Plus className="h-8 w-8" />
      </button>
    </div>
  )
}

/** Rascunho do fluxo guardado na aba: voltar e recarregar não perdem o que foi feito */
export function readDraft<T>(key: string, empty: T): T {
  try { return { ...empty, ...JSON.parse(sessionStorage.getItem(key) ?? '{}') } } catch { return empty }
}
