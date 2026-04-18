import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface UserItem {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  company: { id: string; name: string } | null
}

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  MANAGER: 'default',
  COMPANY: 'secondary',
  CLIENT: 'outline',
}

type CreateForm = { name: string; email: string; password: string; role: UserRole; companyId?: string }
type UpdateForm = { name: string; email: string; password?: string; role: UserRole; companyId?: string }

function UserForm({
  mode,
  defaultValues,
  onSubmit,
  loading,
  currentRole,
  t,
}: {
  mode: 'create' | 'edit'
  defaultValues?: Partial<CreateForm>
  onSubmit: (data: CreateForm | UpdateForm) => void
  loading: boolean
  currentRole: UserRole
  t: ReturnType<typeof useLocale>['t']
}) {
  const createSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.users.nameRequired),
        email: z.string().email(t.users.invalidEmail),
        password: z.string().min(6, t.users.passwordMinLength),
        role: z.enum(['ADMIN', 'MANAGER', 'COMPANY', 'CLIENT']),
        companyId: z.string().optional(),
      }),
    [t],
  )

  const updateSchema = useMemo(
    () =>
      createSchema.omit({ password: true }).extend({
        password: z.string().min(6).optional().or(z.literal('')),
      }),
    [createSchema],
  )

  const schema = mode === 'create' ? createSchema : updateSchema

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies-list'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const selectedRole = watch('role')
  const needsCompany = selectedRole === 'COMPANY' || selectedRole === 'CLIENT'

  const availableRoles: { value: UserRole; label: string }[] = currentRole === 'COMPANY'
    ? [{ value: 'CLIENT', label: t.roles.CLIENT }]
    : [
        { value: 'ADMIN', label: t.roles.ADMIN },
        { value: 'MANAGER', label: t.roles.MANAGER },
        { value: 'COMPANY', label: t.roles.COMPANY },
        { value: 'CLIENT', label: t.roles.CLIENT },
      ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.common.name} *</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{t.users.email} *</Label>
        <Input type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{mode === 'create' ? t.users.password : t.users.newPassword}</Label>
        <Input type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{t.users.profile} *</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger><SelectValue placeholder={t.users.selectProfile} /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      {needsCompany && (
        <div className="space-y-1.5">
          <Label>{t.common.company} *</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder={t.users.selectCompany} /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.save}
      </Button>
    </form>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)

  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); toast.success(t.users.created) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.users.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateForm) => api.put(`/users/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditing(null); toast.success(t.users.updated) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.users.updateError),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.users.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.users.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> {t.users.newUser}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.users.newUser}</DialogTitle></DialogHeader>
            <UserForm
              mode="create"
              currentRole={me?.role ?? 'CLIENT'}
              onSubmit={(d) => createMutation.mutate(d as CreateForm)}
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
              <TableHead>{t.users.email}</TableHead>
              <TableHead>{t.users.profile}</TableHead>
              <TableHead>{t.common.company}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-16">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t.common.loading}</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t.users.noUsers}</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={roleBadgeVariant[u.role]}>{t.roles[u.role]}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{u.company?.name ?? '—'}</TableCell>
                <TableCell><Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? t.users.active : t.users.inactive}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.users.editUser}</DialogTitle></DialogHeader>
          {editing && (
            <UserForm
              mode="edit"
              currentRole={me?.role ?? 'CLIENT'}
              defaultValues={{ name: editing.name, email: editing.email, role: editing.role, companyId: editing.company?.id }}
              onSubmit={(d) => updateMutation.mutate(d as UpdateForm)}
              loading={updateMutation.isPending}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
