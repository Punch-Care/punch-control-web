import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Loader2, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

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
import { OccurrencesAnalytics } from './OccurrencesAnalytics'
import type { Occurrence, OccurrenceStatus, OccurrenceType, PunchSet, Machine, Product } from '@/types'

const STATUS_VARIANTS: Record<OccurrenceStatus, 'destructive' | 'warning' | 'success'> = {
  OPEN: 'destructive',
  MONITORING: 'warning',
  CLOSED: 'success',
}

export function OccurrencesPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const { companyId: adminCompanyId, selectedCompany } = useAdminCompany()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOcc, setEditOcc] = useState<Occurrence | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [machineCreateOpen, setMachineCreateOpen] = useState(false)
  const [productCreateOpen, setProductCreateOpen] = useState(false)

  const createSchema = useMemo(
    () =>
      z.object({
        setId: z.string().uuid(t.occurrences.selectSetRequired),
        machineId: z.string().uuid().optional(),
        productId: z.string().uuid().optional(),
        type: z.enum(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER']),
        description: z.string().min(5, t.occurrences.descriptionRequired),
      }),
    [t],
  )

  const updateSchema = useMemo(
    () =>
      z.object({
        status: z.enum(['OPEN', 'MONITORING', 'CLOSED']).optional(),
        type: z.enum(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER']).optional(),
        description: z.string().min(5).optional(),
        resolution: z.string().optional(),
      }),
    [],
  )

  const machineSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.occurrences.nameRequired),
        code: z.string().min(1, t.occurrences.codeRequired),
        companyId: (isAdmin && !selectedCompany)
          ? z.string().uuid(t.occurrences.selectCompanyRequired)
          : z.string().optional(),
      }),
    [t, isAdmin, selectedCompany],
  )

  const productSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.occurrences.nameRequired),
        code: z.string().min(1, t.occurrences.codeRequired),
        companyId: (isAdmin && !selectedCompany)
          ? z.string().uuid(t.occurrences.selectCompanyRequired)
          : z.string().optional(),
      }),
    [t, isAdmin, selectedCompany],
  )

  type CreateData = z.infer<typeof createSchema>
  type UpdateData = z.infer<typeof updateSchema>
  type MachineData = z.infer<typeof machineSchema>
  type ProductData = z.infer<typeof productSchema>

  const { data: occurrences = [], isLoading } = useQuery<Occurrence[]>({
    queryKey: ['occurrences', statusFilter, adminCompanyId],
    queryFn: () => api.get('/occurrences', {
      params: { ...(statusFilter !== 'all' ? { status: statusFilter } : {}), companyId: adminCompanyId },
    }).then((r) => r.data),
  })

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isAdmin && !selectedCompany,
  })

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines', adminCompanyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', adminCompanyId],
    queryFn: () => api.get('/occurrences/products', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) })
  const updateForm = useForm<UpdateData>({ resolver: zodResolver(updateSchema) })
  const machineForm = useForm<MachineData>({
    resolver: zodResolver(machineSchema),
    defaultValues: { companyId: selectedCompany?.id ?? user?.company?.id ?? '' },
  })
  const productForm = useForm<ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: { companyId: selectedCompany?.id ?? user?.company?.id ?? '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => api.post('/occurrences', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      setCreateOpen(false)
      createForm.reset()
      toast.success(t.occurrences.created)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.occurrences.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateData) => api.put(`/occurrences/${editOcc!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      setEditOcc(null)
      toast.success(t.occurrences.updated)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.occurrences.updateError),
  })

  const createMachineMutation = useMutation({
    mutationFn: (data: MachineData) => api.post('/occurrences/machines', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] })
      setMachineCreateOpen(false)
      machineForm.reset()
      toast.success(t.occurrences.machineCreated)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.occurrences.machineCreateError),
  })

  const createProductMutation = useMutation({
    mutationFn: (data: ProductData) => api.post('/occurrences/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setProductCreateOpen(false)
      productForm.reset()
      toast.success(t.occurrences.productCreated)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.occurrences.productCreateError),
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t.occurrences.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.occurrences.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={showAnalytics ? 'default' : 'outline'} onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="h-4 w-4" /> Análise Histórica
          </Button>
          {!showAnalytics && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> {t.occurrences.newOccurrence}
            </Button>
          )}
        </div>
      </div>

      {showAnalytics && <OccurrencesAnalytics />}

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.occurrences.open}</p><p className="text-2xl font-bold text-red-500">{occurrences.filter((o) => o.status === 'OPEN').length}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.occurrences.monitoring}</p><p className="text-2xl font-bold text-yellow-500">{occurrences.filter((o) => o.status === 'MONITORING').length}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.occurrences.closed}</p><p className="text-2xl font-bold text-green-500">{occurrences.filter((o) => o.status === 'CLOSED').length}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'OPEN', 'MONITORING', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            {s === 'all' ? t.occurrences.allF : t.occurrenceStatus[s as OccurrenceStatus]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.occurrences.set}</TableHead>
              <TableHead>{t.common.type}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead>{t.occurrences.machine}</TableHead>
              <TableHead>{t.occurrences.product}</TableHead>
              <TableHead>{t.occurrences.openedAt}</TableHead>
              <TableHead className="w-20">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
            ) : occurrences.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t.occurrences.noOccurrencesFound}</TableCell></TableRow>
            ) : occurrences.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="font-medium font-mono text-xs">{o.set.code}</p>
                  <p className="text-xs text-muted-foreground">{o.set.name}</p>
                </TableCell>
                <TableCell><Badge variant="secondary">{t.occurrenceType[o.type]}</Badge></TableCell>
                <TableCell><Badge variant={STATUS_VARIANTS[o.status]}>{t.occurrenceStatus[o.status]}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.machine?.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.product?.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(o.openedAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditOcc(o)
                    updateForm.reset({ status: o.status, type: o.type, description: o.description, resolution: o.resolution ?? '' })
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create occurrence dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.occurrences.newOccurrence}</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.occurrences.set} *</Label>
              <Select onValueChange={(v) => createForm.setValue('setId', v)}>
                <SelectTrigger><SelectValue placeholder={t.occurrences.selectSet} /></SelectTrigger>
                <SelectContent>
                  {sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {createForm.formState.errors.setId && <p className="text-xs text-destructive">{createForm.formState.errors.setId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.type} *</Label>
              <Select onValueChange={(v) => createForm.setValue('type', v as OccurrenceType)}>
                <SelectTrigger><SelectValue placeholder={t.occurrences.occurrenceTypePlaceholder} /></SelectTrigger>
                <SelectContent>
                  {(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER'] as OccurrenceType[]).map((type) => (
                    <SelectItem key={type} value={type}>{t.occurrenceType[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t.occurrences.machine}</Label>
                  <button
                    type="button"
                    onClick={() => setMachineCreateOpen(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> {t.occurrences.newMachineBtn}
                  </button>
                </div>
                <Select onValueChange={(v) => createForm.setValue('machineId', v)}>
                  <SelectTrigger><SelectValue placeholder={t.common.optional} /></SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t.occurrences.product}</Label>
                  <button
                    type="button"
                    onClick={() => setProductCreateOpen(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> {t.occurrences.newProductBtn}
                  </button>
                </div>
                <Select onValueChange={(v) => createForm.setValue('productId', v)}>
                  <SelectTrigger><SelectValue placeholder={t.common.optional} /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.description} *</Label>
              <Input placeholder={t.occurrences.describeOccurrence} {...createForm.register('description')} />
              {createForm.formState.errors.description && <p className="text-xs text-destructive">{createForm.formState.errors.description.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.occurrences.registerOccurrence}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit/update dialog */}
      <Dialog open={!!editOcc} onOpenChange={(o) => !o && setEditOcc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.occurrences.updateOccurrence}</DialogTitle></DialogHeader>
          {editOcc && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{editOcc.set.code} — {editOcc.set.name}</p>
                <p className="text-muted-foreground mt-0.5">{editOcc.description}</p>
              </div>
              <form onSubmit={updateForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t.common.status}</Label>
                    <Select defaultValue={editOcc.status} onValueChange={(v) => updateForm.setValue('status', v as OccurrenceStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['OPEN', 'MONITORING', 'CLOSED'] as OccurrenceStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{t.occurrenceStatus[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.type}</Label>
                    <Select defaultValue={editOcc.type} onValueChange={(v) => updateForm.setValue('type', v as OccurrenceType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER'] as OccurrenceType[]).map((type) => (
                          <SelectItem key={type} value={type}>{t.occurrenceType[type]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.occurrences.resolution}</Label>
                  <Input placeholder={t.occurrences.describeResolution} {...updateForm.register('resolution')} />
                </div>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.common.save}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New machine dialog */}
      <Dialog open={machineCreateOpen} onOpenChange={setMachineCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.occurrences.newMachineTitle}</DialogTitle></DialogHeader>
          <form onSubmit={machineForm.handleSubmit((d) => createMachineMutation.mutate(d))} className="space-y-4">
            {isAdmin && !selectedCompany && (
              <div className="space-y-1.5">
                <Label>{t.common.company} *</Label>
                <Select onValueChange={(v) => machineForm.setValue('companyId', v)}>
                  <SelectTrigger><SelectValue placeholder={t.common.selectCompany} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {machineForm.formState.errors.companyId && <p className="text-xs text-destructive">{machineForm.formState.errors.companyId.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder={t.occurrences.machinePlaceholder} {...machineForm.register('name')} />
              {machineForm.formState.errors.name && <p className="text-xs text-destructive">{machineForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code} *</Label>
              <Input placeholder={t.occurrences.machineCodePlaceholder} {...machineForm.register('code')} />
              {machineForm.formState.errors.code && <p className="text-xs text-destructive">{machineForm.formState.errors.code.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={createMachineMutation.isPending}>
              {createMachineMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.occurrences.registerMachine}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New product dialog */}
      <Dialog open={productCreateOpen} onOpenChange={setProductCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.occurrences.newProductTitle}</DialogTitle></DialogHeader>
          <form onSubmit={productForm.handleSubmit((d) => createProductMutation.mutate(d))} className="space-y-4">
            {isAdmin && !selectedCompany && (
              <div className="space-y-1.5">
                <Label>{t.common.company} *</Label>
                <Select onValueChange={(v) => productForm.setValue('companyId', v)}>
                  <SelectTrigger><SelectValue placeholder={t.common.selectCompany} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {productForm.formState.errors.companyId && <p className="text-xs text-destructive">{productForm.formState.errors.companyId.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder={t.occurrences.productPlaceholder} {...productForm.register('name')} />
              {productForm.formState.errors.name && <p className="text-xs text-destructive">{productForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code} *</Label>
              <Input placeholder={t.occurrences.productCodePlaceholder} {...productForm.register('code')} />
              {productForm.formState.errors.code && <p className="text-xs text-destructive">{productForm.formState.errors.code.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.occurrences.registerProduct}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
