import { Navigate, useParams } from 'react-router-dom'

/** Endereço antigo do painel do lote no modo operador: hoje é uma página só */
export function RedirectToBatch() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/production/${id}`} replace />
}
