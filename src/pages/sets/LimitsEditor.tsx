import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks/useLocale'
import { LIMIT_COLORS, resolveLimit, limitLabel, HEALTHY_COLOR } from '@/lib/utils'

/** Limite em edição — sem id, porque a lista é gravada por inteiro a cada save */
export type LimitDraft = { percentual: string; label: string; cor: string }

export const DEFAULT_LIMIT_DRAFTS: LimitDraft[] = [
  { percentual: '30', label: 'L30', cor: '#ef4444' },
  { percentual: '60', label: 'L60', cor: '#f59e0b' },
]

/** Converte o rascunho (texto) para o formato do payload da API */
export function limitsToPayload(drafts: LimitDraft[]) {
  return drafts
    .map((d) => ({
      percentual: Number(d.percentual.replace(',', '.')),
      label: d.label.trim() || null,
      cor: d.cor,
    }))
    .filter((l) => Number.isFinite(l.percentual))
}

/** Valida a lista antes de gravar; devolve a mensagem de erro ou null */
export function validateLimits(drafts: LimitDraft[], t: ReturnType<typeof useLocale>['t']): string | null {
  const parsed = limitsToPayload(drafts)
  if (parsed.length !== drafts.length) return t.sets.limitInvalid
  if (parsed.some((l) => l.percentual < 0 || l.percentual > 100)) return t.sets.limitOutOfRange
  const percentuais = parsed.map((l) => l.percentual)
  if (new Set(percentuais).size !== percentuais.length) return t.sets.limitDuplicated
  return null
}

export function LimitsEditor({
  limits,
  onChange,
  disabled,
}: {
  limits: LimitDraft[]
  onChange: (next: LimitDraft[]) => void
  disabled?: boolean
}) {
  const { t } = useLocale()

  const update = (idx: number, patch: Partial<LimitDraft>) =>
    onChange(limits.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const add = () => {
    const cor = LIMIT_COLORS[limits.length % LIMIT_COLORS.length]
    onChange([...limits, { percentual: '', label: '', cor }])
  }

  const remove = (idx: number) => onChange(limits.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t.sets.limitsLabel}</Label>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
            <Plus className="h-3.5 w-3.5" /> {t.sets.addLimit}
          </Button>
        )}
      </div>

      {limits.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.sets.noLimits}</p>
      ) : (
        <div className="space-y-1.5">
          {limits.map((l, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                className="h-8 text-xs w-20 tabular-nums"
                inputMode="decimal"
                placeholder="%"
                value={l.percentual}
                onChange={(e) => update(idx, { percentual: e.target.value.replace(/[^\d.,]/g, '') })}
                disabled={disabled}
              />
              <Input
                className="h-8 text-xs flex-1"
                placeholder={t.sets.limitLabelPlaceholder}
                value={l.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                disabled={disabled}
              />
              <input
                type="color"
                className="h-8 w-9 rounded-md border cursor-pointer disabled:cursor-not-allowed"
                value={l.cor}
                onChange={(e) => update(idx, { cor: e.target.value })}
                disabled={disabled}
                title={t.sets.limitColor}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{t.sets.limitsHint}</p>
    </div>
  )
}

/**
 * Barra de vida útil pintada pelo limite ativo. Sem limites cadastrados, a barra
 * fica verde — não há faixa que classifique o valor.
 */
export function UsefulValueBar({
  value,
  limits,
  detailed = false,
}: {
  value: number
  limits: { percentual: number; cor: string; label?: string | null }[]
  detailed?: boolean
}) {
  const { t } = useLocale()
  const active = resolveLimit(limits, value)
  const color = active?.cor ?? HEALTHY_COLOR
  const label = active ? limitLabel(active) : t.sets.limitHealthy

  if (!detailed) {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs tabular-nums w-10 text-right">{value.toFixed(0)}%</span>
      </div>
    )
  }

  const sorted = [...limits].sort((a, b) => a.percentual - b.percentual)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{t.sets.usefulLifeTitle}</span>
        <span className="font-semibold" style={{ color }}>
          {value.toFixed(0)}% — {label}
        </span>
      </div>
      {/* Barra com marcadores de cada limite */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
        {sorted.map((l) => (
          <span
            key={l.percentual}
            className="absolute top-0 h-full w-px bg-foreground/40"
            style={{ left: `${l.percentual}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {sorted.map((l) => (
          <span key={l.percentual} className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.cor }} />
            {limitLabel(l)} · {l.percentual}%
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HEALTHY_COLOR }} />
          {t.sets.limitHealthy}
        </span>
      </div>
    </div>
  )
}
