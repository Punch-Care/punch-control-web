import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks/useLocale'

export type CompanyFormData = {
  name: string
  cnpj?: string
  razaoSocial?: string
  inscricaoEstadual?: string
  logradouro?: string
  complemento?: string
  cidade?: string
  estado?: string
  telefone?: string
}

export function CompanyForm({
  defaultValues,
  onSubmit,
  loading,
  readOnly = false,
  t,
}: {
  defaultValues?: Partial<CompanyFormData>
  onSubmit: (data: CompanyFormData) => void
  loading: boolean
  readOnly?: boolean
  t: ReturnType<typeof useLocale>['t']
}) {
  const c = t.companies

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, c.nameMinLength),
        cnpj: z.string().optional(),
        razaoSocial: z.string().optional(),
        inscricaoEstadual: z.string().optional(),
        logradouro: z.string().optional(),
        complemento: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        telefone: z.string().optional(),
      }),
    [c],
  )

  const { register, handleSubmit, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t.common.name} *</Label>
          <Input placeholder={c.namePlaceholder} disabled={readOnly} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{c.razaoSocial}</Label>
          <Input placeholder={c.razaoSocialPlaceholder} disabled={readOnly} {...register('razaoSocial')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.cnpj}</Label>
          <Input placeholder={c.cnpjPlaceholder} disabled={readOnly} {...register('cnpj')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.inscricaoEstadual}</Label>
          <Input placeholder={c.inscricaoEstadualPlaceholder} disabled={readOnly} {...register('inscricaoEstadual')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{c.logradouro}</Label>
          <Input placeholder={c.logradouroPlaceholder} disabled={readOnly} {...register('logradouro')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.complemento}</Label>
          <Input placeholder={c.complementoPlaceholder} disabled={readOnly} {...register('complemento')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.cidade}</Label>
          <Input placeholder={c.cidadePlaceholder} disabled={readOnly} {...register('cidade')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.estado}</Label>
          <Input placeholder={c.estadoPlaceholder} disabled={readOnly} {...register('estado')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.telefone}</Label>
          <Input placeholder={c.telefonePlaceholder} disabled={readOnly} {...register('telefone')} />
        </div>
      </div>
      {!readOnly && (
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.common.save}
        </Button>
      )}
    </form>
  )
}
