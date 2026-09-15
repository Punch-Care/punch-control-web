import type { UserRole } from '@/types'

/** Tela inicial de cada perfil: o técnico cai direto no modo operador */
export const homeRouteFor = (role: UserRole | undefined) => (role === 'CLIENT' ? '/operador' : '/dashboard')
