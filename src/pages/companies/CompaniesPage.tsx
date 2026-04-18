import { useState } from 'react'
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

interface Company {
  id: string
  name: string
  cnpj: string | null
  active: boolean
  createdAt: string
  _count: { users: number }
}

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cnpj: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

function CompanyForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Razão social" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>CNPJ</Label>
        <Input placeholder="00.000.000/0000-00" {...register('cnpj')} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </form>
  )
}

export function CompaniesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/companies', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setOpen(false); toast.success('Empresa criada') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao criar empresa'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.put(`/companies/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setEditing(null); toast.success('Empresa atualizada') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/companies/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
    onError: () => toast.error('Erro ao alterar status'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Gestão de empresas clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Nova Empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
            <CompanyForm
              onSubmit={createMutation.mutate}
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
              <TableHead>CNPJ</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada</TableCell></TableRow>
            ) : companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.cnpj ?? '—'}</TableCell>
                <TableCell>{c._count.users}</TableCell>
                <TableCell>
                  <Badge variant={c.active ? 'success' : 'secondary'}>
                    {c.active ? 'Ativa' : 'Inativa'}
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
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          {editing && (
            <CompanyForm
              defaultValues={{ name: editing.name, cnpj: editing.cnpj ?? '' }}
              onSubmit={updateMutation.mutate}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
