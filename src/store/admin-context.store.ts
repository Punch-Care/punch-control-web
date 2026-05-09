import { create } from 'zustand'
import type { CompanyOverview } from '@/types'

interface AdminContextState {
  selectedCompany: CompanyOverview | null
  setSelectedCompany: (company: CompanyOverview | null) => void
  clearSelectedCompany: () => void
}

export const useAdminContextStore = create<AdminContextState>()((set) => ({
  selectedCompany: null,
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  clearSelectedCompany: () => set({ selectedCompany: null }),
}))
