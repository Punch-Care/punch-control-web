import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, RefreshCw, TrendingDown, Building2, Plus, FlaskConical, Ruler, FileText, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminContextStore } from '@/store/admin-context.store'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { DashboardStats, Occurrence, OccurrenceType, CompanyOverview, ProductionBatch } from '@/types'

const TYPE_LABELS_PT: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compressão', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Manutenção', OTHER: 'Outro',
}
const TYPE_LABELS_EN: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compression', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Maintenance', OTHER: 'Other',
}
const TYPE_LABELS_ES: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compresión', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Mantenimiento', OTHER: 'Otro',
}

// ── Card de empresa (admin) ────────────────────────────────────────────────────

function CompanyCard({ company, onClick, d }: {
  company: CompanyOverview
  onClick: () => void
  d: ReturnType<typeof useLocale>['t']['dashboard']
}) {
  return (
    <Card className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <CardTitle className="text-sm font-semibold truncate">{company.name}</CardTitle>
          </div>
          {company.openOccurrences > 0 && (
            <Badge variant="destructive" className="text-xs flex-shrink-0">{company.openOccurrences}</Badge>
          )}
        </div>
        {(company.cidade || company.estado) && (
          <p className="text-xs text-muted-foreground mt-0.5">{[company.cidade, company.estado].filter(Boolean).join('/')}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div><p className="text-lg font-bold text-green-600">{company.activeSets}</p><p className="text-xs text-muted-foreground">{d.totalSets}</p></div>
          <div><p className="text-lg font-bold">{company._count.machines}</p><p className="text-xs text-muted-foreground">{d.totalMachines}</p></div>
          <div><p className="text-lg font-bold">{company._count.users}</p><p className="text-xs text-muted-foreground">{d.totalUsers}</p></div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Stats + gráficos ───────────────────────────────────────────────────────────

function StatsSection({ companyId, d, TYPE_LABELS }: {
  companyId?: string
  d: ReturnType<typeof useLocale>['t']['dashboard']
  TYPE_LABELS: Record<OccurrenceType, string>
}) {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['stats-dashboard', companyId],
    queryFn: () => api.get('/stats/dashboard', { params: companyId ? { companyId } : {} }).then(r => r.data),
  })
  const { data: openOccurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['occurrences-open', companyId],
    queryFn: () => api.get('/occurrences', { params: { status: 'OPEN', ...(companyId ? { companyId } : {}) } }).then(r => r.data),
  })

  const cards = [
    { label: d.activeSets,      value: stats?.active ?? '—',          icon: Package,       color: 'text-green-500',  bg: 'bg-green-50' },
    { label: d.inRepair,        value: stats?.inRepair ?? '—',        icon: RefreshCw,     color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: d.openOccurrences, value: stats?.openOccurrences ?? '—', icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50' },
    { label: d.criticalLife,    value: stats?.lowUsefulValue ?? '—',  icon: TrendingDown,  color: 'text-orange-500', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{d.statusDist}</CardTitle></CardHeader>
          <CardContent>
            {stats && stats.statusDistribution.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.statusDistribution} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {stats.statusDistribution.map(entry => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [String(v), String(n)]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">{d.noSets}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {d.openOccTitle}
              {openOccurrences.length > 0 && <Badge variant="destructive">{openOccurrences.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openOccurrences.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                {d.noOccurrences}
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {openOccurrences.slice(0, 8).map(o => (
                  <div key={o.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/40 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{o.set.code} — {o.set.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{TYPE_LABELS[o.type]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats && stats.lowUsefulValue > 0 && (
        <Card className="border-orange-200 bg-orange-50/60 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm"><strong>{stats.lowUsefulValue}</strong> {d.l30Alert}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Ações rápidas (usuário de empresa) ────────────────────────────────────────

function QuickActions({ navigate, canEdit, lastBatches }: {
  navigate: ReturnType<typeof useNavigate>
  canEdit: boolean
  lastBatches: ProductionBatch[]
}) {
  const actions = [
    {
      icon: FlaskConical,
      label: 'Novo Lote de Produção',
      desc: 'Registrar um novo lote CEP para acompanhamento',
      color: 'bg-primary text-primary-foreground',
      onClick: () => navigate('/production/new'),
      primary: true,
      show: canEdit,
    },
    {
      icon: AlertTriangle,
      label: 'Registrar Ocorrência',
      desc: 'Abrir uma ocorrência em um conjunto de punções',
      color: 'bg-red-50 text-red-700 border border-red-200',
      onClick: () => navigate('/occurrences'),
      primary: false,
      show: canEdit,
    },
    {
      icon: Ruler,
      label: 'Novo Dimensionamento',
      desc: 'Registrar medições dimensionais de um conjunto',
      color: 'bg-blue-50 text-blue-700 border border-blue-200',
      onClick: () => navigate('/dimensioning'),
      primary: false,
      show: true,
    },
    {
      icon: FileText,
      label: 'Ver Relatórios',
      desc: 'Exportar dados em CSV ou PDF',
      color: 'bg-muted text-foreground border border-border',
      onClick: () => navigate('/reports'),
      primary: false,
      show: true,
    },
  ].filter(a => a.show)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm ${a.color}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.primary ? 'bg-white/20' : 'bg-white'}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{a.label}</p>
                <p className={`text-xs mt-0.5 ${a.primary ? 'text-white/70' : 'text-muted-foreground'}`}>{a.desc}</p>
              </div>
              <ChevronRight className={`h-4 w-4 ml-auto flex-shrink-0 ${a.primary ? 'text-white/50' : 'text-muted-foreground/40'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Lotes recentes */}
      {lastBatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lotes recentes</h3>
            <button onClick={() => navigate('/production')} className="text-xs text-primary hover:underline">Ver todos</button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {lastBatches.slice(0, 5).map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/production/${b.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors ${i < lastBatches.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold">{b.loteNumero}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.product.name} · {b.machine.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={b.status === 'COMPLETED' ? 'success' : 'secondary'} className="text-xs mb-0.5">
                      {b.status === 'COMPLETED' ? 'Concluído' : 'Rascunho'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{format(new Date(b.dataProducao), 'dd/MM')}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {lastBatches.length === 0 && (
        <Card className="border-dashed bg-muted/30 shadow-none">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-sm">Nenhum lote registrado ainda</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Crie o primeiro lote de produção para começar a usar o CEP</p>
            {canEdit && (
              <Button size="sm" onClick={() => navigate('/production/new')}>
                <Plus className="h-3.5 w-3.5" /> Criar primeiro lote
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const d = t.dashboard
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canEdit = user?.role !== 'CLIENT'

  const { selectedCompany, setSelectedCompany } = useAdminContextStore()

  const TYPE_LABELS =
    locale === 'en' ? TYPE_LABELS_EN : locale === 'es' ? TYPE_LABELS_ES : TYPE_LABELS_PT

  const { data: companiesOverview = [] } = useQuery<CompanyOverview[]>({
    queryKey: ['stats-companies'],
    queryFn: () => api.get('/stats/companies').then(r => r.data),
    enabled: isAdmin,
  })

  const { data: recentBatches = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches-recent'],
    queryFn: () => api.get('/production-batches').then(r => r.data),
    enabled: !isAdmin,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Cabeçalho personalizado */}
      <div className="bg-background border-b px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
            {greeting}, {user?.name?.split(' ')[0]}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isAdmin && !selectedCompany ? 'Visão Geral — Punch Control' : (selectedCompany?.name ?? user?.company?.name ?? 'Dashboard')}
          </h1>
          {!isAdmin && user?.company && (
            <p className="text-sm text-muted-foreground mt-0.5">{user.company.name}</p>
          )}
          {isAdmin && selectedCompany && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{d.viewingCompany}</Badge>
              <button onClick={() => setSelectedCompany(null)} className="text-xs text-primary hover:underline">{d.backToOverview}</button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── ADMIN sem empresa selecionada ─────────────────────────── */}
        {isAdmin && !selectedCompany && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{d.companiesOverview}</p>
              <p className="text-sm text-muted-foreground mb-4">{d.clickCompany}</p>
              {companiesOverview.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.companies.noCompanies}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companiesOverview.map(c => (
                    <CompanyCard key={c.id} company={c} onClick={() => setSelectedCompany(c)} d={d} />
                  ))}
                </div>
              )}
            </div>
            <div className="border-t pt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Consolidado geral</p>
              <StatsSection d={d} TYPE_LABELS={TYPE_LABELS} />
            </div>
          </div>
        )}

        {/* ── ADMIN com empresa selecionada ─────────────────────────── */}
        {isAdmin && selectedCompany && (
          <StatsSection companyId={selectedCompany.id} d={d} TYPE_LABELS={TYPE_LABELS} />
        )}

        {/* ── USUÁRIO DE EMPRESA ────────────────────────────────────── */}
        {!isAdmin && (
          <div className="space-y-6">
            <OnboardingWizard />
            <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6">
              <div className="lg:col-span-2 order-1">
                <QuickActions navigate={navigate} canEdit={canEdit} lastBatches={recentBatches} />
              </div>
              <div className="lg:col-span-3 order-2">
                <StatsSection d={d} TYPE_LABELS={TYPE_LABELS} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
