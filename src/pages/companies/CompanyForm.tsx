import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { maskCNPJ, maskPhone, maskCEP, maskInscricaoEstadual, UF_LIST } from '@/lib/utils'

export type CompanyFormData = {
  name: string
  cnpj?: string
  razaoSocial?: string
  inscricaoEstadual?: string
  cep?: string
  logradouro?: string
  numero?: string
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
        cnpj: z.string().optional().refine(
          (v) => !v || v.replace(/\D/g, '').length === 14,
          c.cnpjInvalid,
        ),
        razaoSocial: z.string().optional(),
        inscricaoEstadual: z.string().optional(),
        cep: z.string().optional().refine(
          (v) => !v || v.replace(/\D/g, '').length === 8,
          c.cepInvalid,
        ),
        logradouro: z.string().optional(),
        numero: z.string().optional(),
        complemento: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        telefone: z.string().optional().refine(
          (v) => !v || [10, 11].includes(v.replace(/\D/g, '').length),
          c.telefoneInvalid,
        ),
      }),
    [c],
  )

  const { register, handleSubmit, control, formState: { errors } } = useForm<CompanyFormData>({
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

        {/* CNPJ — máscara */}
        <div className="space-y-1.5">
          <Label>{c.cnpj}</Label>
          <Controller
            control={control}
            name="cnpj"
            render={({ field }) => (
              <Input
                inputMode="numeric"
                placeholder={c.cnpjPlaceholder}
                disabled={readOnly}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
              />
            )}
          />
          {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
        </div>

        {/* Inscrição Estadual — apenas dígitos (estrutura varia por UF) */}
        <div className="space-y-1.5">
          <Label>{c.inscricaoEstadual}</Label>
          <Controller
            control={control}
            name="inscricaoEstadual"
            render={({ field }) => (
              <Input
                inputMode="numeric"
                placeholder={c.inscricaoEstadualPlaceholder}
                disabled={readOnly}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskInscricaoEstadual(e.target.value))}
              />
            )}
          />
        </div>

        {/* CEP — máscara */}
        <div className="space-y-1.5">
          <Label>{c.cep}</Label>
          <Controller
            control={control}
            name="cep"
            render={({ field }) => (
              <Input
                inputMode="numeric"
                placeholder={c.cepPlaceholder}
                disabled={readOnly}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskCEP(e.target.value))}
              />
            )}
          />
          {errors.cep && <p className="text-xs text-destructive">{errors.cep.message}</p>}
        </div>

        {/* Telefone — máscara */}
        <div className="space-y-1.5">
          <Label>{c.telefone}</Label>
          <Controller
            control={control}
            name="telefone"
            render={({ field }) => (
              <Input
                inputMode="numeric"
                placeholder={c.telefonePlaceholder}
                disabled={readOnly}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskPhone(e.target.value))}
              />
            )}
          />
          {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
        </div>

        {/* Logradouro (rua/av.) */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{c.logradouro}</Label>
          <Input placeholder={c.logradouroPlaceholder} disabled={readOnly} {...register('logradouro')} />
        </div>

        <div className="space-y-1.5">
          <Label>{c.numero}</Label>
          <Input placeholder={c.numeroPlaceholder} disabled={readOnly} {...register('numero')} />
        </div>
        <div className="space-y-1.5">
          <Label>{c.complemento}</Label>
          <Input placeholder={c.complementoPlaceholder} disabled={readOnly} {...register('complemento')} />
        </div>

        <div className="space-y-1.5">
          <Label>{c.cidade}</Label>
          <Input placeholder={c.cidadePlaceholder} disabled={readOnly} {...register('cidade')} />
        </div>

        {/* Estado — sigla (UF) */}
        <div className="space-y-1.5">
          <Label>{c.estado}</Label>
          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <Select
                value={field.value || '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder={c.estadoPlaceholder} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
