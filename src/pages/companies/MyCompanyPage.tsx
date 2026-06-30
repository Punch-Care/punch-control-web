import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { Card, CardContent } from '@/components/ui/card'
import type { Company } from '@/types'
import { CompanyForm, type CompanyFormData } from './CompanyForm'

export function MyCompanyPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const readOnly = user?.role !== 'COMPANY'

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['my-company'],
    queryFn: () => api.get('/companies/me').then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: CompanyFormData) => api.put('/companies/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-company'] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success(t.companies.updated)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.companies.updateError),
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t.nav.myCompany}</h2>
          <p className="text-xs text-muted-foreground">{t.companies.myCompanySubtitle}</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
          ) : company ? (
            <CompanyForm
              defaultValues={{
                name: company.name,
                cnpj: company.cnpj ?? '',
                razaoSocial: company.razaoSocial ?? '',
                inscricaoEstadual: company.inscricaoEstadual ?? '',
                cep: company.cep ?? '',
                logradouro: company.logradouro ?? '',
                numero: company.numero ?? '',
                complemento: company.complemento ?? '',
                cidade: company.cidade ?? '',
                estado: company.estado ?? '',
                telefone: company.telefone ?? '',
              }}
              onSubmit={updateMutation.mutate}
              loading={updateMutation.isPending}
              readOnly={readOnly}
              t={t}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{t.companies.noCompanies}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
