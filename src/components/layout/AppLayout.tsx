import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Ruler,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/conjuntos', label: 'Conjuntos', icon: Package },
  { to: '/dimensionamento', label: 'Dimensionamento', icon: Ruler },
  { to: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  { to: '/ciclo-de-vida', label: 'Ciclo de Vida', icon: RefreshCw },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
]

const adminItems = [{ to: '/usuarios', label: 'Usuários', icon: Users }]

export function AppLayout() {
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
            Punch Control
          </h1>
          {user?.company && (
            <p className="text-xs text-sidebar-foreground/60 mt-0.5 truncate">
              {user.company.name}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              <ChevronRight className="h-3 w-3 ml-auto opacity-40" />
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  Administração
                </p>
              </div>
              {adminItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
