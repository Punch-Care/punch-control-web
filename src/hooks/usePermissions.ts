import { useAuth } from '@/hooks/useAuth'

/**
 * Espelha as regras do backend:
 * - ADMIN/MANAGER: globais
 * - COMPANY: gerencia a própria empresa (cadastros, usuários CLIENT, exclusões)
 * - CLIENT (técnico): lê tudo e registra só dados operacionais
 *   (lotes, medições, ocorrências, dimensionamento, manutenção)
 */
export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role
  return {
    isGlobal: role === 'ADMIN' || role === 'MANAGER',
    isClient: role === 'CLIENT',
    /** Cadastros, configurações e exclusões */
    canManage: role === 'ADMIN' || role === 'MANAGER' || role === 'COMPANY',
    /** Lotes, medições, ocorrências, dimensionamento */
    canOperate: !!role,
  }
}
