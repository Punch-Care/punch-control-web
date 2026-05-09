import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, Loader2, Link2, Unlink, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import type { PunchSet, Punch, Product, SetStatus, ToolingComponent, ToolingComponentType } from '@/types'

const NORMAS_TOOLING = [
  'EUB', 'EUBB', 'EUBD', 'TSMB', 'TSMBB', 'TSMDB',
  'EUD', 'TSMD', 'EURO', "FETTE EU 1'441", 'PHARMA',
  '20/28', '25/32 GROOVE DIE', '25/32 SLOTTED DIE',
] as const

const TOOLING_TYPES: ToolingComponentType[] = ['UPPER_PUNCH', 'LOWER_PUNCH', 'MATRIX', 'SEGMENT']

const STATUS_VARIANTS: Record<SetStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  IN_REPAIR: 'warning',
  INACTIVE: 'secondary',
  DISCARDED: 'destructive',
}

export function SetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const canEdit = user?.role !== 'CLIENT'
  const [addOpen, setAddOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')

  const addPunchSchema = useMemo(
    () =>
      z.object({
        code: z.string().min(1, t.setDetail.codeRequired),
        type: z.enum(['upper', 'lower', 'matrix']),
        position: z.coerce.number().int().min(1, t.setDetail.positionRequired),
      }),
    [t],
  )

  type AddPunchData = z.infer<typeof addPunchSchema>

  const { data: set, isLoading: setLoading } = useQuery<PunchSet & { punches: Punch[] }>({
    queryKey: ['punch-set', id],
    queryFn: () => api.get(`/punch-sets/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: linkedProducts = [] } = useQuery<Product[]>({
    queryKey: ['punch-set-products', id],
    queryFn: () => api.get(`/punch-sets/${id}/products`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: toolingComponents = [] } = useQuery<ToolingComponent[]>({
    queryKey: ['tooling-components', id],
    queryFn: () => api.get(`/punch-sets/${id}/tooling-components`).then((r) => r.data),
    enabled: !!id,
  })

  const [toolingDraft, setToolingDraft] = useState<Record<ToolingComponentType, Partial<ToolingComponent>>>(() => {
    const init: Record<ToolingComponentType, Partial<ToolingComponent>> = {
      UPPER_PUNCH: {}, LOWER_PUNCH: {}, MATRIX: {}, SEGMENT: {},
    }
    return init
  })

  const toolingByType = useMemo(() => {
    const map: Record<ToolingComponentType, ToolingComponent | undefined> = {
      UPPER_PUNCH: undefined, LOWER_PUNCH: undefined, MATRIX: undefined, SEGMENT: undefined,
    }
    toolingComponents.forEach((c) => { map[c.type as ToolingComponentType] = c })
    return map
  }, [toolingComponents])

  const savingToolingMutation = useMutation({
    mutationFn: (components: Partial<ToolingComponent>[]) =>
      api.put(`/punch-sets/${id}/tooling-components`, components),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tooling-components', id] })
      toast.success(t.tooling.saved)
    },
    onError: () => toast.error(t.tooling.saveError),
  })

  const handleSaveTooling = () => {
    const payload = TOOLING_TYPES.map((type) => {
      const existing = toolingByType[type]
      const draft = toolingDraft[type]
      return {
        type,
        qtdSolicitada: draft.qtdSolicitada !== undefined ? draft.qtdSolicitada : (existing?.qtdSolicitada ?? null),
        numDesenho: draft.numDesenho !== undefined ? draft.numDesenho : (existing?.numDesenho ?? null),
        norma: draft.norma !== undefined ? draft.norma : (existing?.norma ?? null),
        dimensoes: draft.dimensoes !== undefined ? draft.dimensoes : (existing?.dimensoes ?? null),
      }
    })
    savingToolingMutation.mutate(payload)
  }

  const setToolingField = (type: ToolingComponentType, field: keyof ToolingComponent, value: string | number | null) => {
    setToolingDraft((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value || null } }))
  }

  const getToolingValue = (type: ToolingComponentType, field: keyof ToolingComponent): string => {
    const draft = toolingDraft[type]
    if (draft[field] !== undefined) return String(draft[field] ?? '')
    const existing = toolingByType[type]
    return String(existing?.[field] ?? '')
  }

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
    enabled: linkOpen,
  })

  const linkMutation = useMutation({
    mutationFn: (productId: string) => api.post(`/punch-sets/${id}/products`, { productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-set-products', id] })
      setLinkOpen(false)
      setSelectedProductId('')
      toast.success(t.products.linked)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.products.linkError),
  })

  const unlinkMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/punch-sets/${id}/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-set-products', id] })
      toast.success(t.products.unlinked)
    },
    onError: () => toast.error(t.products.unlinkError),
  })

  const addForm = useForm<AddPunchData>({
    resolver: zodResolver(addPunchSchema),
    defaultValues: { type: 'upper' },
  })

  const addMutation = useMutation({
    mutationFn: (data: AddPunchData) => api.post(`/punch-sets/${id}/punches`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-set', id] })
      setAddOpen(false)
      addForm.reset({ type: 'upper' })
      toast.success(t.setDetail.punchAdded)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.setDetail.punchAddError),
  })

  const removeMutation = useMutation({
    mutationFn: (punchId: string) => api.delete(`/punch-sets/${id}/punches/${punchId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-set', id] })
      toast.success(t.setDetail.punchRemoved)
    },
    onError: () => toast.error(t.setDetail.punchRemoveError),
  })

  if (setLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!set) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t.setDetail.notFound}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/sets')} className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t.common.back}
        </Button>
      </div>
    )
  }

  const upperCount = set.punches?.filter((p) => p.type === 'upper').length ?? 0
  const lowerCount = set.punches?.filter((p) => p.type === 'lower').length ?? 0
  const matrixCount = set.punches?.filter((p) => p.type === 'matrix').length ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">{set.code}</h2>
            <Badge variant={STATUS_VARIANTS[set.status]}>{t.status[set.status]}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{set.name}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> {t.setDetail.addPunch}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t.setDetail.totalPunches}</p>
            <p className="text-2xl font-bold mt-0.5">{set.punches?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t.setDetail.upperPunches}</p>
            <p className="text-2xl font-bold mt-0.5">{upperCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t.setDetail.lowerPunches}</p>
            <p className="text-2xl font-bold mt-0.5">{lowerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t.setDetail.matrices}</p>
            <p className="text-2xl font-bold mt-0.5">{matrixCount}</p>
          </CardContent>
        </Card>
      </div>

      {set.notes && (
        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t.setDetail.notes}</span>{set.notes}
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.code}</TableHead>
              <TableHead>{t.common.type}</TableHead>
              <TableHead>{t.setDetail.position}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-16">{t.setDetail.action}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!set.punches || set.punches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.setDetail.noPunches}
                </TableCell>
              </TableRow>
            ) : set.punches.map((punch) => (
              <TableRow key={punch.id}>
                <TableCell className="font-mono font-medium">{punch.code}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t.punchType[punch.type as keyof typeof t.punchType] ?? punch.type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{punch.position ?? '—'}</TableCell>
                <TableCell>
                  {punch.active
                    ? <Badge variant="success">{t.setDetail.punchActive}</Badge>
                    : <Badge variant="secondary">{t.setDetail.punchInactive}</Badge>}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (confirm(t.setDetail.removePunchConfirm.replace('{code}', punch.code))) removeMutation.mutate(punch.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Produtos vinculados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{t.products.linkedSets}</h3>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="h-4 w-4" /> {t.products.linkProduct}
            </Button>
          )}
        </div>
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.code}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                {canEdit && <TableHead className="w-16">{t.common.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                    {t.products.noLinkedProducts}
                  </TableCell>
                </TableRow>
              ) : linkedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-sm">{p.code ?? '—'}</TableCell>
                  <TableCell>
                    {p.active
                      ? <Badge variant="success">{t.common.activeF}</Badge>
                      : <Badge variant="secondary">{t.common.inactiveF}</Badge>}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={unlinkMutation.isPending}
                        onClick={() => unlinkMutation.mutate(p.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Ferramental */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-base">{t.tooling.title}</h3>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={handleSaveTooling}
              disabled={savingToolingMutation.isPending}
            >
              {savingToolingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.tooling.save}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLING_TYPES.map((type) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t.tooling[type]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.tooling.qtdSolicitada}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={getToolingValue(type, 'qtdSolicitada')}
                      onChange={(e) => setToolingField(type, 'qtdSolicitada', e.target.value ? Number(e.target.value) : null)}
                      disabled={!canEdit}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.tooling.numDesenho}</Label>
                    <Input
                      value={getToolingValue(type, 'numDesenho')}
                      onChange={(e) => setToolingField(type, 'numDesenho', e.target.value)}
                      disabled={!canEdit}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.tooling.norma}</Label>
                  <Select
                    value={getToolingValue(type, 'norma') || '__none__'}
                    onValueChange={(v) => setToolingField(type, 'norma', v === '__none__' ? null : v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={t.tooling.normaPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {NORMAS_TOOLING.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                      <SelectItem value="Outros">{t.machines.normaOther}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.tooling.dimensoes}</Label>
                  <Input
                    value={getToolingValue(type, 'dimensoes')}
                    onChange={(e) => setToolingField(type, 'dimensoes', e.target.value)}
                    disabled={!canEdit}
                    className="h-8 text-sm"
                    placeholder="ex: Ø 9,525 x 133,35 mm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Link product dialog */}
      <Dialog open={linkOpen} onOpenChange={(o) => { setLinkOpen(o); if (!o) setSelectedProductId('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.products.linkProduct}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.products.selectProduct}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder={t.products.selectProduct} /></SelectTrigger>
                <SelectContent>
                  {allProducts
                    .filter((p) => !linkedProducts.some((lp) => lp.id === p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.code ? ` · ${p.code}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!selectedProductId || linkMutation.isPending}
              onClick={() => linkMutation.mutate(selectedProductId)}
            >
              {linkMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.products.linkProduct}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add punch dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.setDetail.addPunch}</DialogTitle></DialogHeader>
          <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.code} *</Label>
              <Input placeholder="ex: P01" {...addForm.register('code')} />
              {addForm.formState.errors.code && <p className="text-xs text-destructive">{addForm.formState.errors.code.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.common.type} *</Label>
                <Select defaultValue="upper" onValueChange={(v) => addForm.setValue('type', v as 'upper' | 'lower' | 'matrix')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upper">{t.punchType.upper}</SelectItem>
                    <SelectItem value="lower">{t.punchType.lower}</SelectItem>
                    <SelectItem value="matrix">{t.punchType.matrix}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.setDetail.position} *</Label>
                <Input type="number" min="1" placeholder={t.setDetail.positionPlaceholder} {...addForm.register('position')} />
                {addForm.formState.errors.position && <p className="text-xs text-destructive">{addForm.formState.errors.position.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.setDetail.addPunch}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
