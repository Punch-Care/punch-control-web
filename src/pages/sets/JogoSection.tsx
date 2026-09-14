import { useEffect, useState } from 'react'
import { Layers, Loader2, Save, Image, FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

const URL_FIELDS = [
  'fotoSuperiorUrl', 'fotoFrontalUrl', 'fotoLateralUrl',
  'desenhoPuncaoUrl', 'desenhoPontaUrl', 'desenhoMatrizUrl', 'desenhoGravacaoUrl',
] as const

type AttachmentMeta = { id: string; field: string; originalName: string; mimeType: string; size: number }

/** Miniatura de imagem anexada — o arquivo exige login, então vem como blob */
function AttachmentThumb({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let url: string | null = null
    api.get(`/attachments/${id}`, { responseType: 'blob' })
      .then(r => { url = URL.createObjectURL(r.data); setSrc(url) })
      .catch(() => setSrc(null))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  return src
    ? <img src={src} alt="" className="h-8 w-8 rounded object-cover border flex-shrink-0" />
    : <div className="h-8 w-8 rounded bg-muted flex-shrink-0" />
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

  const { data: anexos = [] } = useQuery<AttachmentMeta[]>({
    queryKey: ['set-attachments', set.id],
    queryFn: () => api.get(`/punch-sets/${set.id}/attachments`).then(r => r.data),
  })
  const [enviando, setEnviando] = useState<keyof JogoDraft | null>(null)

  // Envia o arquivo e já grava o anexo no jogo — não depende de clicar em Salvar
  const enviarArquivo = async (field: keyof JogoDraft, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error(j.fileLimits); return }
    setEnviando(field)
    try {
      const fd = new FormData()
      fd.append('field', field)
      fd.append('file', file)
      const { data } = await api.post<{ url: string }>(`/punch-sets/${set.id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await api.put(`/punch-sets/${set.id}`, { [field]: data.url })
      upd(field, data.url)
      qc.invalidateQueries({ queryKey: ['set-attachments', set.id] })
      qc.invalidateQueries({ queryKey: ['punch-set', set.id] })
      toast.success(j.uploaded)
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? j.uploadError)
    } finally {
      setEnviando(null)
    }
  }

  const removerArquivo = async (field: keyof JogoDraft) => {
    try {
      await api.put(`/punch-sets/${set.id}`, { [field]: null })
      upd(field, '')
      qc.invalidateQueries({ queryKey: ['set-attachments', set.id] })
      qc.invalidateQueries({ queryKey: ['punch-set', set.id] })
      toast.success(j.fileRemoved)
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? j.saveError)
    }
  }

  // O arquivo exige login: baixa com o token e abre a cópia local numa aba nova
  const abrirArquivo = async (id: string) => {
    const aba = window.open('', '_blank')
    try {
      const { data, headers } = await api.get(`/attachments/${id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: String(headers['content-type'] ?? '') }))
      if (aba) aba.location.href = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      aba?.close()
      toast.error(j.openError)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/punch-sets/${set.id}`, {
        statusJogo: draft.statusJogo,
        dataUltimaLimpeza: fromDateInput(draft.dataUltimaLimpeza),
        dataUltimoPolimento: fromDateInput(draft.dataUltimoPolimento),
        ...Object.fromEntries(URL_FIELDS.map(f => [f, draft[f] && !draft[f].startsWith('mock://') ? draft[f] : null])),
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
    const isLegacyMock = val.startsWith('mock://')
    const attachmentId = val.startsWith('attachment://') ? val.slice('attachment://'.length) : null
    const meta = attachmentId ? anexos.find(a => a.id === attachmentId) : undefined
    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1.5">{icon}{label}</Label>
        {attachmentId ? (
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            {meta?.mimeType.startsWith('image/') && <AttachmentThumb id={attachmentId} />}
            <span className="text-xs truncate flex-1" title={meta?.originalName}>{meta?.originalName ?? '…'}</span>
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => abrirArquivo(attachmentId)}>{j.open}</Button>
            {canEdit && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={j.removeFile} onClick={() => removerArquivo(field)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-xs"
              placeholder="https://..."
              value={isLegacyMock ? '' : val}
              onChange={e => upd(field, e.target.value)}
              disabled={!canEdit}
            />
            {canEdit && (
              <label className="inline-flex" title={`${j.upload} · ${j.fileLimits}`}>
                <input
                  type="file"
                  accept="image/*,application/pdf,.dwg,.dxf"
                  className="hidden"
                  disabled={enviando !== null}
                  onChange={e => { const f = e.target.files?.[0]; if (f) enviarArquivo(field, f); e.target.value = '' }}
                />
                <span className="inline-flex items-center justify-center h-8 px-2 rounded-md border text-xs cursor-pointer hover:bg-muted">
                  {enviando === field ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </span>
              </label>
            )}
            {val && !isLegacyMock && (
              <a href={val} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm" className="h-8">{j.open}</Button>
              </a>
            )}
          </div>
        )}
        {isLegacyMock && <p className="text-[10px] text-amber-600">{j.legacyMock}</p>}
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
