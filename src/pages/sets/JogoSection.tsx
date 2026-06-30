import { useState } from 'react'
import { Layers, Loader2, Save, Image, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import type { PunchSet, JogoStatus } from '@/types'

const JOGO_STATUSES: JogoStatus[] = [
  'LIMPO', 'NAO_LIMPO', 'EM_MANUTENCAO', 'EM_POLIMENTO', 'EXCLUIDO', 'AGUARDANDO_DECISAO',
]

const STATUS_VARIANT: Record<JogoStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  LIMPO: 'success',
  NAO_LIMPO: 'warning',
  EM_MANUTENCAO: 'warning',
  EM_POLIMENTO: 'warning',
  EXCLUIDO: 'destructive',
  AGUARDANDO_DECISAO: 'secondary',
}

// Converte ISO → valor de <input type="date"> (yyyy-MM-dd)
function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}
// Converte yyyy-MM-dd → ISO datetime (ou null)
function fromDateInput(v: string): string | null {
  if (!v) return null
  return new Date(`${v}T00:00:00.000Z`).toISOString()
}

type JogoDraft = {
  statusJogo: JogoStatus
  dataUltimaLimpeza: string
  dataUltimoPolimento: string
  fotoSuperiorUrl: string
  fotoFrontalUrl: string
  fotoLateralUrl: string
  desenhoPuncaoUrl: string
  desenhoPontaUrl: string
  desenhoMatrizUrl: string
  desenhoGravacaoUrl: string
}

export function JogoSection({ set, canEdit }: { set: PunchSet; canEdit: boolean }) {
  const { t } = useLocale()
  const qc = useQueryClient()
  const j = t.jogo

  const [draft, setDraft] = useState<JogoDraft>({
    statusJogo: set.statusJogo,
    dataUltimaLimpeza: toDateInput(set.dataUltimaLimpeza),
    dataUltimoPolimento: toDateInput(set.dataUltimoPolimento),
    fotoSuperiorUrl: set.fotoSuperiorUrl ?? '',
    fotoFrontalUrl: set.fotoFrontalUrl ?? '',
    fotoLateralUrl: set.fotoLateralUrl ?? '',
    desenhoPuncaoUrl: set.desenhoPuncaoUrl ?? '',
    desenhoPontaUrl: set.desenhoPontaUrl ?? '',
    desenhoMatrizUrl: set.desenhoMatrizUrl ?? '',
    desenhoGravacaoUrl: set.desenhoGravacaoUrl ?? '',
  })

  const upd = (field: keyof JogoDraft, v: string) => setDraft(p => ({ ...p, [field]: v }))

  // ⚠️ MOCK de upload — substituir por integração AWS S3 no futuro.
  // No fluxo real: enviar o File para a API (ex: POST /uploads → S3), receber a URL
  // pública/assinada e gravar essa URL no campo correspondente.
  const mockUpload = (field: keyof JogoDraft, file: File) => {
    const fakeUrl = `mock://aws-s3/${set.id}/${encodeURIComponent(file.name)}`
    upd(field, fakeUrl)
    toast.info(j.uploadMock)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/punch-sets/${set.id}`, {
        statusJogo: draft.statusJogo,
        dataUltimaLimpeza: fromDateInput(draft.dataUltimaLimpeza),
        dataUltimoPolimento: fromDateInput(draft.dataUltimoPolimento),
        fotoSuperiorUrl: draft.fotoSuperiorUrl || null,
        fotoFrontalUrl: draft.fotoFrontalUrl || null,
        fotoLateralUrl: draft.fotoLateralUrl || null,
        desenhoPuncaoUrl: draft.desenhoPuncaoUrl || null,
        desenhoPontaUrl: draft.desenhoPontaUrl || null,
        desenhoMatrizUrl: draft.desenhoMatrizUrl || null,
        desenhoGravacaoUrl: draft.desenhoGravacaoUrl || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-set', set.id] })
      toast.success(j.saved)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? j.saveError),
  })

  const urlField = (label: string, field: keyof JogoDraft, icon: React.ReactNode) => {
    const val = draft[field]
    const isMock = val.startsWith('mock://')
    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1.5">{icon}{label}</Label>
        <div className="flex gap-1.5">
          <Input
            className="h-8 text-xs"
            placeholder="https://..."
            value={val}
            onChange={e => upd(field, e.target.value)}
            disabled={!canEdit}
          />
          {/* MOCK: botão de upload — futura integração AWS S3 */}
          {canEdit && (
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) mockUpload(field, f); e.target.value = '' }}
              />
              <span className="inline-flex items-center justify-center h-8 px-2 rounded-md border text-xs cursor-pointer hover:bg-muted" title={j.uploadMock}>
                <Upload className="h-3.5 w-3.5" />
              </span>
            </label>
          )}
          {val && !isMock && (
            <a href={val} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm" className="h-8">{j.open}</Button>
            </a>
          )}
        </div>
        {isMock && <p className="text-[10px] text-amber-600">{j.uploadMockBadge}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-base">{j.title}</h3>
          <Badge variant={STATUS_VARIANT[draft.statusJogo]}>{j.statuses[draft.statusJogo]}</Badge>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {j.save}
          </Button>
        )}
      </div>

      {/* Status + datas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{j.statusLabel}</Label>
          <Select value={draft.statusJogo} onValueChange={v => upd('statusJogo', v)} disabled={!canEdit}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOGO_STATUSES.map(s => <SelectItem key={s} value={s}>{j.statuses[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{j.dataUltimaLimpeza}</Label>
          <Input type="date" className="h-8 text-xs" value={draft.dataUltimaLimpeza} onChange={e => upd('dataUltimaLimpeza', e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{j.dataUltimoPolimento}</Label>
          <Input type="date" className="h-8 text-xs" value={draft.dataUltimoPolimento} onChange={e => upd('dataUltimoPolimento', e.target.value)} disabled={!canEdit} />
        </div>
      </div>

      {/* Fotos */}
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{j.fotosTitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {urlField(j.fotoSuperior, 'fotoSuperiorUrl', <Image className="h-3 w-3" />)}
          {urlField(j.fotoFrontal, 'fotoFrontalUrl', <Image className="h-3 w-3" />)}
          {urlField(j.fotoLateral, 'fotoLateralUrl', <Image className="h-3 w-3" />)}
        </div>
      </div>

      {/* Desenhos */}
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{j.desenhosTitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {urlField(j.desenhoPuncao, 'desenhoPuncaoUrl', <FileText className="h-3 w-3" />)}
          {urlField(j.desenhoPonta, 'desenhoPontaUrl', <FileText className="h-3 w-3" />)}
          {urlField(j.desenhoMatriz, 'desenhoMatrizUrl', <FileText className="h-3 w-3" />)}
          {urlField(j.desenhoGravacao, 'desenhoGravacaoUrl', <FileText className="h-3 w-3" />)}
        </div>
      </div>
    </div>
  )
}
