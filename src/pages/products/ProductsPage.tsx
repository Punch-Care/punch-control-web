import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { Product } from '@/types'

export function ProductsPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canEdit = user?.role !== 'CLIENT'
  const { companyId: adminCompanyId, selectedCompany } = useAdminCompany()

  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const createSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.products.nameMinLength),
        code: z.string().optional(),
        companyId: (isManager && !selectedCompany)
          ? z.string().uuid(t.products.selectCompanyRequired)
          : z.string().optional(),
      }),
    [t],
  )

  const updateSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2).optional(),
        code: z.string().optional(),
      }),
    [],
  )

  type CreateData = z.infer<typeof createSchema>
  type UpdateData = z.infer<typeof updateSchema>

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', adminCompanyId],
    queryFn: () => api.get('/products', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isManager && !selectedCompany,
  })

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) })
  const updateForm = useForm<UpdateData>({ resolver: zodResolver(updateSchema) })

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => {
      const payload = selectedCompany ? { ...data, companyId: selectedCompany.id } : data
      return api.post('/products', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setCreateOpen(false)
      createForm.reset()
      toast.success(t.products.created)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.products.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateData) => api.put(`/products/${editProduct!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setEditProduct(null)
      toast.success(t.products.updated)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.products.updateError),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(t.products.deleted)
    },
    onError: () => toast.error(t.products.deleteError),
  })

  const handleCreate = (data: CreateData) => {
    if (!isManager) {
      createMutation.mutate({ ...data, companyId: user!.company!.id })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t.products.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.products.subtitle}</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t.products.newProduct}
          </Button>
        )}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.name}</TableHead>
              <TableHead>{t.common.code}</TableHead>
              <TableHead>{t.products.sets}</TableHead>
              {isManager && !selectedCompany && <TableHead>{t.common.company}</TableHead>}
              <TableHead>{t.common.status}</TableHead>
              {canEdit && <TableHead className="w-24">{t.common.actions}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t.common.loading}
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t.products.noProducts}
                </TableCell>
              </TableRow>
            ) : products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground text-sm">{p.code ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{p._count?.punchSetProducts ?? 0}</TableCell>
                {isManager && !selectedCompany && (
                  <TableCell className="text-muted-foreground text-xs">{p.company?.name}</TableCell>
                )}
                <TableCell>
                  {p.active
                    ? <Badge variant="success">{t.common.activeF}</Badge>
                    : <Badge variant="secondary">{t.common.inactiveF}</Badge>}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditProduct(p)
                          updateForm.reset({ name: p.name, code: p.code ?? '' })
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(t.products.deleteConfirm)) deleteMutation.mutate(p.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.products.newProduct}</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            {isManager && !selectedCompany && (
              <div className="space-y-1.5">
                <Label>{t.common.company} *</Label>
                <Select onValueChange={(v) => createForm.setValue('companyId', v)}>
                  <SelectTrigger><SelectValue placeholder={t.common.selectCompany} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.companyId && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.companyId.message}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder={t.products.namePlaceholder} {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code}</Label>
              <Input placeholder={t.products.codePlaceholder} {...createForm.register('code')} />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.products.newProduct}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.products.editProduct}</DialogTitle></DialogHeader>
          {editProduct && (
            <form onSubmit={updateForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.common.name}</Label>
                <Input {...updateForm.register('name')} />
                {updateForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{updateForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.code}</Label>
                <Input {...updateForm.register('code')} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.save}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
