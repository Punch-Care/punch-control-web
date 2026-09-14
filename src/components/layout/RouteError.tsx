import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'

/**
 * Tela exibida quando uma página quebra ao renderizar. Sem ela, qualquer erro
 * deixava o app inteiro em branco, sem mensagem nem saída para o usuário.
 */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const u = useLocale().t.ui

  const detalhe = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null

  if (error) console.error(error)

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-background p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{u.errorTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {u.errorDesc}
          </p>
          {detalhe && <p className="text-xs text-muted-foreground font-mono break-words pt-1">{detalhe}</p>}
        </div>
        <div className="flex gap-2 justify-center">
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> {u.reload}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
            <Home className="h-4 w-4" /> {u.home}
          </Button>
        </div>
      </div>
    </div>
  )
}
