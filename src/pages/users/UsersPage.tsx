import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  contextCompanyId,
  t,
}: {
  mode: 'create' | 'edit'
  defaultValues?: Partial<CreateForm>
  onSubmit: (data: CreateForm | UpdateForm) => void
  loading: boolean
  currentRole: UserRole
  contextCompanyId?: string   // empresa já definida pelo contexto (não exibir seletor)
  t: ReturnType<typeof useLocale>['t']
}) {
  const isAdminLevel = currentRole === 'ADMIN' || currentRole === 'MANAGER'

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

  // Só busca empresas se for admin E não há empresa no contexto
  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isAdminLevel && !contextCompanyId,
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      companyId: contextCompanyId || defaultValues?.companyId,
    },
  })

  const selectedRole = watch('role')
  const needsCompany = selectedRole === 'COMPANY' || selectedRole === 'CLIENT'

  // Roles disponíveis: COMPANY role só cria CLIENTs; no contexto de empresa, admin também só cria COMPANY/CLIENT
  const availableRoles: { value: UserRole; label: string }[] = useMemo(() => {
    if (currentRole === 'COMPANY') return [{ value: 'CLIENT', label: t.roles.CLIENT }]
    if (contextCompanyId) return [
      { value: 'COMPANY', label: t.roles.COMPANY },
      { value: 'CLIENT', label: t.roles.CLIENT },
    ]
    return [
      { value: 'ADMIN', label: t.roles.ADMIN },
      { value: 'MANAGER', label: t.roles.MANAGER },
      { value: 'COMPANY', label: t.roles.COMPANY },
      { value: 'CLIENT', label: t.roles.CLIENT },
    ]
  }, [currentRole, contextCompanyId, t])

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

      {/* Empresa: oculto quando já há contexto de empresa */}
      {needsCompany && !contextCompanyId && isAdminLevel && (
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
  const { companyId: adminCompanyId, selectedCompany } = useAdminCompany()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)

  const isAdminLevel = me?.role === 'ADMIN' || me?.role === 'MANAGER'

  // contextCompanyId: empresa do contexto (admin selecionou empresa, ou usuário COMPANY/CLIENT tem empresa fixa)
  const contextCompanyId = selectedCompany?.id ?? me?.company?.id

  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['users', adminCompanyId],
    queryFn: () => api.get('/users', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  // Contadores por role
  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'COMPANY' || u.role === 'ADMIN' || u.role === 'MANAGER').length,
    clients: users.filter(u => u.role === 'CLIENT').length,
    active: users.filter(u => u.active).length,
  }), [users])

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => {
      const payload = contextCompanyId && !data.companyId
        ? { ...data, companyId: contextCompanyId }
        : data
      return api.post('/users', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); toast.success(t.users.created) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.users.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateForm) => api.put(`/users/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditing(null); toast.success(t.users.updated) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.users.updateError),
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t.users.title}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedCompany
                ? selectedCompany.name
                : me?.company?.name
                  ?? (isAdminLevel ? 'Equipe interna Punch Care' : t.users.subtitle)}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> {t.users.newUser}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.users.newUser}</DialogTitle>
              {contextCompanyId && (
                <p className="text-sm text-muted-foreground">
                  {selectedCompany?.name ?? me?.company?.name}
                </p>
              )}
            </DialogHeader>
            <UserForm
              mode="create"
              currentRole={me?.role ?? 'CLIENT'}
              contextCompanyId={contextCompanyId}
              onSubmit={(d) => createMutation.mutate(d as CreateForm)}
              loading={createMutation.isPending}
              t={t}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-foreground' },
          { label: 'Ativos', value: counts.active, color: 'text-green-600' },
          { label: 'Gestores', value: counts.admins, color: 'text-primary' },
          { label: 'Clientes', value: counts.clients, color: 'text-muted-foreground' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-x-auto bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">{t.common.name}</TableHead>
              <TableHead className="font-semibold">{t.users.email}</TableHead>
              <TableHead className="font-semibold">{t.users.profile}</TableHead>
              {/* Só mostra empresa se admin sem empresa selecionada */}
              {isAdminLevel && !selectedCompany && (
                <TableHead className="font-semibold">{t.common.company}</TableHead>
              )}
              <TableHead className="font-semibold">{t.common.status}</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">{t.common.loading}</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <p className="text-sm font-medium">{t.users.noUsers}</p>
                    <p className="text-xs">Clique em "{t.users.newUser}" para adicionar o primeiro usuário</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {u.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant[u.role]}>{t.roles[u.role]}</Badge>
                </TableCell>
                {isAdminLevel && !selectedCompany && (
                  <TableCell className="text-muted-foreground text-sm">{u.company?.name ?? '—'}</TableCell>
                )}
                <TableCell>
                  <Badge variant={u.active ? 'success' : 'secondary'}>
                    {u.active ? t.users.active : t.users.inactive}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(u)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.users.editUser}</DialogTitle>
            {contextCompanyId && (
              <p className="text-sm text-muted-foreground">
                {selectedCompany?.name ?? me?.company?.name}
              </p>
            )}
          </DialogHeader>
          {editing && (
            <UserForm
              mode="edit"
              currentRole={me?.role ?? 'CLIENT'}
              contextCompanyId={contextCompanyId}
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
