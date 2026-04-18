import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DeveloperCredit } from '@/components/layout/DeveloperCredit'
import { useLocale } from '@/hooks/useLocale'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-white/90 backdrop-blur-sm">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F05922] flex items-center justify-center">
            <span className="text-white font-bold text-xs">PC</span>
          </div>
          <span className="text-foreground font-semibold tracking-tight">Punch Control</span>
        </Link>
      </header>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F05922]/10 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-semibold text-foreground">{t.auth.welcome}</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t.auth.subtitle}
            </p>
          </div>
          {children}
          <p className="text-center text-muted-foreground text-xs mt-8">
            <Link to="/" className="hover:text-foreground transition-colors">
              {t.auth.backToSite}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#F05922] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">PC</span>
            </div>
            <div>
              <span className="text-foreground font-semibold text-sm">Punch Control</span>
              <span className="text-muted-foreground text-sm"> · by Punch Care</span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs text-center">
            © {new Date().getFullYear()} Punch Care Ltda. · CNPJ 27.735.726/0001-29 · Taboão da Serra, SP
          </p>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a
              href="https://www.punchcare.com.br"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              punchcare.com.br
            </a>
            <a
              href="mailto:punchcare@punchcare.com.br"
              className="hover:text-foreground transition-colors"
            >
              Suporte: Domingo
            </a>
          </div>
        </div>
      </footer>

      <div className="w-full bg-black py-2.5 px-4 relative z-10">
        <DeveloperCredit tone="inverted" className="text-center" />
      </div>
    </div>
  )
}
