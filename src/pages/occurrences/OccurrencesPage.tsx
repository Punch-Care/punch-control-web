import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Loader2 } from 'lucide-react'
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
import type { Occurrence, OccurrenceStatus, OccurrenceType, PunchSet, Machine, Product } from '@/types'

const TYPE_LABELS: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compressão',
  DIMENSIONAL: 'Dimensional',
  MAINTENANCE: 'Manutenção',
  OTHER: 'Outro',
}

const STATUS_LABELS: Record<OccurrenceStatus, string> = {
  OPEN: 'Aberta',
  MONITORING: 'Monitoramento',
  CLOSED: 'Encerrada',
}

const STATUS_VARIANTS: Record<OccurrenceStatus, 'destructive' | 'warning' | 'success'> = {
  OPEN: 'destructive',
  MONITORING: 'warning',
  CLOSED: 'success',
}

const createSchema = z.object({
  setId: z.string().uuid('Selecione o conjunto'),
  machineId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: z.enum(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER']),
  description: z.string().min(5, 'Descreva a ocorrência'),
})

const updateSchema = z.object({
  status: z.enum(['OPEN', 'MONITORING', 'CLOSED']).optional(),
  type: z.enum(['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER']).optional(),
  description: z.string().min(5).optional(),
  resolution: z.string().optional(),
})

type CreateData = z.infer<typeof createSchema>
type UpdateData = z.infer<typeof updateSchema>

export function OccurrencesPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOcc, setEditOcc] = useState<Occurrence | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: occurrences = [], isLoading } = useQuery<Occurrence[]>({
    queryKey: ['occurrences', statusFilter],
    queryFn: () => api.get('/occurrences', { params: statusFilter !== 'all' ? { status: statusFilter } : {} }).then((r) => r.data),
  })

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets'],
    queryFn: () => api.get('/punch-sets').then((r) => r.data),
  })

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines'],
    queryFn: () => api.get('/occurrences/machines').then((r) => r.data),
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/occurrences/products').then((r) => r.data),
  })

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) })
  const updateForm = useForm<UpdateData>({ resolver: zodResolver(updateSchema) })

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => api.post('/occurrences', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      setCreateOpen(false)
      createForm.reset()
      toast.success('Ocorrência registrada')
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Erro ao registrar'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateData) => api.put(`/occurrences/${editOcc!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      setEditOcc(null)
      toast.success('Ocorrência atualizada')
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Erro ao atualizar'),
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ocorrências</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Registro e acompanhamento de ocorrências</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nova Ocorrência
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Abertas</p><p className="text-2xl font-bold text-red-500">{occurrences.filter((o) => o.status === 'OPEN').length}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Em Monitoramento</p><p className="text-2xl font-bold text-yellow-500">{occurrences.filter((o) => o.status === 'MONITORING').length}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Encerradas</p><p className="text-2xl font-bold text-green-500">{occurrences.filter((o) => o.status === 'CLOSED').length}</p></CardContent></Card>
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
            {s === 'all' ? 'Todas' : STATUS_LABELS[s as OccurrenceStatus]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conjunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Aberta em</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : occurrences.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência encontrada</TableCell></TableRow>
            ) : occurrences.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="font-medium font-mono text-xs">{o.set.code}</p>
                  <p className="text-xs text-muted-foreground">{o.set.name}</p>
                </TableCell>
                <TableCell><Badge variant="secondary">{TYPE_LABELS[o.type]}</Badge></TableCell>
                <TableCell><Badge variant={STATUS_VARIANTS[o.status]}>{STATUS_LABELS[o.status]}</Badge></TableCell>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Ocorrência</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Conjunto *</Label>
              <Select onValueChange={(v) => createForm.setValue('setId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o conjunto" /></SelectTrigger>
                <SelectContent>
                  {sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {createForm.formState.errors.setId && <p className="text-xs text-destructive">{createForm.formState.errors.setId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select onValueChange={(v) => createForm.setValue('type', v as OccurrenceType)}>
                <SelectTrigger><SelectValue placeholder="Tipo de ocorrência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPRESSION">Compressão</SelectItem>
                  <SelectItem value="DIMENSIONAL">Dimensional</SelectItem>
                  <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Máquina</Label>
                <Select onValueChange={(v) => createForm.setValue('machineId', v)}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Produto</Label>
                <Select onValueChange={(v) => createForm.setValue('productId', v)}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Descreva a ocorrência" {...createForm.register('description')} />
              {createForm.formState.errors.description && <p className="text-xs text-destructive">{createForm.formState.errors.description.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Ocorrência
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit/update dialog */}
      <Dialog open={!!editOcc} onOpenChange={(o) => !o && setEditOcc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Atualizar Ocorrência</DialogTitle></DialogHeader>
          {editOcc && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{editOcc.set.code} — {editOcc.set.name}</p>
                <p className="text-muted-foreground mt-0.5">{editOcc.description}</p>
              </div>
              <form onSubmit={updateForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select defaultValue={editOcc.status} onValueChange={(v) => updateForm.setValue('status', v as OccurrenceStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Aberta</SelectItem>
                        <SelectItem value="MONITORING">Monitoramento</SelectItem>
                        <SelectItem value="CLOSED">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select defaultValue={editOcc.type} onValueChange={(v) => updateForm.setValue('type', v as OccurrenceType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPRESSION">Compressão</SelectItem>
                        <SelectItem value="DIMENSIONAL">Dimensional</SelectItem>
                        <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Resolução</Label>
                  <Input placeholder="Descreva a resolução" {...updateForm.register('resolution')} />
                </div>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
