import { Outlet } from 'react-router-dom'

/**
 * Tarefas do dia dentro do mesmo app: menu, topo e cores são os do sistema.
 * Só a coluna de conteúdo fica estreita, com alvos grandes para o dedo.
 */
export function OperatorLayout() {
  return (
    <div className="min-h-full bg-muted/20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-8">
        <Outlet />
      </div>
    </div>
  )
}
