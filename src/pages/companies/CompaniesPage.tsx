import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { useAdminContextStore } from '@/store/admin-context.store'
import type { Company } from '@/types'
import { CompanyForm, type CompanyFormData as FormData } from './CompanyForm'

export function CompaniesPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const navigate = useNavigate()
  const { setSelectedCompany } = useAdminContextStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  // Entra no contexto da empresa e leva à gestão de usuários dela
  const enterCompany = (c: Company) => {
    setSelectedCompany({
      id: c.id,
      name: c.name,
      cnpj: c.cnpj,
      cidade: c.cidade,
      estado: c.estado,
      activeSets: 0,
      openOccurrences: 0,
      _count: { punchSets: 0, machines: 0, users: c._count.users },
    })
    navigate('/users')
  }

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

      <div className="rounded-xl border overflow-x-auto">
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
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => enterCompany(c)}>
                      <LogIn className="h-4 w-4" /> {t.companies.access}
                    </Button>
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
