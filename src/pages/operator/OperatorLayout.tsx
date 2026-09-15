import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Menu, LayoutGrid, KeyRound, Accessibility, LogOut, Home } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { ChangePasswordDialog } from '@/components/layout/ChangePasswordDialog'
import { AccessibilityPanel, VLibrasSync } from '@/components/layout/AccessibilityPanel'
import { useSettingsStore } from '@/store/settings.store'

/**
 * Casca do modo operador: sem menu lateral, uma coluna para celular e tablet,
 * com tudo que não é a tarefa do momento guardado no botão Menu.
 */
export function OperatorLayout() {
  const { user, logout, passwordExpired } = useAuth()
  const { t } = useLocale()
  const o = t.operator
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [a11yOpen, setA11yOpen] = useState(false)
  // O botão flutuante de Libras só aparece se a pessoa ligou Libras na acessibilidade
  const libras = useSettingsStore((s) => s.libras)

  const item = 'w-full flex items-center gap-3 h-14 px-4 rounded-xl text-lg text-[#1F2933] hover:bg-[#EEF1F4]'

  return (
    <div className="min-h-screen bg-[#EEF1F4] text-[#1F2933]">
      <header className="sticky top-0 z-20 bg-[#1F2933] text-white">
        <div className="max-w-2xl mx-auto h-16 px-4 flex items-center gap-3">
          <Link to="/operador" className="flex-1 min-w-0" aria-label={o.home}>
            <p className="text-lg font-semibold leading-tight truncate">Punch Control</p>
            <p className="text-sm text-white/70 truncate">{user?.company?.name}</p>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="h-12 px-4 rounded-xl bg-white/10 hover:bg-white/20 inline-flex items-center gap-2 text-base"
          >
            <Menu className="h-5 w-5" /> {o.menu}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-8">
        <Outlet />
      </main>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-xl">{user?.name}</DialogTitle></DialogHeader>
          <nav className="space-y-1">
            <button type="button" className={item} onClick={() => { setMenuOpen(false); navigate('/operador') }}>
              <Home className="h-5 w-5" /> {o.home}
            </button>
            <button type="button" className={item} onClick={() => { setMenuOpen(false); navigate('/dashboard') }}>
              <LayoutGrid className="h-5 w-5" /> {o.fullSystem}
            </button>
            <button type="button" className={item} onClick={() => { setMenuOpen(false); setA11yOpen(true) }}>
              <Accessibility className="h-5 w-5" /> {o.languageAndReading}
            </button>
            <button type="button" className={item} onClick={() => { setMenuOpen(false); setPwOpen(true) }}>
              <KeyRound className="h-5 w-5" /> {o.changePassword}
            </button>
            <button type="button" className={`${item} text-[#C62828]`} onClick={() => { logout(); navigate('/login') }}>
              <LogOut className="h-5 w-5" /> {o.logout}
            </button>
          </nav>
        </DialogContent>
      </Dialog>

      <VLibrasSync enabled={libras} />
      <AccessibilityPanel open={a11yOpen} onOpenChange={setA11yOpen} />
      <ChangePasswordDialog open={pwOpen || passwordExpired} onOpenChange={setPwOpen} forced={passwordExpired} />
    </div>
  )
}
