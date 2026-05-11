import { useState } from 'react'
import { Wrench, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import type { ToolingComponent, ToolingComponentType } from '@/types'

// ── Tabela A — Formato do Comprimido ──────────────────────────────────────────
export const TABLET_FORMATS = [
  { value: '1', label: '1 - Plano' },
  { value: '2', label: '2 - Com raio (raso)' },
  { value: '3', label: '3 - Com raio (fundo)' },
  { value: '4', label: '4 - Côncavo' },
  { value: '5', label: '5 - Formato especial' },
  { value: '6', label: '6 - Duplo raio' },
  { value: '7', label: '7 - Plano faced' },
  { value: '8', label: '8 - Radial faced' },
  { value: '9', label: '9 - Oblongo' },
  { value: '10', label: '10 - Oval com 1 raio' },
  { value: '11', label: '11 - Oval com 2 raios' },
  { value: '12', label: '12 - Exótico' },
]

// ── Tabela B — Tipo de Vinco (Breaking Score) ─────────────────────────────────
export const BREAKING_SCORES = [
  { value: 'A', label: 'A - Pelo diâmetro' },
  { value: 'B', label: 'B - Pelo raio' },
  { value: 'C', label: 'C - Bisotado' },
  { value: 'D', label: 'D - Pelo bisotado' },
  { value: 'E', label: 'E - Em toda reta' },
  { value: 'F', label: 'F - Em toda reta (funda)' },
  { value: 'G', label: 'G - Em toda reta (rasa)' },
  { value: 'H', label: 'H - Em toda reta (profunda)' },
  { value: 'U', label: 'U - Duplo ângulo' },
]

export const NORMAS = [
  'EU BBS', 'EU BB', 'EU B', 'EU D',
  "FETTE EU 1'441", 'PHARMA', '20/28',
  '25/32 GROOVE DIE', '25/32 SLOTTED DIE',
  'TSMB', 'TSMBB', 'TSMBD', 'TSMD',
]

export const OPCOES_ACO = [
  '1.2379 (D2 BY AISI)',
  '1.3343 (M2 BY AISI)',
  '1.2080 (D3 BY AISI)',
  'Outro',
]

export const OPCOES_REVESTIMENTO = [
  'Sem revestimento',
  'Cr = Implantação de cromo galvânico',
  'Nitretação à plasma',
  'TiN = Nitreto de titânio (PVD)',
  'DLC = Diamond-like carbon',
  'Outro',
]

export const OPCOES_FIXACAO = [
  'Monobloco "Monolito"',
  'Cônica / Ranhurada',
  'Outra',
]

const TOOLING_TYPES: ToolingComponentType[] = ['UPPER_PUNCH', 'LOWER_PUNCH', 'MATRIX', 'SEGMENT']

const TYPE_LABELS: Record<ToolingComponentType, string> = {
  UPPER_PUNCH: 'Punções Superiores',
  LOWER_PUNCH: 'Punções Inferiores',
  MATRIX: 'Matrizes',
  SEGMENT: 'Segmentos',
}

type LocalComp = Partial<ToolingComponent>

function sel(value: string | null | undefined, onValueChange: (v: string) => void, placeholder: string, options: { value: string; label: string }[], disabled?: boolean) {
  return (
    <Select value={value ?? '__none__'} onValueChange={v => onValueChange(v === '__none__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function boolSel(value: boolean | null | undefined, onValueChange: (v: boolean | null) => void, disabled?: boolean) {
  const strVal = value === true ? 'sim' : value === false ? 'nao' : '__none__'
  return (
    <Select value={strVal} onValueChange={v => onValueChange(v === '__none__' ? null : v === 'sim')} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        <SelectItem value="sim">Sim</SelectItem>
        <SelectItem value="nao">Não</SelectItem>
      </SelectContent>
    </Select>
  )
}

function num(value: number | null | undefined, onChange: (v: number | null) => void, placeholder = '—', disabled?: boolean) {
  return (
    <Input
      type="number"
      step="any"
      className="h-8 text-xs"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

function ComponentCard({
  type, data, onChange, canEdit,
}: {
  type: ToolingComponentType
  data: LocalComp
  onChange: (field: keyof ToolingComponent, val: unknown) => void
  canEdit: boolean
}) {
  const [open, setOpen] = useState(true)
  const isPunch = type === 'UPPER_PUNCH' || type === 'LOWER_PUNCH'
  const isMatrix = type === 'MATRIX'

  return (
    <div className="border rounded-xl overflow-hidden bg-background">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold">{TYPE_LABELS[type]}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Qtd. Solicitada</Label>
              {num(data.qtdSolicitada, v => onChange('qtdSolicitada', v), 'ex: 84', !canEdit)}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº Desenho</Label>
              <Input className="h-8 text-xs" value={data.numDesenho ?? ''} onChange={e => onChange('numDesenho', e.target.value || null)} disabled={!canEdit} placeholder="ex: 777_26" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Norma</Label>
              {sel(data.norma, v => onChange('norma', v || null), 'Selecione', NORMAS.map(n => ({ value: n, label: n })), !canEdit)}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Dimensões (mm)</Label>
              <Input className="h-8 text-xs" value={data.dimensoes ?? ''} onChange={e => onChange('dimensoes', e.target.value || null)} disabled={!canEdit} placeholder="ex: 9,0mm" />
            </div>
          </div>

          {/* Campos específicos de punções */}
          {isPunch && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Especificações do Punção</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Carga real (KN)</Label>
                    {num(data.cargaRealKN, v => onChange('cargaRealKN', v), 'ex: 31.275', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qtd. Pontas</Label>
                    {num(data.qtdPontas, v => onChange('qtdPontas', v ? Math.round(v) : null), '1', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Fixação</Label>
                    {sel(data.tipoFixacao, v => onChange('tipoFixacao', v || null), 'Selecione', OPCOES_FIXACAO.map(o => ({ value: o, label: o })), !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rebaixo Retentor de Óleo</Label>
                    {boolSel(data.rebaixoRetentorOleo, v => onChange('rebaixoRetentorOleo', v), !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contém Chaveta</Label>
                    {boolSel(data.contemChaveta, v => onChange('contemChaveta', v), !canEdit)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Formato do Comprimido (Tabela A)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Formato</Label>
                    {sel(data.formatoComprimido, v => onChange('formatoComprimido', v || null), 'Selecione o formato', TABLET_FORMATS, !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prof. Cavidade (mm)</Label>
                    {num(data.profundidadeCavMm, v => onChange('profundidadeCavMm', v), 'ex: 0.88', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Raio R1</Label>
                    {num(data.raioR1, v => onChange('raioR1', v), 'ex: 12', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Raio R2</Label>
                    {num(data.raioR2, v => onChange('raioR2', v), '—', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Raio R3</Label>
                    {num(data.raioR3, v => onChange('raioR3', v), '—', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Espessura Borda / Land (mm)</Label>
                    {num(data.espessuraBorda, v => onChange('espessuraBorda', v), 'ex: 0.1', !canEdit)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vinco (Tabela B — Breaking Score)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Vinco</Label>
                    {sel(data.tipoVinco, v => onChange('tipoVinco', v || null), 'Selecione o tipo', BREAKING_SCORES, !canEdit)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Campos de matrizes */}
          {isMatrix && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Especificações da Matriz</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cônico ou Paralelo</Label>
                  {sel(data.conicoOuParalelo, v => onChange('conicoOuParalelo', v || null), 'Selecione', [{ value: 'Paralelo', label: 'Paralelo' }, { value: 'Cônico', label: 'Cônico' }], !canEdit)}
                </div>
              </div>
            </div>
          )}

          {/* Materiais — comum a todos */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Material e Acabamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Opção de Aço</Label>
                {sel(data.opcaoAco, v => onChange('opcaoAco', v || null), 'Selecione', OPCOES_ACO.map(o => ({ value: o, label: o })), !canEdit)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Revestimento</Label>
                {sel(data.opcaoRevestimento, v => onChange('opcaoRevestimento', v || null), 'Selecione', OPCOES_REVESTIMENTO.map(o => ({ value: o, label: o })), !canEdit)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tratamento</Label>
                <Input className="h-8 text-xs" value={data.opcaoTratamento ?? ''} onChange={e => onChange('opcaoTratamento', e.target.value || null)} disabled={!canEdit} placeholder="ex: Nitretação" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function ToolingSection({ setId, canEdit }: { setId: string; canEdit: boolean }) {
  const { t } = useLocale()
  const qc = useQueryClient()

  const { data: toolingComponents = [] } = useQuery<ToolingComponent[]>({
    queryKey: ['tooling-components', setId],
    queryFn: () => api.get(`/punch-sets/${setId}/tooling-components`).then(r => r.data),
    enabled: !!setId,
  })

  const [draft, setDraft] = useState<Record<ToolingComponentType, LocalComp>>({
    UPPER_PUNCH: {}, LOWER_PUNCH: {}, MATRIX: {}, SEGMENT: {},
  })

  const byType = Object.fromEntries(
    toolingComponents.map(c => [c.type, c])
  ) as Partial<Record<ToolingComponentType, ToolingComponent>>

  const getMerged = (type: ToolingComponentType): LocalComp => {
    const existing: LocalComp = byType[type] ? { ...(byType[type] as LocalComp) } : {}
    return { ...existing, ...draft[type] }
  }

  const setDraftField = (type: ToolingComponentType, field: keyof ToolingComponent, val: unknown) => {
    setDraft(prev => ({ ...prev, [type]: { ...prev[type], [field]: val } }))
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = TOOLING_TYPES.map(type => ({ type, ...getMerged(type) }))
      return api.put(`/punch-sets/${setId}/tooling-components`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tooling-components', setId] })
      setDraft({ UPPER_PUNCH: {}, LOWER_PUNCH: {}, MATRIX: {}, SEGMENT: {} })
      toast.success(t.tooling.saved)
    },
    onError: () => toast.error(t.tooling.saveError),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-base">{t.tooling.title}</h3>
          <span className="text-xs text-muted-foreground">Especificações do Ferramental</span>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.tooling.save}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {TOOLING_TYPES.map(type => (
          <ComponentCard
            key={type}
            type={type}
            data={getMerged(type)}
            onChange={(field, val) => setDraftField(type, field, val)}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  )
}
