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
import type { Company } from '@/types'

type FormData = {
  name: string
  cnpj?: string
  razaoSocial?: string
  inscricaoEstadual?: string
  logradouro?: string
  complemento?: string
  cidade?: string
  estado?: string
  telefone?: string
}

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
  const c = t.companies

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, c.nameMinLength),
        cnpj: z.string().optional(),
        razaoSocial: z.string().optional(),
        inscricaoEstadual: z.string().optional(),
        logradouro: z.string().optional(),
        complemento: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        telefone: z.string().optional(),
      }),
    [c],
  )

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t.common.name} *</Label>
          <Input placeholder={c.namePlaceholder} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{c.razaoSocial}</Label>
          <Input placeholder={c.razaoSocialPlaceholder} {...register('razaoSocial')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.cnpj}</Label>
          <Input placeholder={c.cnpjPlaceholder} {...register('cnpj')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.inscricaoEstadual}</Label>
          <Input placeholder={c.inscricaoEstadualPlaceholder} {...register('inscricaoEstadual')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{c.logradouro}</Label>
          <Input placeholder={c.logradouroPlaceholder} {...register('logradouro')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.complemento}</Label>
          <Input placeholder={c.complementoPlaceholder} {...register('complemento')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.cidade}</Label>
          <Input placeholder={c.cidadePlaceholder} {...register('cidade')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.estado}</Label>
          <Input placeholder={c.estadoPlaceholder} {...register('estado')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.telefone}</Label>
          <Input placeholder={c.telefonePlaceholder} {...register('telefone')} />
        </div>
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
          <DialogContent className="max-w-2xl">
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
              <TableHead>{t.companies.razaoSocial}</TableHead>
              <TableHead>{t.companies.cnpj}</TableHead>
              <TableHead>{t.companies.cidade}</TableHead>
              <TableHead>{t.companies.users}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-24">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t.common.loading}</TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t.companies.noCompanies}</TableCell></TableRow>
            ) : companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.razaoSocial ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.cnpj ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ''}` : '—'}
                </TableCell>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.companies.editCompany}</DialogTitle></DialogHeader>
          {editing && (
            <CompanyForm
              defaultValues={{
                name: editing.name,
                cnpj: editing.cnpj ?? '',
                razaoSocial: editing.razaoSocial ?? '',
                inscricaoEstadual: editing.inscricaoEstadual ?? '',
                logradouro: editing.logradouro ?? '',
                complemento: editing.complemento ?? '',
                cidade: editing.cidade ?? '',
                estado: editing.estado ?? '',
                telefone: editing.telefone ?? '',
              }}
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
