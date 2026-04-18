import { Package, AlertTriangle, RefreshCw, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { DashboardStats, Occurrence } from '@/types'

const TYPE_LABELS = {
  COMPRESSION: 'Compressão',
  DIMENSIONAL: 'Dimensional',
  MAINTENANCE: 'Manutenção',
  OTHER: 'Outro',
} as const

export function DashboardPage() {
  const { user } = useAuth()

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['stats-dashboard'],
    queryFn: () => api.get('/stats/dashboard').then((r) => r.data),
  })

  const { data: recentOccurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['occurrences-open'],
    queryFn: () => api.get('/occurrences', { params: { status: 'OPEN' } }).then((r) => r.data),
  })

  const cards = [
    { label: 'Conjuntos Ativos', value: stats?.active ?? '—', icon: Package, color: 'text-green-500' },
    { label: 'Em Reparo', value: stats?.inRepair ?? '—', icon: RefreshCw, color: 'text-yellow-500' },
    { label: 'Ocorrências Abertas', value: stats?.openOccurrences ?? '—', icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Vida Útil Crítica', value: stats?.lowUsefulValue ?? '—', icon: TrendingDown, color: 'text-orange-500' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bem-vindo, {user?.name}
          {user?.company && <span className="ml-1 text-muted-foreground/70">— {user.company.name}</span>}
        </p>
      </div>

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
        {/* Status pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.statusDistribution.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                    labelLine={false}
                  >
                    {stats.statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum conjunto cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent open occurrences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Ocorrências Abertas
              {recentOccurrences.length > 0 && (
                <Badge variant="destructive">{recentOccurrences.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOccurrences.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma ocorrência aberta</p>
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
              <strong>{stats.lowUsefulValue}</strong> conjunto{stats.lowUsefulValue > 1 ? 's' : ''} com vida útil abaixo do limite L30% — verifique na seção de Conjuntos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
