import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Power, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'

interface Company {
  id: string
  name: string
  cnpj: string | null
  active: boolean
  createdAt: string
  _count: { users: number }
}

type FormData = { name: string; cnpj?: string }

function CompanyForm({
  defaultValues,
  onSubmit,
  loading,
  t,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  loading: boolean
  t: ReturnType<typeof useLocale>['t']
}) {
  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.companies.nameMinLength),
        cnpj: z.string().optional(),
      }),
    [t],
  )

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.common.name} *</Label>
        <Input placeholder={t.companies.namePlaceholder} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{t.companies.cnpj}</Label>
        <Input placeholder={t.companies.cnpjPlaceholder} {...register('cnpj')} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.save}
      </Button>
    </form>
  )
}

export function CompaniesPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/companies', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setOpen(false); toast.success(t.companies.created) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.companies.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.put(`/companies/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setEditing(null); toast.success(t.companies.updated) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.companies.updateError),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/companies/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
    onError: () => toast.error(t.companies.toggleError),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.companies.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.companies.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> {t.companies.newCompany}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.companies.newCompany}</DialogTitle></DialogHeader>
            <CompanyForm
              onSubmit={createMutation.mutate}
              loading={createMutation.isPending}
              t={t}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.name}</TableHead>
              <TableHead>{t.companies.cnpj}</TableHead>
              <TableHead>{t.companies.users}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-24">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t.common.loading}</TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t.companies.noCompanies}</TableCell></TableRow>
            ) : companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.cnpj ?? '—'}</TableCell>
                <TableCell>{c._count.users}</TableCell>
                <TableCell>
                  <Badge variant={c.active ? 'success' : 'secondary'}>
                    {c.active ? t.companies.active : t.companies.inactive}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleMutation.mutate(c.id)}
                      className={c.active ? 'text-destructive' : 'text-green-600'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.companies.editCompany}</DialogTitle></DialogHeader>
          {editing && (
            <CompanyForm
              defaultValues={{ name: editing.name, cnpj: editing.cnpj ?? '' }}
              onSubmit={updateMutation.mutate}
              loading={updateMutation.isPending}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
