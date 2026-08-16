import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { ProductionConfig, Product, Machine, ParamSuggestionSource } from '@/types'

interface ParamRow {
  ordem: number
  nome: string
  unidade: string
  minimo: string
  maximo: string
  sugerido: string
  toleranciaPerc: string
  origemSugerido: ParamSuggestionSource
  fatorSugerido: string
}

// Parâmetros padrão da planilha MK IV (Punch Care).
//
// A planilha não digita mínimo e máximo: puxa a mediana do histórico de lotes
// como valor sugerido e abre uma faixa percentual em torno dele. É essa regra
// que fica registrada aqui — o `sugerido` serve só de ponto de partida enquanto
// não houver lotes concluídos para calcular a mediana.
const DEFAULT_PARAMS_MK_IV: ParamRow[] = [
  { ordem: 1,  nome: 'Código do Jogo de Punções',                       unidade: '—',      sugerido: '',       toleranciaPerc: '',   origemSugerido: 'MANUAL',    fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 2,  nome: 'Came de Enchimento',                              unidade: '—',      sugerido: '11.16',  toleranciaPerc: '',   origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 3,  nome: 'Vel. da Máquina (MK IV UN/MIN)',                  unidade: 'Un/Min', sugerido: '3500',   toleranciaPerc: '3',  origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 4,  nome: 'Velocidade do Distribuidor Direito (Em Traços)',  unidade: 'traços', sugerido: '33',     toleranciaPerc: '10', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 5,  nome: 'Velocidade do Distribuidor Esquerdo (Em Traços)', unidade: 'traços', sugerido: '33',     toleranciaPerc: '10', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 6,  nome: 'Manopla Compressão Princ. Dir. (Em mm)',          unidade: 'mm',     sugerido: '3',      toleranciaPerc: '30', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 7,  nome: 'Manopla Compressão Princ. Esq. (Em mm)',          unidade: 'mm',     sugerido: '3',      toleranciaPerc: '30', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 8,  nome: 'Manopla Pré-Compressão Sup. Dir. (Em mm)',        unidade: 'mm',     sugerido: '3',      toleranciaPerc: '30', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 9,  nome: 'Manopla Pré-Compressão Sup. Esq. (Em mm)',        unidade: 'mm',     sugerido: '3',      toleranciaPerc: '30', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 10, nome: 'Rolo Pré-Compressão Inf. Dir. (Em mm)',           unidade: 'mm',     sugerido: '7.2',    toleranciaPerc: '10', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 11, nome: 'Rolo Pré-Compressão Inf. Esq. (Em mm)',           unidade: 'mm',     sugerido: '7.2',    toleranciaPerc: '10', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 12, nome: 'Limite de Força de Compressão Principal (Em KN)', unidade: 'KN',     sugerido: '31.275', toleranciaPerc: '',   origemSugerido: 'MEDIA_CFC', fatorSugerido: '1.5', minimo: '', maximo: '' },
  { ordem: 13, nome: 'Força Pré-Compressão Dir. — Lado 1 (Em KN)',      unidade: 'KN',     sugerido: '1',      toleranciaPerc: '20', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 14, nome: 'Força Pré-Compressão Esq. — Lado 2 (Em KN)',      unidade: 'KN',     sugerido: '1',      toleranciaPerc: '20', origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
  { ordem: 15, nome: 'Posição do Funil',                               unidade: '—',      sugerido: '4',      toleranciaPerc: '5',  origemSugerido: 'MEDIANA',   fatorSugerido: '',    minimo: '', maximo: '' },
]

const ORIGEM_LABEL: Record<ParamSuggestionSource, string> = {
  MANUAL: 'Fixo',
  MEDIANA: 'Mediana do histórico',
  MEDIA_CFC: 'Média do CFC × fator',
}

/**
 * Aplica as tolerâncias do padrão MK IV às linhas cujo nome bate com o template.
 *
 * As configurações criadas antes desta versão têm mínimo e máximo digitados e
 * seguem em modo fixo. Em vez de reescrever esses dados por migração — sem
 * ninguém olhando —, a conversão fica aqui: quem edita a configuração vê o que
 * vai mudar e decide salvar ou não.
 */
function aplicarToleranciasPadrao(rows: ParamRow[]): { params: ParamRow[]; aplicados: number } {
  let aplicados = 0
  const params = rows.map(row => {
    const padrao = DEFAULT_PARAMS_MK_IV.find(d => d.nome === row.nome)
    if (!padrao || (!padrao.toleranciaPerc && padrao.origemSugerido === 'MANUAL')) return row
    aplicados += 1
    return {
      ...row,
      toleranciaPerc: padrao.toleranciaPerc,
      origemSugerido: padrao.origemSugerido,
      fatorSugerido: padrao.fatorSugerido,
      // O que estava digitado vira o valor de partida, usado enquanto não houver histórico
      sugerido: row.sugerido || padrao.sugerido,
      minimo: '',
      maximo: '',
    }
  })
  return { params, aplicados }
}

/** Reproduz na tela o que o servidor calcula, para o usuário ver a faixa antes de salvar */
function previewFaixa(row: ParamRow): string {
  const sugerido = parseNum(row.sugerido)
  const tol = parseNum(row.toleranciaPerc)
  if (sugerido === null || tol === null) {
    const min = parseNum(row.minimo)
    const max = parseNum(row.maximo)
    if (min === null && max === null) return '—'
    return `${min ?? '—'} … ${max ?? '—'}`
  }
  const round4 = (v: number) => Math.round(v * 10000) / 10000
  return `${round4(sugerido * (1 - tol / 100))} … ${round4(sugerido * (1 + tol / 100))}`
}

// Lista vazia para máquinas sem padrão CEP definido
const DEFAULT_PARAMS_EMPTY: ParamRow[] = []

// Template padrão a usar ao criar nova configuração
const DEFAULT_PARAMS = DEFAULT_PARAMS_MK_IV

function parseNum(v: string) {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

export function ProductionConfigsTab() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const p = t.production
  const { companyId: adminCompanyId } = useAdminCompany()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductionConfig | null>(null)
  const [params, setParams] = useState<ParamRow[]>(DEFAULT_PARAMS)
  const [productId, setProductId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [limiares, setLimiares] = useState({ limiteDifRolo: '0.5', limiteAmplitude: '1.0', limiteCoefVar: '10' })

  const { data: configs = [], isLoading } = useQuery<ProductionConfig[]>({
    queryKey: ['production-configs', adminCompanyId],
    queryFn: () => api.get('/production-configs', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', adminCompanyId],
    queryFn: () => api.get('/products', { params: { companyId: adminCompanyId } }).then(r => r.data),
    enabled: open,
  })

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines', adminCompanyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: adminCompanyId } }).then(r => r.data),
    enabled: open,
  })

  const buildPayload = () => ({
    productId,
    machineId,
    limiteDifRolo: parseNum(limiares.limiteDifRolo) ?? undefined,
    limiteAmplitude: parseNum(limiares.limiteAmplitude) ?? undefined,
    limiteCoefVar: parseNum(limiares.limiteCoefVar) ?? undefined,
    params: params.map(row => ({
      ordem: row.ordem,
      nome: row.nome,
      unidade: row.unidade || null,
      minimo: parseNum(row.minimo),
      maximo: parseNum(row.maximo),
      sugerido: parseNum(row.sugerido),
      toleranciaPerc: parseNum(row.toleranciaPerc),
      origemSugerido: row.origemSugerido,
      fatorSugerido: parseNum(row.fatorSugerido),
    })),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/production-configs', buildPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-configs'] }); setOpen(false); toast.success(p.configCreated) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? p.configCreateError),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/production-configs/${editing!.id}`, { params: buildPayload().params }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-configs'] }); setEditing(null); toast.success(p.configUpdated) },
    onError: () => toast.error(p.configUpdateError),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/production-configs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-configs'] }); toast.success(p.configDeleted) },
    onError: () => toast.error(t.common.noData),
  })

  const openCreate = () => {
    setParams(DEFAULT_PARAMS)
    setProductId('')
    setMachineId('')
    setLimiares({ limiteDifRolo: '0.5', limiteAmplitude: '1.0', limiteCoefVar: '10' })
    setOpen(true)
  }

  const openEdit = (config: ProductionConfig) => {
    setEditing(config)
    setParams(config.params.map(pr => ({
      ordem: pr.ordem,
      nome: pr.nome,
      unidade: pr.unidade ?? '',
      minimo: pr.minimo?.toString() ?? '',
      maximo: pr.maximo?.toString() ?? '',
      sugerido: pr.sugerido?.toString() ?? '',
      toleranciaPerc: pr.toleranciaPerc?.toString() ?? '',
      origemSugerido: pr.origemSugerido ?? 'MANUAL',
      fatorSugerido: pr.fatorSugerido?.toString() ?? '',
    })))
    setLimiares({
      limiteDifRolo: config.limiteDifRolo?.toString() ?? '0.5',
      limiteAmplitude: config.limiteAmplitude?.toString() ?? '1.0',
      limiteCoefVar: config.limiteCoefVar?.toString() ?? '10',
    })
  }

  const updateParam = (idx: number, field: keyof ParamRow, value: string) => {
    setParams(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  // A origem do sugerido é a única coluna que não é texto livre
  const updateOrigem = (idx: number, origem: ParamSuggestionSource) => {
    setParams(prev => prev.map((r, i) => i === idx ? { ...r, origemSugerido: origem } : r))
  }

  const addParam = () => {
    setParams(prev => [...prev, { ordem: prev.length + 1, nome: '', unidade: '', minimo: '', maximo: '', sugerido: '', toleranciaPerc: '', origemSugerido: 'MANUAL', fatorSugerido: '' }])
  }

  const removeParam = (idx: number) => {
    setParams(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, ordem: i + 1 })))
  }

  const ConfigForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {!isEdit && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>{products.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Seleção de template */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template de parâmetros</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setParams(DEFAULT_PARAMS_MK_IV)}
                className={`text-left p-3 rounded-lg border-2 text-sm transition-colors ${params.length > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <p className="font-medium">Padrão MK IV</p>
                <p className="text-xs text-muted-foreground mt-0.5">15 parâmetros da planilha CEP</p>
              </button>
              <button
                type="button"
                onClick={() => setParams(DEFAULT_PARAMS_EMPTY)}
                className={`text-left p-3 rounded-lg border-2 text-sm transition-colors ${params.length === 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <p className="font-medium">Sem parâmetros</p>
                <p className="text-xs text-muted-foreground mt-0.5">Máquina sem padrão CEP</p>
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">{p.paramsFixos}</p>
            {params.length === 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">Nenhum parâmetro — lotes serão registrados sem validação de limites</p>
            )}
          </div>
          <div className="flex gap-2">
            {params.some(r => !r.toleranciaPerc && DEFAULT_PARAMS_MK_IV.some(d => d.nome === r.nome && d.toleranciaPerc)) && (
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => {
                  const { params: novos, aplicados } = aplicarToleranciasPadrao(params)
                  setParams(novos)
                  toast.success(`Tolerância padrão aplicada a ${aplicados} parâmetro(s). Confira e salve.`)
                }}
              >
                Aplicar tolerâncias padrão
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={addParam}>
              <Plus className="h-3 w-3" /> {p.addParam}
            </Button>
          </div>
        </div>
        {params.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[190px]">Parâmetro</TableHead>
                  <TableHead className="w-16">Unid.</TableHead>
                  <TableHead className="w-40">Origem do sugerido</TableHead>
                  <TableHead className="w-20">Sugerido</TableHead>
                  <TableHead className="w-16">Tol. ±%</TableHead>
                  <TableHead className="w-32">Faixa resultante</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((row, idx) => {
                  // Ao editar, o servidor já devolveu o que o histórico diz
                  const salvo = editing?.params.find(pr => pr.nome === row.nome)
                  const usaTolerancia = parseNum(row.toleranciaPerc) !== null
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input className="h-7 text-xs" value={row.nome} onChange={e => updateParam(idx, 'nome', e.target.value)} />
                        {salvo && salvo.amostras > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Mediana de {salvo.amostras} lote(s): <span className="font-medium tabular-nums">{salvo.medianaHistorico ?? '—'}</span>
                          </p>
                        )}
                      </TableCell>
                      <TableCell><Input className="h-7 text-xs" value={row.unidade} onChange={e => updateParam(idx, 'unidade', e.target.value)} /></TableCell>
                      <TableCell>
                        <Select value={row.origemSugerido} onValueChange={v => updateOrigem(idx, v as ParamSuggestionSource)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ORIGEM_LABEL) as ParamSuggestionSource[]).map(o => (
                              <SelectItem key={o} value={o}>{ORIGEM_LABEL[o]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.origemSugerido === 'MEDIA_CFC' && (
                          <Input
                            className="h-7 text-xs mt-1"
                            placeholder="fator (ex: 1.5)"
                            value={row.fatorSugerido}
                            onChange={e => updateParam(idx, 'fatorSugerido', e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs tabular-nums"
                          value={row.sugerido}
                          onChange={e => updateParam(idx, 'sugerido', e.target.value)}
                          placeholder={row.origemSugerido === 'MANUAL' ? '' : 'partida'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs tabular-nums"
                          value={row.toleranciaPerc}
                          onChange={e => updateParam(idx, 'toleranciaPerc', e.target.value)}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {usaTolerancia ? (
                          previewFaixa(row)
                        ) : (
                          <div className="flex gap-1">
                            <Input className="h-7 text-xs w-16" value={row.minimo} onChange={e => updateParam(idx, 'minimo', e.target.value)} placeholder="mín" />
                            <Input className="h-7 text-xs w-16" value={row.maximo} onChange={e => updateParam(idx, 'maximo', e.target.value)} placeholder="máx" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeParam(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Limiares de alerta usados na aba CEP */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limiares de alerta do CEP</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Acima destes valores a leitura aparece destacada na aba CEP.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Dif. no rolo (mm)</Label>
            <Input className="h-7 text-xs tabular-nums" value={limiares.limiteDifRolo} onChange={e => setLimiares(l => ({ ...l, limiteDifRolo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amplitude dir./esq. (mm)</Label>
            <Input className="h-7 text-xs tabular-nums" value={limiares.limiteAmplitude} onChange={e => setLimiares(l => ({ ...l, limiteAmplitude: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Coef. de variação (%)</Label>
            <Input className="h-7 text-xs tabular-nums" value={limiares.limiteCoefVar} onChange={e => setLimiares(l => ({ ...l, limiteCoefVar: e.target.value }))} />
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={isEdit ? updateMutation.isPending : (createMutation.isPending || !productId || !machineId)}
        onClick={isEdit ? () => updateMutation.mutate() : () => createMutation.mutate()}
      >
        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.save}
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{p.configSubtitle}</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> {p.newConfig}</Button>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead>Parâmetros</TableHead>
              <TableHead>Lotes</TableHead>
              <TableHead className="w-20">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
            ) : configs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{p.noConfigs}</TableCell></TableRow>
            ) : configs.map(cfg => (
              <TableRow key={cfg.id}>
                <TableCell className="font-medium">{cfg.product.name}</TableCell>
                <TableCell>{cfg.machine.name}</TableCell>
                <TableCell className="text-muted-foreground">{cfg.params.length} parâmetros</TableCell>
                <TableCell className="text-muted-foreground">{cfg._count?.batches ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cfg)}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm('Remover configuração?')) deleteMutation.mutate(cfg.id) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{p.newConfig}</DialogTitle></DialogHeader>
          <ConfigForm isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{p.editConfig}</DialogTitle>
            {editing && <p className="text-sm text-muted-foreground">{editing.product.name} + {editing.machine.name}</p>}
          </DialogHeader>
          {editing && <ConfigForm isEdit={true} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
