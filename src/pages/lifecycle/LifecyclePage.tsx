import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowRight, Activity, Plus, Trash2, Loader2,
  Package, Settings, AlertTriangle, TrendingDown,
} from 'lucide-react'

import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { PunchSet, SetStatus, LifecycleData, ComponentInventoryType } from '@/types'
import { toast } from 'sonner'

const STATUS_VARIANTS: Record<SetStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  IN_REPAIR: 'warning',
  INACTIVE: 'secondary',
  DISCARDED: 'destructive',
}

const STATUS_COLORS: Record<SetStatus, string> = {
  ACTIVE: 'bg-green-500',
  IN_REPAIR: 'bg-yellow-500',
  INACTIVE: 'bg-gray-400',
  DISCARDED: 'bg-red-500',
}

const COMPONENT_LABELS: Record<ComponentInventoryType, string> = {
  P_SUPERIOR: 'Punção Superior',
  P_INFERIOR: 'Punção Inferior',
  MATRIZ_1: 'Matriz 1',
  MATRIZ_2: 'Matriz 2',
}

const COMPONENT_TYPES: ComponentInventoryType[] = ['P_SUPERIOR', 'P_INFERIOR', 'MATRIZ_1', 'MATRIZ_2']

function StatusFlow({ sets, statusLabels }: { sets: PunchSet[]; statusLabels: Record<SetStatus, string> }) {
  const stages: SetStatus[] = ['ACTIVE', 'IN_REPAIR', 'INACTIVE', 'DISCARDED']
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((s, i) => {
        const count = sets.filter(ps => ps.status === s).length
        return (
          <div key={s} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium">
              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
              {statusLabels[s]}
              <span className="font-bold ml-0.5">{count}</span>
            </div>
            {i < stages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Barra de vida útil ────────────────────────────────────────────────────────

function LifeBar({ value }: { value: number }) {
  const color = value >= 100 ? 'bg-red-500' : value >= 70 ? 'bg-orange-500' : value >= 40 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">% Acumulado</span>
        <span className={`font-bold ${value >= 100 ? 'text-red-600' : ''}`}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

export function LifecyclePage() {
  const [searchParams] = useSearchParams()
  const [selectedSetId, setSelectedSetId] = useState<string>(() => searchParams.get('setId') ?? '')
  const [addProdOpen, setAddProdOpen] = useState(false)
  const [addMaintOpen, setAddMaintOpen] = useState(false)
  const [editConfig, setEditConfig] = useState(false)

  // Form states
  const [prodForm, setProdForm] = useState({ produto: '', data: format(new Date(), 'yyyy-MM-dd'), maquina: '', numLote: '', qtdKg: '' })
  const [maintForm, setMaintForm] = useState({ data: format(new Date(), 'yyyy-MM-dd'), componente: 'P_SUPERIOR' as ComponentInventoryType, quantidade: '', notas: '' })
  const [configForm, setConfigForm] = useState({ fatorDepreciacao: '0.00015', pesoMedioPadrao: '' })
  const [inventory, setInventory] = useState<Record<ComponentInventoryType, { qtdAdquirida: string; qtdUtilizada: string; pontoEncomenda: string }>>({
    P_SUPERIOR: { qtdAdquirida: '0', qtdUtilizada: '0', pontoEncomenda: '' },
    P_INFERIOR: { qtdAdquirida: '0', qtdUtilizada: '0', pontoEncomenda: '' },
    MATRIZ_1: { qtdAdquirida: '0', qtdUtilizada: '0', pontoEncomenda: '' },
    MATRIZ_2: { qtdAdquirida: '0', qtdUtilizada: '0', pontoEncomenda: '' },
  })

  const { t } = useLocale()
  const { companyId: adminCompanyId } = useAdminCompany()
  const qc = useQueryClient()

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })

  const { data: lifecycleData, isLoading: lcLoading } = useQuery<LifecycleData>({
    queryKey: ['lifecycle', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/lifecycle`).then(r => r.data as LifecycleData),
    enabled: !!selectedSetId,
  })

  useEffect(() => {
    if (!lifecycleData) return
    if (lifecycleData.config) {
      setConfigForm({
        fatorDepreciacao: lifecycleData.config.fatorDepreciacao.toString(),
        pesoMedioPadrao: lifecycleData.config.pesoMedioPadrao?.toString() ?? '',
      })
    }
    if (lifecycleData.inventory.length > 0) {
      setInventory(prev => {
        const inv = { ...prev }
        for (const item of lifecycleData.inventory) {
          const k = item.tipo as ComponentInventoryType
          inv[k] = { qtdAdquirida: item.qtdAdquirida.toString(), qtdUtilizada: item.qtdUtilizada.toString(), pontoEncomenda: item.pontoEncomenda?.toString() ?? '' }
        }
        return inv
      })
    }
  }, [lifecycleData])

  const selectedSet = sets.find(s => s.id === selectedSetId)

  // Mutations
  const saveConfigMutation = useMutation({
    mutationFn: () => api.put(`/punch-sets/${selectedSetId}/lifecycle/config`, {
      fatorDepreciacao: parseFloat(configForm.fatorDepreciacao),
      pesoMedioPadrao: configForm.pesoMedioPadrao ? parseFloat(configForm.pesoMedioPadrao) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] }); setEditConfig(false); toast.success('Configuração salva') },
    onError: () => toast.error('Erro ao salvar configuração'),
  })

  const saveInventoryMutation = useMutation({
    mutationFn: () => api.put(`/punch-sets/${selectedSetId}/lifecycle/inventory`,
      COMPONENT_TYPES.map(tipo => ({
        tipo,
        qtdAdquirida: parseInt(inventory[tipo].qtdAdquirida) || 0,
        qtdUtilizada: parseInt(inventory[tipo].qtdUtilizada) || 0,
        pontoEncomenda: inventory[tipo].pontoEncomenda ? parseInt(inventory[tipo].pontoEncomenda) : null,
      }))
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] }); toast.success('Estoque salvo') },
    onError: () => toast.error('Erro ao salvar estoque'),
  })

  const addProdMutation = useMutation({
    mutationFn: () => api.post(`/punch-sets/${selectedSetId}/lifecycle/production`, {
      produto: prodForm.produto,
      data: prodForm.data,
      maquina: prodForm.maquina || null,
      numLote: prodForm.numLote,
      qtdKg: parseFloat(prodForm.qtdKg),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] })
      qc.invalidateQueries({ queryKey: ['punch-sets', adminCompanyId] })
      setAddProdOpen(false)
      setProdForm({ produto: selectedSet?.name ?? '', data: format(new Date(), 'yyyy-MM-dd'), maquina: '', numLote: '', qtdKg: '' })
      toast.success('Lote registrado')
    },
    onError: () => toast.error('Erro ao registrar lote'),
  })

  const deleteProdMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/punch-sets/${selectedSetId}/lifecycle/production/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] }); toast.success('Lote removido') },
    onError: () => toast.error('Erro ao remover lote'),
  })

  const addMaintMutation = useMutation({
    mutationFn: () => api.post(`/punch-sets/${selectedSetId}/lifecycle/maintenance`, {
      data: maintForm.data,
      componente: maintForm.componente,
      quantidade: parseInt(maintForm.quantidade),
      notas: maintForm.notas || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] })
      setAddMaintOpen(false)
      setMaintForm({ data: format(new Date(), 'yyyy-MM-dd'), componente: 'P_SUPERIOR', quantidade: '', notas: '' })
      toast.success('Manutenção registrada')
    },
    onError: () => toast.error('Erro ao registrar manutenção'),
  })

  const deleteMaintMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/punch-sets/${selectedSetId}/lifecycle/maintenance/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle', selectedSetId] }); toast.success('Registro removido') },
    onError: () => toast.error('Erro ao remover registro'),
  })

  const percAcumulado = lifecycleData?.percAcumulado ?? 0
  const fator = parseFloat(configForm.fatorDepreciacao) || 0.00015

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t.lifecycle.title}</h2>
        <p className="text-muted-foreground text-sm mt-0.5">{t.lifecycle.subtitle}</p>
      </div>

      {/* Distribuição por status */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">{t.lifecycle.statusDistribution}</CardTitle></CardHeader>
        <CardContent><StatusFlow sets={sets} statusLabels={t.status} /></CardContent>
      </Card>

      {/* Seletor de conjunto */}
      <div className="space-y-1.5 max-w-sm">
        <Label>{t.lifecycle.selectSet}</Label>
        <Select value={selectedSetId || '__none__'} onValueChange={v => setSelectedSetId(v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder={t.lifecycle.selectSetPlaceholder} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" disabled>Selecione...</SelectItem>
            {sets.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <span className="font-mono">{s.code}</span> — {s.name}
                <Badge variant={STATUS_VARIANTS[s.status]} className="ml-2 text-xs">{t.status[s.status]}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSetId && (
        <p className="text-sm text-muted-foreground text-center py-8">{t.lifecycle.selectSetToView}</p>
      )}

      {selectedSetId && lcLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t.common.loading}
        </div>
      )}

      {selectedSetId && !lcLoading && lifecycleData && (
        <div className="space-y-6">
          {/* Cabeçalho do conjunto */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-bold">{selectedSet?.code}</p>
                    <Badge variant={STATUS_VARIANTS[selectedSet?.status ?? 'ACTIVE']}>{t.status[selectedSet?.status ?? 'ACTIVE']}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-0.5">{selectedSet?.name}</p>
                </div>
                <div className="min-w-[200px]">
                  <LifeBar value={percAcumulado} />
                  {percAcumulado >= 100 && (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Fim de vida atingido
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração de depreciação */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Configuração de Depreciação</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditConfig(!editConfig)}>
                {editConfig ? 'Cancelar' : 'Editar'}
              </Button>
            </div>
            <Card>
              <CardContent className="p-4">
                {editConfig ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Fator de Depreciação (% por kg)</Label>
                      <Input className="h-8 text-xs" value={configForm.fatorDepreciacao} onChange={e => setConfigForm(f => ({ ...f, fatorDepreciacao: e.target.value }))} placeholder="0.00015" />
                      <p className="text-xs text-muted-foreground">Padrão: 0,00015 / kg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Peso Médio Padrão (g)</Label>
                      <Input className="h-8 text-xs" type="number" step="0.001" value={configForm.pesoMedioPadrao} onChange={e => setConfigForm(f => ({ ...f, pesoMedioPadrao: e.target.value }))} placeholder="ex: 0.500" />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={() => saveConfigMutation.mutate()} disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Fator de Depreciação</p>
                      <p className="font-medium">{fator.toFixed(5)} / kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Peso Médio Padrão</p>
                      <p className="font-medium">{lifecycleData.config?.pesoMedioPadrao ? `${lifecycleData.config.pesoMedioPadrao}g` : '—'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Estoque de componentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Estoque de Ferramental</h3>
              </div>
              <Button size="sm" onClick={() => saveInventoryMutation.mutate()} disabled={saveInventoryMutation.isPending}>
                {saveInventoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Estoque
              </Button>
            </div>
            <div className="rounded-xl border overflow-x-auto bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Componente</TableHead>
                    <TableHead className="text-center">Adquirida</TableHead>
                    <TableHead className="text-center">Utilizada</TableHead>
                    <TableHead className="text-center">Sobra</TableHead>
                    <TableHead className="text-center">Ponto de Encomenda</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPONENT_TYPES.map(tipo => {
                    const adq = parseInt(inventory[tipo].qtdAdquirida) || 0
                    const util = parseInt(inventory[tipo].qtdUtilizada) || 0
                    const sobra = adq - util
                    const pe = inventory[tipo].pontoEncomenda ? parseInt(inventory[tipo].pontoEncomenda) : null
                    const alerta = pe !== null && sobra <= pe
                    return (
                      <TableRow key={tipo} className={alerta ? 'bg-orange-50' : ''}>
                        <TableCell className="font-medium text-sm">{COMPONENT_LABELS[tipo]}</TableCell>
                        <TableCell className="text-center">
                          <Input type="number" className="h-7 text-xs text-center w-20 mx-auto" value={inventory[tipo].qtdAdquirida} onChange={e => setInventory(prev => ({ ...prev, [tipo]: { ...prev[tipo], qtdAdquirida: e.target.value } }))} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input type="number" className="h-7 text-xs text-center w-20 mx-auto" value={inventory[tipo].qtdUtilizada} onChange={e => setInventory(prev => ({ ...prev, [tipo]: { ...prev[tipo], qtdUtilizada: e.target.value } }))} />
                        </TableCell>
                        <TableCell className={`text-center font-bold text-sm ${sobra <= 0 ? 'text-red-600' : ''}`}>{sobra}</TableCell>
                        <TableCell className="text-center">
                          <Input type="number" className="h-7 text-xs text-center w-20 mx-auto" value={inventory[tipo].pontoEncomenda} onChange={e => setInventory(prev => ({ ...prev, [tipo]: { ...prev[tipo], pontoEncomenda: e.target.value } }))} placeholder="—" />
                        </TableCell>
                        <TableCell className="text-center">
                          {alerta ? (
                            <Badge variant="destructive" className="text-xs">Repor</Badge>
                          ) : (
                            <Badge variant="success" className="text-xs">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Registro de produção */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Registro de Produção</h3>
                <span className="text-xs text-muted-foreground">({lifecycleData.production.length} lotes)</span>
              </div>
              <Button size="sm" onClick={() => { setProdForm(f => ({ ...f, produto: selectedSet?.name ?? '' })); setAddProdOpen(true) }}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Lote
              </Button>
            </div>
            <div className="rounded-xl border overflow-x-auto bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Produto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Nº Lote</TableHead>
                    <TableHead className="text-right">Qtd. kg</TableHead>
                    <TableHead className="text-right">% Lote</TableHead>
                    <TableHead className="text-right">% Acum.</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lifecycleData.production.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Nenhum lote registrado</TableCell></TableRow>
                  ) : lifecycleData.production.map((r, i) => (
                    <TableRow key={r.id} className={r.percAcumulado >= 100 ? 'bg-red-50' : i % 2 ? 'bg-muted/20' : ''}>
                      <TableCell className="text-sm">{r.produto}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(r.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.maquina ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{r.numLote}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{r.qtdKg.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{r.percUtilizacao.toFixed(2)}%</TableCell>
                      <TableCell className={`text-right font-bold text-sm tabular-nums ${r.percAcumulado >= 100 ? 'text-red-600' : r.percAcumulado >= 70 ? 'text-orange-600' : ''}`}>
                        {r.percAcumulado.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={deleteProdMutation.isPending} onClick={() => deleteProdMutation.mutate(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Registro de manutenção */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Manutenção / Substituição de Componentes</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddMaintOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Registrar
              </Button>
            </div>
            <div className="rounded-xl border overflow-x-auto bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Data</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lifecycleData.maintenance.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Nenhum registro de manutenção</TableCell></TableRow>
                  ) : lifecycleData.maintenance.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-sm font-medium">{COMPONENT_LABELS[r.componente]}</TableCell>
                      <TableCell className={`text-center font-bold text-sm ${r.quantidade < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {r.quantidade > 0 ? `+${r.quantidade}` : r.quantidade}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.notas ?? '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={deleteMaintMutation.isPending} onClick={() => deleteMaintMutation.mutate(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Adicionar lote de produção */}
      <Dialog open={addProdOpen} onOpenChange={setAddProdOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Lote de Produção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Produto</Label>
              <Input className="h-8 text-sm" value={prodForm.produto} onChange={e => setProdForm(f => ({ ...f, produto: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input type="date" className="h-8 text-sm" value={prodForm.data} onChange={e => setProdForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qtd. kg produzidos</Label>
                <Input type="number" step="0.1" className="h-8 text-sm" value={prodForm.qtdKg} onChange={e => setProdForm(f => ({ ...f, qtdKg: e.target.value }))} placeholder="ex: 450" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Máquina</Label>
                <Input className="h-8 text-sm" value={prodForm.maquina} onChange={e => setProdForm(f => ({ ...f, maquina: e.target.value }))} placeholder="ex: MK IV" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº do Lote</Label>
                <Input className="h-8 text-sm" value={prodForm.numLote} onChange={e => setProdForm(f => ({ ...f, numLote: e.target.value }))} placeholder="ex: Z0032" />
              </div>
            </div>
            {prodForm.qtdKg && (
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                <span className="text-muted-foreground">% utilização estimada: </span>
                <span className="font-semibold">{(parseFloat(prodForm.qtdKg) * fator * 100).toFixed(2)}%</span>
              </div>
            )}
            <Button className="w-full" disabled={addProdMutation.isPending || !prodForm.produto || !prodForm.numLote || !prodForm.qtdKg} onClick={() => addProdMutation.mutate()}>
              {addProdMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Lote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar manutenção */}
      <Dialog open={addMaintOpen} onOpenChange={setAddMaintOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" className="h-8 text-sm" value={maintForm.data} onChange={e => setMaintForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Componente</Label>
              <Select value={maintForm.componente} onValueChange={v => setMaintForm(f => ({ ...f, componente: v as ComponentInventoryType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade (negativo = retirada)</Label>
              <Input type="number" className="h-8 text-sm" value={maintForm.quantidade} onChange={e => setMaintForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="ex: 5 ou -3" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Input className="h-8 text-sm" value={maintForm.notas} onChange={e => setMaintForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
            <Button className="w-full" disabled={addMaintMutation.isPending || !maintForm.quantidade} onClick={() => addMaintMutation.mutate()}>
              {addMaintMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
