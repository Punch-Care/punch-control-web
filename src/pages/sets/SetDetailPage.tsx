import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, Loader2, Link2, Unlink, FlaskConical, AlertTriangle, Activity, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useProductsQuery } from '@/hooks/queries'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ToolingSection } from './ToolingSection'
import type { PunchSet, Punch, Product, SetStatus } from '@/types'

function UsefulValueBar({ value, l30, l60 }: { value: number; l30: number; l60: number }) {
  const color = value <= l30 ? 'bg-red-500' : value <= l60 ? 'bg-yellow-500' : 'bg-green-500'
  const label = value <= l30 ? 'Crítico' : value <= l60 ? 'Atenção' : 'Saudável'
  const labelColor = value <= l30 ? 'text-red-600' : value <= l60 ? 'text-yellow-600' : 'text-green-600'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Vida útil do conjunto</span>
        <span className={`font-semibold ${labelColor}`}>{value.toFixed(0)}% — {label}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Crítico em {l30}%</span>
        <span>Alerta em {l60}%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

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
  const { companyId } = useAdminCompany()
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

  const { data: allProducts = [] } = useProductsQuery(companyId, { enabled: linkOpen })

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
          <Breadcrumb items={[
            { label: t.sets.title, href: '/sets' },
            { label: `${set.code} — ${set.name}` },
          ]} />
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">{set.code}</h2>
            <Badge variant={STATUS_VARIANTS[set.status]}>{t.status[set.status]}</Badge>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> {t.setDetail.addPunch}
          </Button>
        )}
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

      {/* Vida útil */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <UsefulValueBar
            value={set.usefulValue ?? 100}
            l30={set.l30Limit ?? 30}
            l60={set.l60Limit ?? 60}
          />
        </CardContent>
      </Card>

      {/* Hub de ações rápidas */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              icon: FlaskConical,
              label: 'Novo Lote',
              desc: 'Registrar produção',
              color: 'bg-primary/10 text-primary hover:bg-primary/20',
              onClick: () => navigate(`/production/new?setId=${id}`),
              show: canEdit,
            },
            {
              icon: AlertTriangle,
              label: 'Ocorrências',
              desc: 'Ver e registrar',
              color: 'bg-red-50 text-red-700 hover:bg-red-100',
              onClick: () => navigate(`/occurrences?setId=${id}`),
              show: true,
            },
            {
              icon: Activity,
              label: 'Ciclo de Vida',
              desc: 'Histórico e estoque',
              color: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
              onClick: () => navigate(`/lifecycle?setId=${id}`),
              show: true,
            },
            {
              icon: Ruler,
              label: 'Dimensionar',
              desc: 'Registrar medições',
              color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
              onClick: () => navigate(`/dimensioning?setId=${id}`),
              show: true,
            },
          ].filter(a => a.show).map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-colors ${action.color}`}
            >
              <action.icon className="h-5 w-5" />
              <div>
                <p className="text-xs font-semibold leading-tight">{action.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
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

      {/* Ferramental — componente expandido */}
      {id && <ToolingSection setId={id} canEdit={canEdit} />}

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
