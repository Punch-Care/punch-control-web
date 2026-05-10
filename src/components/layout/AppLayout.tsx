import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Box,
  Ruler,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  Building2,
  Cog,
  FlaskConical,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminContextStore } from '@/store/admin-context.store'
import { Button } from '@/components/ui/button'
import { DeveloperCredit } from '@/components/layout/DeveloperCredit'
import { AccessibilityButton } from '@/components/layout/AccessibilityPanel'

interface NavItem { to: string; labelKey: keyof ReturnType<typeof useLocale>['t']['nav']; icon: React.ElementType }

const operationalItems: NavItem[] = [
  { to: '/sets',         labelKey: 'sets',         icon: Package },
  { to: '/products',     labelKey: 'products',     icon: Box },
  { to: '/machines',     labelKey: 'machines',     icon: Cog },
  { to: '/production',   labelKey: 'production',   icon: FlaskConical },
  { to: '/dimensioning', labelKey: 'dimensioning', icon: Ruler },
  { to: '/occurrences',  labelKey: 'occurrences',  icon: AlertTriangle },
  { to: '/lifecycle',    labelKey: 'lifecycle',    icon: RefreshCw },
  { to: '/reports',      labelKey: 'reports',      icon: FileText },
]

const adminOnlyItems: NavItem[] = [
  { to: '/companies', labelKey: 'companies', icon: Building2 },
  { to: '/users',     labelKey: 'users',     icon: Users },
]

function NavItemLink({ to, icon: Icon, label, onNavigate }: {
  to: string
  icon: React.ElementType
  label: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
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
  )
}

interface SidebarContentProps {
  isAdmin: boolean
  onNavigate?: () => void
}

function SidebarContent({ isAdmin, onNavigate }: SidebarContentProps) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { selectedCompany, clearSelectedCompany } = useAdminContextStore()

  const handleBackToOverview = () => {
    clearSelectedCompany()
    navigate('/dashboard')
    onNavigate?.()
  }

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
      {/* Dashboard sempre visível */}
      <NavItemLink to="/dashboard" icon={LayoutDashboard} label={t.nav.dashboard} onNavigate={onNavigate} />

      {isAdmin && !selectedCompany ? (
        /* Admin sem empresa selecionada: só admin pages */
        <>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              {t.nav.admin}
            </p>
          </div>
          {adminOnlyItems.map(({ to, labelKey, icon: Icon }) => (
            <NavItemLink key={to} to={to} icon={Icon} label={t.nav[labelKey]} onNavigate={onNavigate} />
          ))}
        </>
      ) : isAdmin && selectedCompany ? (
        /* Admin com empresa selecionada: menu completo da empresa */
        <>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider truncate">
              {selectedCompany.name}
            </p>
          </div>
          {operationalItems.map(({ to, labelKey, icon: Icon }) => (
            <NavItemLink key={to} to={to} icon={Icon} label={t.nav[labelKey]} onNavigate={onNavigate} />
          ))}
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              {t.nav.admin}
            </p>
          </div>
          {adminOnlyItems.map(({ to, labelKey, icon: Icon }) => (
            <NavItemLink key={to} to={to} icon={Icon} label={t.nav[labelKey]} onNavigate={onNavigate} />
          ))}
          <div className="pt-3 px-1">
            <button
              type="button"
              onClick={handleBackToOverview}
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Todas as empresas
            </button>
          </div>
        </>
      ) : (
        /* Usuário de empresa (COMPANY / CLIENT): menu operacional completo */
        <>
          {operationalItems.map(({ to, labelKey, icon: Icon }) => (
            <NavItemLink key={to} to={to} icon={Icon} label={t.nav[labelKey]} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { t } = useLocale()
  const { selectedCompany } = useAdminContextStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 bg-sidebar flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Punch Control</h1>
          {/* Empresa do usuário comum */}
          {!isAdmin && user?.company && (
            <p className="text-xs text-sidebar-foreground/60 mt-0.5 truncate">{user.company.name}</p>
          )}
          {/* Admin com empresa selecionada */}
          {isAdmin && selectedCompany && (
            <p className="text-xs text-primary/80 mt-0.5 truncate font-medium">{selectedCompany.name}</p>
          )}
          {/* Admin sem empresa selecionada */}
          {isAdmin && !selectedCompany && (
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">Punch Care · Admin</p>
          )}
        </div>

        <SidebarContent isAdmin={isAdmin} />

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
          <AccessibilityButton />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.nav.logout}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity',
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar flex flex-col md:hidden transition-transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Punch Control</h1>
            {isAdmin && selectedCompany && (
              <p className="text-xs text-primary/80 mt-0.5 truncate font-medium">{selectedCompany.name}</p>
            )}
          </div>
          <button
            type="button"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarContent isAdmin={isAdmin} onNavigate={() => setMobileMenuOpen(false)} />

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <AccessibilityButton />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.nav.logout}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border px-4 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">
            {isAdmin && selectedCompany ? selectedCompany.name : 'Punch Control'}
          </p>
          <Button variant="ghost" size="sm" onClick={logout} className="h-8 px-2">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
        <footer className="border-t border-border px-4 py-3 sm:px-6">
          <DeveloperCredit />
        </footer>
      </div>
    </div>
  )
}
