import { Package, AlertTriangle, RefreshCw, TrendingDown, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminContextStore } from '@/store/admin-context.store'
import type { DashboardStats, Occurrence, OccurrenceType, CompanyOverview } from '@/types'

const TYPE_LABELS_PT: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compressão', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Manutenção', OTHER: 'Outro',
}
const TYPE_LABELS_EN: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compression', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Maintenance', OTHER: 'Other',
}
const TYPE_LABELS_ES: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compresión', DIMENSIONAL: 'Dimensional', MAINTENANCE: 'Mantenimiento', OTHER: 'Otro',
}

function CompanyCard({ company, onClick, d }: {
  company: CompanyOverview
  onClick: () => void
  d: ReturnType<typeof useLocale>['t']['dashboard']
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
      onClick={onClick}
    >
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {[company.cidade, company.estado].filter(Boolean).join('/')}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div>
            <p className="text-lg font-bold text-green-600">{company.activeSets}</p>
            <p className="text-xs text-muted-foreground">{d.totalSets}</p>
          </div>
          <div>
            <p className="text-lg font-bold">{company._count.machines}</p>
            <p className="text-xs text-muted-foreground">{d.totalMachines}</p>
          </div>
          <div>
            <p className="text-lg font-bold">{company._count.users}</p>
            <p className="text-xs text-muted-foreground">{d.totalUsers}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsDashboard({ companyId, d, TYPE_LABELS }: {
  companyId?: string
  d: ReturnType<typeof useLocale>['t']['dashboard']
  TYPE_LABELS: Record<OccurrenceType, string>
}) {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['stats-dashboard', companyId],
    queryFn: () => api.get('/stats/dashboard', { params: companyId ? { companyId } : {} }).then((r) => r.data),
  })

  const { data: recentOccurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['occurrences-open', companyId],
    queryFn: () =>
      api.get('/occurrences', { params: { status: 'OPEN', ...(companyId ? { companyId } : {}) } }).then((r) => r.data),
  })

  const cards = [
    { label: d.activeSets,      value: stats?.active ?? '—',          icon: Package,       color: 'text-green-500' },
    { label: d.inRepair,        value: stats?.inRepair ?? '—',        icon: RefreshCw,     color: 'text-yellow-500' },
    { label: d.openOccurrences, value: stats?.openOccurrences ?? '—', icon: AlertTriangle, color: 'text-red-500' },
    { label: d.criticalLife,    value: stats?.lowUsefulValue ?? '—',  icon: TrendingDown,  color: 'text-orange-500' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{d.statusDist}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.statusDistribution.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%" cy="45%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={2}
                  >
                    {stats.statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [String(value), String(name)]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                {d.noSets}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {d.openOccTitle}
              {recentOccurrences.length > 0 && (
                <Badge variant="destructive">{recentOccurrences.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOccurrences.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{d.noOccurrences}</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {recentOccurrences.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-start gap-2 text-sm">
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
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm">
              <strong>{stats.lowUsefulValue}</strong> {d.l30Alert}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const d = t.dashboard
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const { selectedCompany, setSelectedCompany } = useAdminContextStore()

  const TYPE_LABELS =
    locale === 'en' ? TYPE_LABELS_EN : locale === 'es' ? TYPE_LABELS_ES : TYPE_LABELS_PT

  const { data: companiesOverview = [] } = useQuery<CompanyOverview[]>({
    queryKey: ['stats-companies'],
    queryFn: () => api.get('/stats/companies').then((r) => r.data),
    enabled: isAdmin,
  })

  const handleSelectCompany = (company: CompanyOverview) => {
    setSelectedCompany(company)
    navigate('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{d.title}</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {d.welcome}, {user?.name}
          {!isAdmin && user?.company && (
            <span className="ml-1 text-muted-foreground/70">— {user.company.name}</span>
          )}
          {isAdmin && selectedCompany && (
            <span className="ml-1 text-primary font-medium">— {selectedCompany.name}</span>
          )}
        </p>
      </div>

      {/* Admin sem empresa selecionada: mostra cards de empresas */}
      {isAdmin && !selectedCompany && (
        <>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">{d.companiesOverview}</p>
            <p className="text-xs text-muted-foreground mb-3">{d.clickCompany}</p>
            {companiesOverview.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.companies.noCompanies}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {companiesOverview.map((c) => (
                  <CompanyCard
                    key={c.id}
                    company={c}
                    onClick={() => handleSelectCompany(c)}
                    d={d}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-muted-foreground mb-4">Visão Consolidada</p>
            <StatsDashboard d={d} TYPE_LABELS={TYPE_LABELS} />
          </div>
        </>
      )}

      {/* Admin com empresa selecionada OU usuário de empresa */}
      {(!isAdmin || selectedCompany) && (
        <StatsDashboard
          companyId={selectedCompany?.id}
          d={d}
          TYPE_LABELS={TYPE_LABELS}
        />
      )}
    </div>
  )
}
