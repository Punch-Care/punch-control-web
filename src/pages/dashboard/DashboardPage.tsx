import { Package, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

const summaryCards = [
  { label: 'Conjuntos Ativos', value: '—', icon: Package, color: 'text-orange-500' },
  { label: 'Em Reparo', value: '—', icon: RefreshCw, color: 'text-yellow-500' },
  { label: 'Ocorrências Abertas', value: '—', icon: AlertTriangle, color: 'text-red-500' },
  { label: 'Descartados (30d)', value: '—', icon: Activity, color: 'text-slate-400' },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bem-vindo, {user?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Módulos em desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>✓ Autenticação e gestão de usuários</li>
            <li>○ Cadastro de Conjuntos e Punções</li>
            <li>○ Controle de Dimensionamento</li>
            <li>○ Controle de Ocorrências</li>
            <li>○ Ciclo de Vida do Conjunto</li>
            <li>○ Relatórios e Exportação</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
