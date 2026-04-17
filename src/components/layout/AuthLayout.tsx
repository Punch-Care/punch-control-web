import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Punch Control</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de Gestão de Punções</p>
        </div>
        {children}
      </div>
    </div>
  )
}
