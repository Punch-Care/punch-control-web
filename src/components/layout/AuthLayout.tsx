import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-white/10">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#116DFF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">PC</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Punch Control</span>
        </Link>
      </header>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#116DFF]/8 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-semibold text-white">Bem-vindo</h1>
            <p className="text-white/40 mt-1.5 text-sm">
              Sistema de Gestão de Punções · Punch Care
            </p>
          </div>
          {children}
          <p className="text-center text-white/20 text-xs mt-8">
            <Link to="/" className="hover:text-white/40 transition-colors">
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
