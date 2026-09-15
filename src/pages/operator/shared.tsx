import type { ReactNode } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'
import { HelpButton, type HelpContent } from '@/components/ui/help-button'
import { cn } from '@/lib/utils'
import type { BatchHourlyMeasurement, ProductionBatch } from '@/types'

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
