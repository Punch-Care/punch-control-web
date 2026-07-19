import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { PunchSet, Product, SetStatus } from '@/types'

const STATUS_VARIANTS: Record<SetStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  IN_REPAIR: 'warning',
  INACTIVE: 'secondary',
  DISCARDED: 'destructive',
}

function UsefulValueBar({ value, l30, l60 }: { value: number; l30: number; l60: number }) {
  const color = value <= l30 ? 'bg-red-500' : value <= l60 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums w-10 text-right">{value.toFixed(0)}%</span>
    </div>
  )
}

export function SetsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLocale()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const { companyId: adminCompanyId, selectedCompany } = useAdminCompany()

  const [createOpen, setCreateOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createCompanyId, setCreateCompanyId] = useState<string>('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const createSchema = useMemo(
    () =>
      z.object({
        code: z.string().min(1, t.sets.codeRequired),
        name: z.string().min(2, t.sets.nameMinLength),
        companyId: isAdmin && !selectedCompany
          ? z.string().uuid(t.sets.selectCompanyRequired)
          : z.string().optional(),
        l30Limit: z.coerce.number().min(0).max(100).default(30),
        l60Limit: z.coerce.number().min(0).max(100).default(60),
        notes: z.string().optional(),
      }),
    [t],
  )

  type CreateData = z.infer<typeof createSchema>

  const { data: sets = [], isLoading } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isAdmin && !selectedCompany,
  })

  // In admin context with selected company, pre-fill companyId in the create form
  const activeCompanyId = isAdmin
    ? (selectedCompany?.id || createCompanyId)
    : (user?.company?.id ?? '')
  const { data: companyProducts = [] } = useQuery<Product[]>({
    queryKey: ['products', activeCompanyId],
    queryFn: () => api.get('/products', { params: { companyId: activeCompanyId || undefined } }).then((r) => r.data),
    enabled: !!activeCompanyId && createOpen,
  })

  const toggleProduct = (productId: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )

  const createForm = useForm<CreateData>({
    resolver: zodResolver(createSchema),
    defaultValues: { l30Limit: 30, l60Limit: 60 },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateData) => {
      const companyId = isAdmin ? (selectedCompany?.id || data.companyId) : (user?.company?.id ?? '')
      const set = await api.post('/punch-sets', { ...data, companyId })
      if (selectedProductIds.length > 0) {
        await Promise.all(
          selectedProductIds.map((productId) =>
            api.post(`/punch-sets/${set.data.id}/products`, { productId }),
          ),
        )
      }
      return set
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      setCreateOpen(false)
      createForm.reset()
      setSelectedProductIds([])
      setCreateCompanyId('')
      toast.success(t.sets.created)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.sets.createError),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/punch-sets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['punch-sets'] }); toast.success(t.sets.deleted) },
    onError: () => toast.error(t.sets.deleteError),
  })

  const filtered = statusFilter === 'all' ? sets : sets.filter((s) => s.status === statusFilter)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t.sets.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.sets.subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> {t.sets.newSet}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {(['all', 'ACTIVE', 'IN_REPAIR', 'INACTIVE', 'DISCARDED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            {s === 'all' ? t.sets.all : t.status[s as SetStatus]}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-60">
                {sets.filter((x) => x.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['ACTIVE', 'IN_REPAIR', 'INACTIVE', 'DISCARDED'] as SetStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter(s)}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.status[s]}</p>
              <p className="text-2xl font-bold mt-0.5">{sets.filter((x) => x.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.code}</TableHead>
              <TableHead>{t.common.name}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead>{t.sets.usefulLife}</TableHead>
              <TableHead>{t.sets.punches}</TableHead>
              <TableHead>{t.sets.occurrences}</TableHead>
              {isAdmin && !selectedCompany && <TableHead>{t.common.company}</TableHead>}
              <TableHead className="w-28">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t.sets.noSetsFound}</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/sets/${s.id}`)}>
                <TableCell className="font-mono font-medium">{s.code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[s.status]}>{t.status[s.status]}</Badge>
                </TableCell>
                <TableCell>
                  <UsefulValueBar value={s.usefulValue} l30={s.l30Limit} l60={s.l60Limit} />
                </TableCell>
                <TableCell className="text-muted-foreground">{s._count.punches}</TableCell>
                <TableCell className="text-muted-foreground">{s._count.occurrences}</TableCell>
                {isAdmin && !selectedCompany && <TableCell className="text-muted-foreground text-xs">{s.company.name}</TableCell>}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    if (confirm(t.sets.deleteConfirm)) deleteMutation.mutate(s.id)
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setSelectedProductIds([]); setCreateCompanyId('') } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.sets.newSet}</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            {isAdmin && !selectedCompany && (
              <div className="space-y-1.5">
                <Label>{t.common.company} *</Label>
                <Select onValueChange={(v) => { createForm.setValue('companyId', v); setCreateCompanyId(v); setSelectedProductIds([]) }}>
                  <SelectTrigger><SelectValue placeholder={t.common.selectCompany} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.companyId && <p className="text-xs text-destructive">{createForm.formState.errors.companyId.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.common.code} *</Label>
                <Input placeholder={t.sets.codePlaceholder} {...createForm.register('code')} />
                {createForm.formState.errors.code && <p className="text-xs text-destructive">{createForm.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.name} *</Label>
                <Input placeholder={t.sets.namePlaceholder} {...createForm.register('name')} />
                {createForm.formState.errors.name && <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.sets.l30Limit} *</Label>
                <Input type="number" step="0.1" {...createForm.register('l30Limit')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.sets.l60Limit} *</Label>
                <Input type="number" step="0.1" {...createForm.register('l60Limit')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.common.optional} {...createForm.register('notes')} />
            </div>

            {/* Seleção de produtos */}
            {activeCompanyId && (
              <div className="space-y-2">
                <Label>{t.sets.productsLabel}</Label>
                {companyProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.sets.noProductsForCompany}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {companyProducts.map((p) => {
                      const selected = selectedProductIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProduct(p.id)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-foreground'
                          }`}
                        >
                          {p.name}{p.code ? ` · ${p.code}` : ''}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.sets.createSet}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
