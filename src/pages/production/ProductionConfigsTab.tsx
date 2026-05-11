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
import type { ProductionConfig, Product, Machine } from '@/types'

interface ParamRow {
  ordem: number
  nome: string
  unidade: string
  minimo: string
  maximo: string
  sugerido: string
}

const DEFAULT_PARAMS: ParamRow[] = [
  { ordem: 1,  nome: 'Velocidade da Máquina',              unidade: 'Un/Min', minimo: '', maximo: '', sugerido: '' },
  { ordem: 2,  nome: 'Vel. Distribuidor Direito',           unidade: 'traços', minimo: '', maximo: '', sugerido: '' },
  { ordem: 3,  nome: 'Vel. Distribuidor Esquerdo',          unidade: 'traços', minimo: '', maximo: '', sugerido: '' },
  { ordem: 4,  nome: 'Manopla Compressão Princ. Direito',   unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 5,  nome: 'Manopla Compressão Princ. Esquerdo',  unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 6,  nome: 'Manopla Pré-Compressão Sup. Direito', unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 7,  nome: 'Manopla Pré-Compressão Sup. Esquerdo',unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 8,  nome: 'Rolo Pré-Compressão Inf. Direito',    unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 9,  nome: 'Rolo Pré-Compressão Inf. Esquerdo',   unidade: 'mm',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 10, nome: 'Limite Força Compressão Principal',   unidade: 'KN',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 11, nome: 'Força Pré-Compressão Dir. (Lado 1)',  unidade: 'KN',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 12, nome: 'Força Pré-Compressão Esq. (Lado 2)',  unidade: 'KN',     minimo: '', maximo: '', sugerido: '' },
  { ordem: 13, nome: 'Posição do Funil',                    unidade: '—',      minimo: '', maximo: '', sugerido: '' },
  { ordem: 14, nome: 'Came de Enchimento',                  unidade: '—',      minimo: '', maximo: '', sugerido: '' },
  { ordem: 15, nome: 'Código do Jogo de Punções',           unidade: '—',      minimo: '', maximo: '', sugerido: '' },
]

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
    params: params.map(row => ({
      ordem: row.ordem,
      nome: row.nome,
      unidade: row.unidade || null,
      minimo: parseNum(row.minimo),
      maximo: parseNum(row.maximo),
      sugerido: parseNum(row.sugerido),
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
    })))
  }

  const updateParam = (idx: number, field: keyof ParamRow, value: string) => {
    setParams(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const addParam = () => {
    setParams(prev => [...prev, { ordem: prev.length + 1, nome: '', unidade: '', minimo: '', maximo: '', sugerido: '' }])
  }

  const removeParam = (idx: number) => {
    setParams(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, ordem: i + 1 })))
  }

  const ConfigForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {!isEdit && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Produto *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">{p.paramsFixos}</p>
          <Button type="button" size="sm" variant="outline" onClick={addParam}>
            <Plus className="h-3 w-3" /> {p.addParam}
          </Button>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Parâmetro</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                <TableHead className="w-20">Mín.</TableHead>
                <TableHead className="w-20">Máx.</TableHead>
                <TableHead className="w-20">Sugerido</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {params.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell><Input className="h-7 text-xs" value={row.nome} onChange={e => updateParam(idx, 'nome', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={row.unidade} onChange={e => updateParam(idx, 'unidade', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={row.minimo} onChange={e => updateParam(idx, 'minimo', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={row.maximo} onChange={e => updateParam(idx, 'maximo', e.target.value)} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={row.sugerido} onChange={e => updateParam(idx, 'sugerido', e.target.value)} /></TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeParam(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
