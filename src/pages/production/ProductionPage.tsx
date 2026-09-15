import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, FileText, Settings, BarChart3, Pencil, Trash2, CopyPlus,
  CheckCircle2, Clock, FlaskConical, ChevronRight, ArrowRight,
  Printer, PenLine, Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { parseDateOnly, matchesSearch } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { ProductionBatch } from '@/types'
import { ProductionConfigsTab } from './ProductionConfigsTab'
import { CepTab } from './CepTab'
import { HelpButton } from '@/components/ui/help-button'

type Tab = 'batches' | 'cep' | 'configs'

// ── Empty state guiado ─────────────────────────────────────────────────────────

function EmptyBatches({ navigate, canEdit }: { navigate: ReturnType<typeof useNavigate>; canEdit: boolean }) {
  const pp = useLocale().t.productionPage
  const steps = [
    { num: '1', label: pp.step1, desc: pp.step1Desc, path: '/machines', done: false },
    { num: '2', label: pp.step2, desc: pp.step2Desc, path: '/sets', done: false },
    { num: '3', label: pp.step3, desc: pp.step3Desc, path: null, action: 'configs', done: false },
    { num: '4', label: pp.step4, desc: pp.step4Desc, path: '/production/new', done: false },
  ]

  return (
    <div className="py-8 px-4 max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{pp.welcome}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {pp.welcomeDesc}
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-muted/40 rounded-xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{pp.howItWorks}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: Printer,  title: pp.how1, desc: pp.how1Desc },
            { icon: PenLine,  title: pp.how2, desc: pp.how2Desc },
            { icon: Monitor,  title: pp.how3, desc: pp.how3Desc },
          ].map(item => (
            <div key={item.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passos para começar */}
      {canEdit && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{pp.getStarted}</p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-muted/30 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {step.path ? (
                  <Button size="sm" variant={i === 3 ? 'default' : 'outline'} onClick={() => navigate(step.path!)}>
                    {i === 3 ? <><Plus className="h-3.5 w-3.5" /> {pp.createLot}</> : <>{pp.go} <ArrowRight className="h-3.5 w-3.5" /></>}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs cursor-default">{pp.thisTabConfigs}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export function ProductionPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const { companyId: adminCompanyId } = useAdminCompany()
  const p = t.production
  const pp = t.productionPage
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const param = searchParams.get('tab')
    if (param === 'configs' || param === 'cep' || param === 'batches') return param
    return 'batches'
  })
  // Técnico (CLIENT) também registra lotes; só a exclusão fica com o gestor
  const canEdit = true
  const { canManage } = usePermissions()

  const { data: batches = [], isLoading } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches', adminCompanyId],
    queryFn: () => api.get('/production-batches', { params: { companyId: adminCompanyId } }).then(r => r.data),
    enabled: activeTab === 'batches',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/production-batches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-batches'] }); toast.success(p.deleted) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? p.deleteError),
  })

  const tabs = [
    { id: 'batches' as Tab, label: p.tabBatches, icon: FileText },
    { id: 'cep' as Tab, label: p.tabCep, icon: BarChart3 },
    { id: 'configs' as Tab, label: p.tabConfigs, icon: Settings },
  ]

  const hasData = !isLoading && batches.length > 0
  const [busca, setBusca] = useState('')
  const lotesVisiveis = batches.filter((b) => matchesSearch(busca, [b.loteNumero, b.product.name, b.machine.name, b.punchSet.code, b.punchSet.name]))

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Cabeçalho da página */}
      <div className="bg-background border-b px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold tracking-tight">{p.title}</h2>
          <HelpButton content={t.moduleHelp.production} size="sm" />
        </div>
              <p className="text-xs text-muted-foreground">{p.subtitle}</p>
            </div>
          </div>
          {activeTab === 'batches' && canEdit && hasData && (
            <Button onClick={() => navigate('/production/new')}>
              <Plus className="h-4 w-4" /> {p.newBatch}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-background border-b px-4 sm:px-6">
        <div className="flex gap-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 sm:p-6">

        {/* ── Aba Lotes ───────────────────────────────────────────────── */}
        {activeTab === 'batches' && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                {t.common.loading}
              </div>
            )}

            {!isLoading && batches.length === 0 && (
              <EmptyBatches navigate={navigate} canEdit={canEdit} />
            )}

            {hasData && (
              <div className="space-y-3">
                {/* Resumo rápido */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: pp.totalLots, value: batches.length, color: 'text-foreground' },
                    { label: pp.completed, value: batches.filter(b => b.status === 'COMPLETED').length, color: 'text-green-600' },
                    { label: pp.drafts, value: batches.filter(b => b.status === 'DRAFT').length, color: 'text-muted-foreground' },
                  ].map(s => (
                    <Card key={s.label} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <SearchInput value={busca} onChange={setBusca} placeholder={t.search.batches} />

                {/* Tabela */}
                <div className="rounded-xl border bg-background shadow-sm overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">{pp.colLot}</TableHead>
                        <TableHead className="font-semibold">{t.common.status}</TableHead>
                        <TableHead className="font-semibold">{pp.colDate}</TableHead>
                        <TableHead className="font-semibold">{pp.colProduct}</TableHead>
                        <TableHead className="font-semibold">{pp.colMachine}</TableHead>
                        <TableHead className="font-semibold">{pp.colSet}</TableHead>
                        <TableHead className="font-semibold">KG</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotesVisiveis.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t.search.noResults}</TableCell></TableRow>
                      )}
                      {lotesVisiveis.map((b) => (
                        <TableRow
                          key={b.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => navigate(`/production/${b.id}`)}
                        >
                          <TableCell className="font-mono font-bold text-primary">{b.loteNumero}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === 'COMPLETED' ? 'success' : 'secondary'} className="gap-1 text-xs">
                              {b.status === 'COMPLETED'
                                ? <><CheckCircle2 className="h-3 w-3" /> {pp.statusCompleted}</>
                                : <><Clock className="h-3 w-3" /> {pp.statusDraft}</>}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(parseDateOnly(b.dataProducao), 'dd/MM/yyyy')}
                            <span className="ml-1 text-muted-foreground/60">{b.horaInicio}</span>
                          </TableCell>
                          <TableCell className="text-sm">{b.product.name}</TableCell>
                          <TableCell className="text-sm">{b.machine.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{b.punchSet.code}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {b.kgProduzidos ? `${b.kgProduzidos} kg` : '—'}
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/production/${b.id}`)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  title={pp.duplicateLot}
                                  onClick={() => navigate(
                                    `/production/new?productId=${b.productId}&machineId=${b.machineId}&setId=${b.punchSetId}`,
                                  )}
                                >
                                  <CopyPlus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => { if (confirm(`Remover lote ${b.loteNumero}?`)) deleteMutation.mutate(b.id) }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground/40 self-center" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'cep' && <CepTab />}
        {activeTab === 'configs' && <ProductionConfigsTab />}
      </div>
    </div>
  )
}
