import { useAuth } from './useAuth'
import { useAdminContextStore } from '@/store/admin-context.store'

/**
 * Returns the effective companyId for API calls:
 * - For ADMIN/MANAGER: the company selected in the admin context (or undefined = all)
 * - For COMPANY/CLIENT: their own company id
 */
export function useAdminCompany() {
  const { user } = useAuth()
  const { selectedCompany } = useAdminContextStore()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const companyId = isAdmin
    ? (selectedCompany?.id ?? undefined)
    : (user?.company?.id ?? undefined)

  return { companyId, isAdmin, selectedCompany }
}
