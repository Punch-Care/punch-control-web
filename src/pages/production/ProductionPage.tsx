import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Settings, BarChart3, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useAuth } from '@/hooks/useAuth'
import type { ProductionBatch } from '@/types'
import { ProductionConfigsTab } from './ProductionConfigsTab'
import { CepTab } from './CepTab'
import { format } from 'date-fns'

type Tab = 'batches' | 'cep' | 'configs'

export function ProductionPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const { companyId: adminCompanyId } = useAdminCompany()
  const p = t.production
  const [activeTab, setActiveTab] = useState<Tab>('batches')
  const canEdit = user?.role !== 'CLIENT'

  const { data: batches = [], isLoading } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches', adminCompanyId],
    queryFn: () => api.get('/production-batches', { params: { companyId: adminCompanyId } }).then(r => r.data),
    enabled: activeTab === 'batches',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/production-batches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-batches'] }); toast.success(p.deleted) },
    onError: () => toast.error(p.deleteError),
  })

  const tabs = [
    { id: 'batches' as Tab, label: p.tabBatches, icon: FileText },
    { id: 'cep' as Tab, label: p.tabCep, icon: BarChart3 },
    { id: 'configs' as Tab, label: p.tabConfigs, icon: Settings },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{p.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{p.subtitle}</p>
        </div>
        {activeTab === 'batches' && canEdit && (
          <Button size="sm" onClick={() => navigate('/production/new')}>
            <Plus className="h-4 w-4" /> {p.newBatch}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Lotes */}
      {activeTab === 'batches' && (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{p.loteNumero}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{p.dataProducao}</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Conjunto</TableHead>
                <TableHead>{p.kgProduzidos}</TableHead>
                <TableHead className="w-24">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
              ) : batches.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{p.noBatches}</TableCell></TableRow>
              ) : batches.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/production/${b.id}`)}>
                  <TableCell className="font-mono font-semibold">{b.loteNumero}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === 'COMPLETED' ? 'success' : 'secondary'} className="gap-1">
                      {b.status === 'COMPLETED'
                        ? <><CheckCircle2 className="h-3 w-3" />{p.statusCompleted}</>
                        : <><Clock className="h-3 w-3" />{p.statusDraft}</>}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(b.dataProducao), 'dd/MM/yyyy')} {b.horaInicio}
                  </TableCell>
                  <TableCell>{b.product.name}</TableCell>
                  <TableCell>{b.machine.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.punchSet.code}</TableCell>
                  <TableCell>{b.kgProduzidos ? `${b.kgProduzidos} kg` : '—'}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/production/${b.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => { if (confirm(`Remover lote ${b.loteNumero}?`)) deleteMutation.mutate(b.id) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'cep' && <CepTab />}
      {activeTab === 'configs' && <ProductionConfigsTab />}
    </div>
  )
}
