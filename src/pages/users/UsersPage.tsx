import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
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

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  COMPANY: 'Empresa',
  CLIENT: 'Cliente',
}

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  MANAGER: 'default',
  COMPANY: 'secondary',
  CLIENT: 'outline',
}

const createSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'COMPANY', 'CLIENT']),
  companyId: z.string().optional(),
})

const updateSchema = createSchema.omit({ password: true }).extend({
  password: z.string().min(6).optional().or(z.literal('')),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function UserForm({
  mode,
  defaultValues,
  onSubmit,
  loading,
  currentRole,
}: {
  mode: 'create' | 'edit'
  defaultValues?: Partial<CreateForm>
  onSubmit: (data: CreateForm | UpdateForm) => void
  loading: boolean
  currentRole: UserRole
}) {
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
    ? [{ value: 'CLIENT', label: 'Cliente' }]
    : [
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'MANAGER', label: 'Gerente' },
        { value: 'COMPANY', label: 'Empresa' },
        { value: 'CLIENT', label: 'Cliente' },
      ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>E-mail *</Label>
        <Input type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{mode === 'create' ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}</Label>
        <Input type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Perfil *</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
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
          <Label>Empresa *</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
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
        Salvar
      </Button>
    </form>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)

  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); toast.success('Usuário criado') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao criar'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateForm) => api.put(`/users/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditing(null); toast.success('Usuário atualizado') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuários</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Gestão de acesso ao sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
            <UserForm
              mode="create"
              currentRole={me?.role ?? 'CLIENT'}
              onSubmit={(d) => createMutation.mutate(d as CreateForm)}
              loading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={roleBadgeVariant[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{u.company?.name ?? '—'}</TableCell>
                <TableCell><Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editing && (
            <UserForm
              mode="edit"
              currentRole={me?.role ?? 'CLIENT'}
              defaultValues={{ name: editing.name, email: editing.email, role: editing.role, companyId: editing.company?.id }}
              onSubmit={(d) => updateMutation.mutate(d as UpdateForm)}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
