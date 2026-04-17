import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
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
            <h1 className="font-display text-3xl font-semibold text-foreground">Bem-vindo</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sistema de Gestão de Punções · Punch Care
            </p>
          </div>
          {children}
          <p className="text-center text-muted-foreground text-xs mt-8">
            <Link to="/" className="hover:text-foreground transition-colors">
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
