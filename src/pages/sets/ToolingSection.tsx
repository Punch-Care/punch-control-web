import { useState } from 'react'
import { Wrench, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { knToTf } from '@/lib/utils'
import type { ToolingComponent, ToolingComponentType } from '@/types'

// ── Tabela A — Formato do Comprimido (Nomenclatura de Formatos, Adamus) ────────
// Códigos conforme o PDF "Dimensões dos Comprimidos – Nomenclatura de Formatos".
// value = código técnico (TA_*), label = "Família · Descrição (código)".
export const TABLET_FORMATS = [
  // Oval (TA_OW)
  { value: 'TA_OW_P', label: 'Oval · Achatado, aresta reta (TA_OW_P)' },
  { value: 'TA_OW_PF', label: 'Oval · Achatado e chanfrado (TA_OW_PF)' },
  { value: 'TA_OW_PR', label: 'Oval · Achatado com um raio (TA_OW_PR)' },
  { value: 'TA_OW_PF_R', label: 'Oval · Com um raio e chanfrado (TA_OW_PF_R)' },
  { value: 'TA_OW_R', label: 'Oval · Biconvexo com um raio (TA_OW_R)' },
  { value: 'TA_OW_R2', label: 'Oval · Biconvexo com dois raios (TA_OW_R2)' },
  { value: 'TA_OW_R3', label: 'Oval · Biconvexo com três raios (TA_OW_R3)' },
  { value: 'TA_OW_R4', label: 'Oval · Biconvexo com quatro raios (TA_OW_R4)' },
  { value: 'TA_OW_R5', label: 'Oval · Biconvexo (variante cinco raios) (TA_OW_R5)' },
  // Redondo (TA_FI)
  { value: 'TA_FI_P', label: 'Redondo · Achatado, aresta reta (TA_FI_P)' },
  { value: 'TA_FI_PF', label: 'Redondo · Achatado e chanfrado (TA_FI_PF)' },
  { value: 'TA_FI_PR', label: 'Redondo · Achatado com um raio (TA_FI_PR)' },
  { value: 'TA_FI_PF_R', label: 'Redondo · Com um raio e chanfrado (TA_FI_PF_R)' },
  { value: 'TA_FI_R', label: 'Redondo · Biconvexo com um raio (TA_FI_R)' },
  { value: 'TA_FI_RR', label: 'Redondo · Biconvexo com dois raios (TA_FI_RR)' },
  // Oblongo / Caplet (TA_OB)
  { value: 'TA_OB_P', label: 'Oblongo · Achatado, aresta reta (TA_OB_P)' },
  { value: 'TA_OB_PF', label: 'Oblongo · Achatado e chanfrado (TA_OB_PF)' },
  { value: 'TA_OB_PR', label: 'Oblongo · Achatado com um raio (TA_OB_PR)' },
  { value: 'TA_OB_PF_R', label: 'Oblongo · Com um raio e chanfrado (TA_OB_PF_R)' },
  { value: 'TA_OB_R', label: 'Oblongo · Biconvexo com um raio (TA_OB_R)' },
  { value: 'TA_OB_R2', label: 'Oblongo · Biconvexo com dois raios (TA_OB_R2)' },
  { value: 'TA_OB_R3', label: 'Oblongo · Biconvexo com três raios (TA_OB_R3)' },
  { value: 'TA_OB_R4', label: 'Oblongo · Biconvexo com quatro raios (TA_OB_R4)' },
  // Escape
  { value: 'OUTRO', label: 'Outro (descrever no formato especial)' },
]

// Opções de "Característica do produto" (RFQ) — Característica principal + até 6.
export const CARACTERISTICAS_PRODUTO = [
  'Normal', 'Abrasivo', 'Aderente', 'Corrosivo', 'Oxidante', 'Carga elevada',
]

// Nº de raios da cavidade por formato (Tabela A) — define quantas caixas Rn aparecem.
export const RADII_BY_FORMAT: Record<string, number> = {
  TA_OW_P: 0, TA_OW_PF: 0, TA_OW_PR: 1, TA_OW_PF_R: 1, TA_OW_R: 1, TA_OW_R2: 2, TA_OW_R3: 3, TA_OW_R4: 4, TA_OW_R5: 5,
  TA_FI_P: 0, TA_FI_PF: 0, TA_FI_PR: 1, TA_FI_PF_R: 1, TA_FI_R: 1, TA_FI_RR: 2,
  TA_OB_P: 0, TA_OB_PF: 0, TA_OB_PR: 1, TA_OB_PF_R: 1, TA_OB_R: 1, TA_OB_R2: 2, TA_OB_R3: 3, TA_OB_R4: 4,
  OUTRO: 5,
}
export const MAX_RADII = 5

// ── Tabela B — Tipo de Vinco (Breaking Score) ─────────────────────────────────
export const BREAKING_SCORES = [
  { value: '0', label: '0 - Sem vinco' },
  { value: 'A', label: 'A - Projetando-se pelo raio' },
  { value: 'B', label: 'B - Pelo raio' },
  { value: 'C', label: 'C - Desaparecendo pelo raio convexo' },
  { value: 'D', label: 'D - Desaparecendo pelo raio côncavo' },
  { value: 'E', label: 'E - Parcial pelo raio' },
  { value: 'F', label: 'F - Em toda reta' },
  { value: 'G', label: 'G - Em toda reta superficial' },
  { value: 'H', label: 'H - Ao longo de profunda reta' },
  { value: 'U', label: 'U - Em todo com ângulo duplo' },
]

export const CONFIG_VINCO = [
  'Vinco duplo cruzado', 'Um vinco', 'Dois vincos', 'Três vincos', 'Quatro vincos',
]

export const NORMAS = [
  'EUB 19mm x 133,6mm',
  'EU D 25,35 x 133,6mm',
  'TSM B 19mm x 133,350mm',
  'TSM D 25,35 x 133,350mm',
  'FETTE EU 1" 441',
  'PHARMA',
  '20/28',
  '25/32 GROOVE DIE',
  '25/32 SLOTTED DIE',
  'EUBBS',
  'FS 12',
  'Outra (descrever)',
]

export const OPCOES_FIXACAO = [
  'Monobloco "Monolito"',
  'Fixação por pino',
  'Fixação da tampa externa',
  'Fixação da tampa interna',
]

export const REBAIXO_TIPOS = [
  'Sem rebaixo de vedação',
  'Rebaixo de vedação universal',
  'Rebaixo de vedação tipo Fole',
  'Rebaixo de vedação combinado',
]

export const CONICO_MATRIZ = [
  'Paralelo',
  'Cônico de um lado',
  'Cônico dois lados',
]

export const ACO_PUNCOES = [
  '1.2550 (SIMILAR TO S1 BY AISI)',
  '1.2357 (S7)',
  '1.2363 (A2 BY AISI)',
  '1.2080 (D3 BY AISI)',
  '1.2379 (D2 BY AISI)',
  'K340',
  '1.4112 (440 B BY AISI)',
  '1.4125 (440 C BY AISI)',
  '1.4528 (N690)',
  '1.2358 60CrMoV18-5 (CALMAX)',
  'M340',
  '1.3343 (M2)',
  'LC200N',
  'US2000',
  'Punções com ponta de carboneto',
  'À definir',
]

export const ACO_MATRIZES = [
  '1.2080 (D3 BY AISI)',
  '1.2379 (D2 BY AISI)',
  'K340',
  '1.4112 (440 B BY AISI)',
  '1.4125 (440 C BY AISI)',
  'CPM-15V',
  'Matrizes de carboneto',
  'Matrizes inserto de carboneto',
  'Matrizes total carboneto',
  'Matrizes de cerâmica',
  'Matrizes inserto de cerâmica',
  'Matrizes total cerâmica',
  'À definir',
]

export const ACO_SEGMENTOS = [
  'Sleipner',
  'À definir',
]

export const OPCOES_REVESTIMENTO = [
  'Sem revestimento',
  'Adacon',
  'Cr = Implantação de cromo galvânico',
  'PVD - CrN',
  'Multi PVD CrN',
  'TiN/TiAl (Nitreto de titânio ou alumínio)',
  'DLC - Diamante como carbono',
  'Nitretação à plasma',
  'À definir',
]

export const OPCOES_TRATAMENTO = [
  'Tratamento térmico especial',
  'Nitretação à plasma',
  'À definir',
]

function acoOptions(type: ToolingComponentType): string[] {
  if (type === 'MATRIX') return ACO_MATRIZES
  if (type === 'SEGMENT') return ACO_SEGMENTOS
  return ACO_PUNCOES
}

const TOOLING_TYPES: ToolingComponentType[] = ['UPPER_PUNCH', 'LOWER_PUNCH', 'MATRIX', 'SEGMENT']

const TYPE_LABEL_KEY = {
  UPPER_PUNCH: 'upperPunches',
  LOWER_PUNCH: 'lowerPunches',
  MATRIX: 'matrices',
  SEGMENT: 'segments',
} as const

type LocalComp = Partial<ToolingComponent>

// Rótulo traduzido da opção; o valor gravado continua o original (dados existentes e RFQ)
type OptionLabels = Record<string, string>

function sel(value: string | null | undefined, onValueChange: (v: string) => void, placeholder: string, options: { value: string; label: string }[], disabled?: boolean, labels?: OptionLabels) {
  return (
    <Select value={value ?? '__none__'} onValueChange={v => onValueChange(v === '__none__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{labels?.[o.value] ?? o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function boolSel(value: boolean | null | undefined, onValueChange: (v: boolean | null) => void, disabled: boolean | undefined, yes: string, no: string) {
  const strVal = value === true ? 'sim' : value === false ? 'nao' : '__none__'
  return (
    <Select value={strVal} onValueChange={v => onValueChange(v === '__none__' ? null : v === 'sim')} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        <SelectItem value="sim">{yes}</SelectItem>
        <SelectItem value="nao">{no}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function num(value: number | null | undefined, onChange: (v: number | null) => void, placeholder = '—', disabled?: boolean) {
  return (
    <DecimalInput
      className="h-8 text-xs"
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

function txt(value: string | null | undefined, onChange: (v: string | null) => void, placeholder = '', disabled?: boolean) {
  return (
    <Input
      className="h-8 text-xs"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

function strOpts(arr: string[]) {
  return arr.map(o => ({ value: o, label: o }))
}

// Nº de caixas de raio a exibir: conforme o formato (Tabela A), sem esconder raios já preenchidos.
function radiiCount(format: string | null | undefined, data: LocalComp): number {
  const base = format
    ? (format in RADII_BY_FORMAT ? RADII_BY_FORMAT[format] : 0)
    : 2 // sem formato: mantém R1/R2 por padrão
  let filled = 0
  for (let n = 1; n <= MAX_RADII; n++) {
    if ((data as Record<string, unknown>)[`raioR${n}`] != null) filled = n
  }
  return Math.min(MAX_RADII, Math.max(base, filled))
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
  const cargaTf = knToTf(data.cargaRealKN)
  const { t } = useLocale()
  const tf = t.toolingForm
  const opt = t.toolingOptions as OptionLabels
  // Tabela B usa códigos de uma letra; as chaves traduzidas levam prefixo SCORE_
  const scoreLabels = Object.fromEntries(BREAKING_SCORES.map(b => [b.value, opt[`SCORE_${b.value}`] ?? b.label]))

  return (
    <div className="border rounded-xl overflow-hidden bg-background">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold">{tf[TYPE_LABEL_KEY[type]]}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{tf.qtyRequested}</Label>
              {num(data.qtdSolicitada, v => onChange('qtdSolicitada', v), 'ex: 84', !canEdit)}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tf.drawingNumber}</Label>
              <Input className="h-8 text-xs" value={data.numDesenho ?? ''} onChange={e => onChange('numDesenho', e.target.value || null)} disabled={!canEdit} placeholder="ex: 777_26" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{tf.standard}</Label>
              {sel(data.norma, v => onChange('norma', v || null), tf.select, strOpts(NORMAS), !canEdit, opt)}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{tf.dimensions}</Label>
              <Input className="h-8 text-xs" value={data.dimensoes ?? ''} onChange={e => onChange('dimensoes', e.target.value || null)} disabled={!canEdit} placeholder="ex: 9,0mm" />
            </div>
          </div>

          {/* Campos específicos de punções */}
          {isPunch && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.punchSpecs}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.realLoad}</Label>
                    {num(data.cargaRealKN, v => onChange('cargaRealKN', v), 'ex: 31.275', !canEdit)}
                    {cargaTf !== null && (data.cargaRealKN ?? 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground">≈ {cargaTf} tf</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.tipsQty}</Label>
                    {num(data.qtdPontas, v => onChange('qtdPontas', v ? Math.round(v) : null), '1', !canEdit)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.tipFixing}</Label>
                    {sel(data.tipoFixacao, v => onChange('tipoFixacao', v || null), tf.select, strOpts(OPCOES_FIXACAO), !canEdit, opt)}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{tf.oilSealRecess}</Label>
                    {sel(data.rebaixoVedacaoTipo, v => onChange('rebaixoVedacaoTipo', v || null), tf.select, strOpts(REBAIXO_TIPOS), !canEdit, opt)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.tabletShape}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{tf.shape}</Label>
                    {sel(data.formatoComprimido, v => onChange('formatoComprimido', v || null), tf.selectShape, TABLET_FORMATS, !canEdit, opt)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.cavityDepth}</Label>
                    {num(data.profundidadeCavMm, v => onChange('profundidadeCavMm', v), 'ex: 0.88', !canEdit)}
                  </div>
                  {Array.from({ length: radiiCount(data.formatoComprimido, data) }, (_, i) => i + 1).map(n => (
                    <div className="space-y-1" key={n}>
                      <Label className="text-xs">{tf.cavityRadius(n)}</Label>
                      {num(
                        data[`raioR${n}` as keyof ToolingComponent] as number | null | undefined,
                        v => onChange(`raioR${n}` as keyof ToolingComponent, v),
                        n === 1 ? 'ex: 12' : '—',
                        !canEdit,
                      )}
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.landThickness}</Label>
                    {num(data.espessuraBorda, v => onChange('espessuraBorda', v), 'ex: 0.1', !canEdit)}
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs">{tf.specialShapeDesc}</Label>
                    {txt(data.descricaoFormatoEspecial, v => onChange('descricaoFormatoEspecial', v), tf.freeText, !canEdit)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.key}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.hasKey}</Label>
                    {boolSel(data.contemChaveta, v => onChange('contemChaveta', v), !canEdit, tf.yes, tf.no)}
                  </div>
                  {data.contemChaveta === true && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">{tf.angle}</Label>
                        {num(data.chavetaAnguloGraus, v => onChange('chavetaAnguloGraus', v), 'ex: 30', !canEdit)}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tf.height}</Label>
                        {num(data.chavetaAlturaMm, v => onChange('chavetaAlturaMm', v), '—', !canEdit)}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tf.thickness}</Label>
                        {num(data.chavetaEspessuraMm, v => onChange('chavetaEspessuraMm', v), '—', !canEdit)}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tf.length}</Label>
                        {num(data.chavetaComprimentoMm, v => onChange('chavetaComprimentoMm', v), '—', !canEdit)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.scoreEmbossing}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.scoreType}</Label>
                    {sel(data.tipoVinco, v => onChange('tipoVinco', v || null), tf.selectType, BREAKING_SCORES, !canEdit, scoreLabels)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.scoreConfig}</Label>
                    {sel(data.configuracaoVinco, v => onChange('configuracaoVinco', v || null), tf.select, strOpts(CONFIG_VINCO), !canEdit, opt)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tf.tipEmbossing}</Label>
                    {txt(data.gravacaoPonta, v => onChange('gravacaoPonta', v), tf.freeText, !canEdit)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Campos de matrizes */}
          {isMatrix && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.matrixSpecs}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{tf.taperParallel}</Label>
                  {sel(data.conicoOuParalelo, v => onChange('conicoOuParalelo', v || null), tf.select, strOpts(CONICO_MATRIZ), !canEdit, opt)}
                </div>
              </div>
            </div>
          )}

          {/* Materiais — comum a todos */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tf.materialFinish}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{tf.steel}</Label>
                {sel(data.opcaoAco, v => onChange('opcaoAco', v || null), tf.select, strOpts(acoOptions(type)), !canEdit, opt)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tf.coating}</Label>
                {sel(data.opcaoRevestimento, v => onChange('opcaoRevestimento', v || null), tf.select, strOpts(OPCOES_REVESTIMENTO), !canEdit, opt)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tf.treatment}</Label>
                {sel(data.opcaoTratamento, v => onChange('opcaoTratamento', v || null), tf.select, strOpts(OPCOES_TRATAMENTO), !canEdit, opt)}
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
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.tooling.saveError),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-base">{t.tooling.title}</h3>
          <span className="text-xs text-muted-foreground">{t.toolingForm.subtitle}</span>
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
