import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, FileText, Settings, BarChart3,
  CheckCircle2, Clock, FlaskConical, ArrowRight,
  Tablet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import type { ProductionBatch } from '@/types'
import { ProductionConfigsTab } from './ProductionConfigsTab'
import { CepTab } from './CepTab'
import { HelpButton } from '@/components/ui/help-button'
import { BatchList } from './BatchList'

type Tab = 'batches' | 'cep' | 'configs'

// ── Empty state guiado ─────────────────────────────────────────────────────────

function EmptyBatches({ navigate, canEdit, onOpenConfigs }: { navigate: ReturnType<typeof useNavigate>; canEdit: boolean; onOpenConfigs: () => void }) {
  const pp = useLocale().t.productionPage
  const steps = [
    { num: '1', label: pp.step1, desc: pp.step1Desc, path: '/machines', done: false },
    { num: '2', label: pp.step2, desc: pp.step2Desc, path: '/sets', done: false },
    { num: '3', label: pp.step3, desc: pp.step3Desc, path: null, action: 'configs', done: false },
    { num: '4', label: pp.step4, desc: pp.step4Desc, path: '/operador/lote/novo/maquina', done: false },
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
            { icon: Tablet,       title: pp.how1, desc: pp.how1Desc },
            { icon: Clock,        title: pp.how2, desc: pp.how2Desc },
            { icon: CheckCircle2, title: pp.how3, desc: pp.how3Desc },
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
                  <Button size="sm" variant="outline" onClick={onOpenConfigs}>{pp.thisTabConfigs} <ArrowRight className="h-3.5 w-3.5" /></Button>
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
  const { t } = useLocale()
  const { companyId: adminCompanyId } = useAdminCompany()
  const p = t.production
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const param = searchParams.get('tab')
    if (param === 'configs' || param === 'cep' || param === 'batches') return param
    return 'batches'
  })
  // Técnico (CLIENT) também registra lotes; só a exclusão fica com o gestor
  const canEdit = true

  const { data: batches = [], isLoading } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches', adminCompanyId],
    queryFn: () => api.get('/production-batches', { params: { companyId: adminCompanyId } }).then(r => r.data),
    enabled: activeTab === 'batches',
  })

  const tabs = [
    { id: 'batches' as Tab, label: p.tabBatches, icon: FileText },
    { id: 'cep' as Tab, label: p.tabCep, icon: BarChart3 },
    { id: 'configs' as Tab, label: p.tabConfigs, icon: Settings },
  ]

  const hasData = !isLoading && batches.length > 0

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Cabeçalho da página */}
      <div className="bg-background border-b px-4 sm:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              <Button variant="ghost" className="text-muted-foreground" title={t.batchPage.oldBatchHint} onClick={() => navigate('/production/new')}>
                {t.batchPage.oldBatch}
              </Button>
              <Button onClick={() => navigate('/operador/lote/novo/maquina')}>
                <Plus className="h-4 w-4" /> {t.batchPage.startBatch}
              </Button>
            </div>
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
              <EmptyBatches navigate={navigate} canEdit={canEdit} onOpenConfigs={() => setActiveTab('configs')} />
            )}

            {hasData && <BatchList batches={batches} />}
          </>
        )}

        {activeTab === 'cep' && <CepTab />}
        {activeTab === 'configs' && <ProductionConfigsTab />}
      </div>
    </div>
  )
}
