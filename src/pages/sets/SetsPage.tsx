import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2, Eye } from 'lucide-react'
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
import type { PunchSet, SetStatus } from '@/types'

const STATUS_LABELS: Record<SetStatus, string> = {
  ACTIVE: 'Ativo',
  IN_REPAIR: 'Em Reparo',
  INACTIVE: 'Inativo',
  DISCARDED: 'Descartado',
}

const STATUS_VARIANTS: Record<SetStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  IN_REPAIR: 'warning',
  INACTIVE: 'secondary',
  DISCARDED: 'destructive',
}

const createSchema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  companyId: z.string().uuid('Selecione uma empresa'),
  l30Limit: z.coerce.number().min(0).max(100).default(30),
  l60Limit: z.coerce.number().min(0).max(100).default(60),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'IN_REPAIR', 'INACTIVE', 'DISCARDED']).optional(),
  usefulValue: z.coerce.number().min(0).max(100).optional(),
  l30Limit: z.coerce.number().min(0).max(100).optional(),
  l60Limit: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
})

type CreateData = z.infer<typeof createSchema>
type UpdateData = z.infer<typeof updateSchema>

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
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [createOpen, setCreateOpen] = useState(false)
  const [editSet, setEditSet] = useState<PunchSet | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: sets = [], isLoading } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets'],
    queryFn: () => api.get('/punch-sets').then((r) => r.data),
  })

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isAdmin,
  })

  const createForm = useForm<CreateData>({
    resolver: zodResolver(createSchema),
    defaultValues: { l30Limit: 30, l60Limit: 60 },
  })

  const updateForm = useForm<UpdateData>({ resolver: zodResolver(updateSchema) })

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => api.post('/punch-sets', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      setCreateOpen(false)
      createForm.reset()
      toast.success('Conjunto criado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Erro ao criar conjunto'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateData) => api.put(`/punch-sets/${editSet!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      setEditSet(null)
      toast.success('Conjunto atualizado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Erro ao atualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/punch-sets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['punch-sets'] }); toast.success('Conjunto removido') },
    onError: () => toast.error('Erro ao remover conjunto'),
  })

  const filtered = statusFilter === 'all' ? sets : sets.filter((s) => s.status === statusFilter)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Conjuntos de Punções</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Cadastro e controle de conjuntos e punções individuais</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Conjunto
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
            {s === 'all' ? 'Todos' : STATUS_LABELS[s as SetStatus]}
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
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-bold mt-0.5">{sets.filter((x) => x.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vida Útil</TableHead>
              <TableHead>Punções</TableHead>
              <TableHead>Ocorrências</TableHead>
              {isAdmin && <TableHead>Empresa</TableHead>}
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum conjunto encontrado</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-medium">{s.code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                </TableCell>
                <TableCell>
                  <UsefulValueBar value={s.usefulValue} l30={s.l30Limit} l60={s.l60Limit} />
                </TableCell>
                <TableCell className="text-muted-foreground">{s._count.punches}</TableCell>
                <TableCell className="text-muted-foreground">{s._count.occurrences}</TableCell>
                {isAdmin && <TableCell className="text-muted-foreground text-xs">{s.company.name}</TableCell>}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/sets/${s.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditSet(s); updateForm.reset({ code: s.code, name: s.name, status: s.status, usefulValue: s.usefulValue, l30Limit: s.l30Limit, l60Limit: s.l60Limit, notes: s.notes ?? '' }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (confirm('Remover este conjunto? Esta ação não pode ser desfeita.')) deleteMutation.mutate(s.id)
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Conjunto</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label>Empresa *</Label>
                <Select onValueChange={(v) => createForm.setValue('companyId', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.companyId && <p className="text-xs text-destructive">{createForm.formState.errors.companyId.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input placeholder="ex: CJ-001" {...createForm.register('code')} />
                {createForm.formState.errors.code && <p className="text-xs text-destructive">{createForm.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="ex: Conjunto A" {...createForm.register('name')} />
                {createForm.formState.errors.name && <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Limite L30% *</Label>
                <Input type="number" step="0.1" {...createForm.register('l30Limit')} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite L60% *</Label>
                <Input type="number" step="0.1" {...createForm.register('l60Limit')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input placeholder="Opcional" {...createForm.register('notes')} />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Conjunto
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editSet} onOpenChange={(o) => !o && setEditSet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Conjunto</DialogTitle></DialogHeader>
          {editSet && (
            <form onSubmit={updateForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input {...updateForm.register('code')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input {...updateForm.register('name')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select defaultValue={editSet.status} onValueChange={(v) => updateForm.setValue('status', v as SetStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="IN_REPAIR">Em Reparo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                      <SelectItem value="DISCARDED">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vida Útil %</Label>
                  <Input type="number" step="0.1" {...updateForm.register('usefulValue')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Limite L30%</Label>
                  <Input type="number" step="0.1" {...updateForm.register('l30Limit')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Limite L60%</Label>
                  <Input type="number" step="0.1" {...updateForm.register('l60Limit')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Motivo da alteração</Label>
                <Input placeholder="Opcional" {...updateForm.register('reason')} />
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input placeholder="Opcional" {...updateForm.register('notes')} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
