import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Box, Ruler, AlertTriangle,
  RefreshCw, FileText, Users, Building2, Cog, FlaskConical,
  LogOut, ChevronLeft, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminContextStore } from '@/store/admin-context.store'
import { Button } from '@/components/ui/button'
import { DeveloperCredit } from '@/components/layout/DeveloperCredit'
import { AccessibilityButton } from '@/components/layout/AccessibilityPanel'

type NavKey = keyof ReturnType<typeof useLocale>['t']['nav']

interface NavItem { to: string; labelKey: NavKey; icon: React.ElementType }
interface NavGroup { groupKey: NavKey; items: NavItem[] }

// ── Grupos do menu operacional ─────────────────────────────────────────────────

const GROUPS_COMPANY: NavGroup[] = [
  {
    groupKey: 'groupCadastro',
    items: [
      { to: '/sets',      labelKey: 'sets',      icon: Package },
      { to: '/machines',  labelKey: 'machines',  icon: Cog },
      { to: '/products',  labelKey: 'products',  icon: Box },
    ],
  },
  {
    groupKey: 'groupProducao',
    items: [
      { to: '/production', labelKey: 'production', icon: FlaskConical },
    ],
  },
  {
    groupKey: 'groupQualidade',
    items: [
      { to: '/occurrences',  labelKey: 'occurrences',  icon: AlertTriangle },
      { to: '/dimensioning', labelKey: 'dimensioning', icon: Ruler },
      { to: '/lifecycle',    labelKey: 'lifecycle',    icon: RefreshCw },
    ],
  },
  {
    groupKey: 'groupInteligencia',
    items: [
      { to: '/reports', labelKey: 'reports', icon: FileText },
    ],
  },
]

const ADMIN_GROUP: NavGroup = {
  groupKey: 'admin',
  items: [
    { to: '/companies', labelKey: 'companies', icon: Building2 },
    { to: '/users',     labelKey: 'users',     icon: Users },
  ],
}

// ── Componentes internos ───────────────────────────────────────────────────────

function NavItemLink({ to, icon: Icon, label, onNavigate }: {
  to: string; icon: React.ElementType; label: string; onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 select-none">
      {label}
    </p>
  )
}

function SidebarContent({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { selectedCompany, clearSelectedCompany } = useAdminContextStore()
  const nav = t.nav

  const handleBack = () => {
    clearSelectedCompany()
    navigate('/dashboard')
    onNavigate?.()
  }

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3">
      {/* Dashboard — sempre no topo */}
      <NavItemLink to="/dashboard" icon={LayoutDashboard} label={nav.dashboard} onNavigate={onNavigate} />

      {/* Admin sem empresa selecionada → só Administração */}
      {isAdmin && !selectedCompany && (
        <>
          <GroupLabel label={nav.admin} />
          {ADMIN_GROUP.items.map(({ to, labelKey, icon }) => (
            <NavItemLink key={to} to={to} icon={icon} label={nav[labelKey]} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {/* Admin com empresa ou usuário de empresa → menu completo agrupado */}
      {(!isAdmin || selectedCompany) && (
        <>
          {GROUPS_COMPANY.map(group => (
            <div key={group.groupKey}>
              <GroupLabel label={nav[group.groupKey]} />
              {group.items.map(({ to, labelKey, icon }) => (
                <NavItemLink key={to} to={to} icon={icon} label={nav[labelKey]} onNavigate={onNavigate} />
              ))}
            </div>
          ))}

          {/* Admin: seção Administração abaixo dos grupos */}
          {isAdmin && selectedCompany && (
            <>
              <GroupLabel label={nav.admin} />
              {ADMIN_GROUP.items.map(({ to, labelKey, icon }) => (
                <NavItemLink key={to} to={to} icon={icon} label={nav[labelKey]} onNavigate={onNavigate} />
              ))}
              <div className="mt-4 px-1">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Todas as empresas
                </button>
              </div>
            </>
          )}
        </>
      )}
    </nav>
  )
}

// ── Layout principal ───────────────────────────────────────────────────────────

export function AppLayout() {
  const { user, logout } = useAuth()
  const { t } = useLocale()
  const { selectedCompany } = useAdminContextStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const sidebarHeader = isAdmin && selectedCompany
    ? selectedCompany.name
    : isAdmin
      ? 'Punch Care · Admin'
      : user?.company?.name ?? ''

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar desktop ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-sidebar flex-col border-r border-sidebar-border">
        {/* Logo / empresa */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <p className="text-base font-bold text-sidebar-foreground tracking-tight leading-none">Punch Control</p>
          {sidebarHeader && (
            <p className={cn('text-xs mt-1 truncate', isAdmin && selectedCompany ? 'text-primary/80 font-medium' : 'text-sidebar-foreground/50')}>
              {sidebarHeader}
            </p>
          )}
        </div>

        <SidebarContent isAdmin={isAdmin} />

        {/* User footer */}
        <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/45 truncate">{user?.email}</p>
            </div>
          </div>
          <AccessibilityButton />
          <Button
            variant="ghost" size="sm" onClick={logout}
            className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" /> {t.nav.logout}
          </Button>
        </div>
      </aside>

      {/* ── Sidebar mobile (drawer) ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar flex flex-col border-r border-sidebar-border md:hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-sidebar-foreground tracking-tight">Punch Control</p>
            {sidebarHeader && (
              <p className={cn('text-xs mt-0.5 truncate', isAdmin && selectedCompany ? 'text-primary/80 font-medium' : 'text-sidebar-foreground/50')}>
                {sidebarHeader}
              </p>
            )}
          </div>
          <button
            type="button"
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarContent isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />

        <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
          <AccessibilityButton />
          <Button
            variant="ghost" size="sm" onClick={logout}
            className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" /> {t.nav.logout}
          </Button>
        </div>
      </aside>

      {/* ── Conteúdo principal ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Topbar mobile */}
        <header className="md:hidden flex-shrink-0 h-14 bg-background border-b border-border px-4 flex items-center justify-between gap-3 z-30">
          <button
            type="button"
            className="p-2 rounded-md border border-border text-foreground hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold truncate flex-1 text-center">
            {isAdmin && selectedCompany ? selectedCompany.name : 'Punch Control'}
          </p>
          <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>

        <footer className="flex-shrink-0 border-t border-border px-4 py-2 sm:px-6">
          <DeveloperCredit />
        </footer>
      </div>
    </div>
  )
}
