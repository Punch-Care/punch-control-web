/**
 * Shared query hooks with normalized cache keys.
 * All page-level inline queries for these resources should use these hooks
 * to guarantee cache sharing as the user navigates between pages.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Product, Machine, PunchSet, ProductionConfig } from '@/types'

export function useProductsQuery(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery<Product[]>({
    queryKey: ['products', companyId],
    queryFn: () => api.get('/products', { params: { companyId } }).then(r => r.data),
    enabled: (options?.enabled ?? true) && !!companyId,
  })
}

export function useMachinesQuery(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery<Machine[]>({
    queryKey: ['machines', companyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId } }).then(r => r.data),
    enabled: (options?.enabled ?? true) && !!companyId,
  })
}

export function usePunchSetsQuery(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery<PunchSet[]>({
    queryKey: ['punch-sets', companyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId } }).then(r => r.data),
    enabled: (options?.enabled ?? true) && !!companyId,
  })
}

export function useProductionConfigsQuery(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery<ProductionConfig[]>({
    queryKey: ['production-configs', companyId],
    queryFn: () => api.get('/production-configs', { params: { companyId } }).then(r => r.data),
    enabled: (options?.enabled ?? true) && !!companyId,
  })
}
