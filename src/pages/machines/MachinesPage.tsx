import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Power, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { useAuth } from '@/hooks/useAuth'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { knToTf } from '@/lib/utils'
import type { Machine, Company } from '@/types'

const NORMAS = [
  'EUB', 'EUBB', 'EUBD', 'TSMB', 'TSMBB', 'TSMDB',
  'EUD', 'TSMD', 'EURO', "FETTE EU 1'441", 'PHARMA',
  '20/28', '25/32 GROOVE DIE', '25/32 SLOTTED DIE',
] as const

const MACHINE_NAME = 'Compressora'

type FormData = {
  name: string
  code?: string
  fabricante?: string
  modelo?: string
  numeroSerie?: string
  anoFabricacao?: number
  qtdEstacao?: number
  norma?: string
  normaCustom?: string
  anguloChaveta?: string
  tipoCompressora?: 'PADRAO' | 'MULT_LAYER'
  capacidadeMinCph?: number
  capacidadeMaxCph?: number
  qtdSaidas?: number
  torreIntercambiavel?: boolean
  forcaPreCompressaoKN?: number
  forcaCompressaoKN?: number
  diametroMaxComprimidoMm?: number
  espessuraMaxComprimidoMm?: number
  companyId: string
}

function MachineForm({
  defaultValues,
  onSubmit,
  loading,
  t,
  isAdmin,
  hasCompanyContext,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  loading: boolean
  t: ReturnType<typeof useLocale>['t']
  isAdmin: boolean
  hasCompanyContext: boolean
}) {
  const m = t.machines
  const [normaValue, setNormaValue] = useState(
    defaultValues?.norma && !NORMAS.includes(defaultValues.norma as typeof NORMAS[number])
      ? 'OTHER'
      : (defaultValues?.norma ?? '')
  )

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, m.nameMinLength),
        code: z.string().optional(),
        fabricante: z.string().optional(),
        modelo: z.string().optional(),
        numeroSerie: z.string().optional(),
        anoFabricacao: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal('')),
        qtdEstacao: z.coerce.number().int().min(1).optional().or(z.literal('')),
        norma: z.string().optional(),
        normaCustom: z.string().optional(),
        anguloChaveta: z.string().optional(),
        tipoCompressora: z.enum(['PADRAO', 'MULT_LAYER']).optional().or(z.literal('')),
        capacidadeMinCph: z.coerce.number().int().min(0).optional().or(z.literal('')),
        capacidadeMaxCph: z.coerce.number().int().min(0).optional().or(z.literal('')),
        qtdSaidas: z.coerce.number().int().min(0).optional().or(z.literal('')),
        torreIntercambiavel: z.boolean().optional(),
        forcaPreCompressaoKN: z.coerce.number().min(0).optional().or(z.literal('')),
        forcaCompressaoKN: z.coerce.number().min(0).optional().or(z.literal('')),
        diametroMaxComprimidoMm: z.coerce.number().min(0).optional().or(z.literal('')),
        espessuraMaxComprimidoMm: z.coerce.number().min(0).optional().or(z.literal('')),
        companyId: (isAdmin && !hasCompanyContext) ? z.string().uuid(m.selectCompanyRequired) : z.string().optional(),
      }),
    [m, isAdmin, hasCompanyContext],
  )

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      name: MACHINE_NAME,
      norma: normaValue === 'OTHER' ? defaultValues?.norma : defaultValues?.norma,
    },
  })

  const forcaPre = watch('forcaPreCompressaoKN')
  const forcaPrinc = watch('forcaCompressaoKN')

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
    enabled: isAdmin && !hasCompanyContext,
  })

  const handleFormSubmit = (data: FormData) => {
    const normaFinal = normaValue === 'OTHER' ? data.normaCustom : normaValue || undefined
    // Remove campos numéricos vazios ('' ou NaN) para não falhar a validação do backend
    const cleaned = Object.fromEntries(
      Object.entries({ ...data, name: MACHINE_NAME, norma: normaFinal || undefined })
        .filter(([, v]) => v !== '' && !(typeof v === 'number' && Number.isNaN(v))),
    ) as FormData
    onSubmit(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name — fixo "Compressora" */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t.common.name}</Label>
          <Input value={MACHINE_NAME} disabled readOnly />
          <input type="hidden" {...register('name')} />
        </div>

        {/* Company (admin only, sem contexto de empresa) */}
        {isAdmin && !hasCompanyContext && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t.common.company} *</Label>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder={t.common.selectCompany} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
          </div>
        )}

        {/* Code */}
        <div className="space-y-1.5">
          <Label>{t.common.code}</Label>
          <Input placeholder="ex: FETTE-01" {...register('code')} />
        </div>

        {/* Fabricante */}
        <div className="space-y-1.5">
          <Label>{m.fabricante}</Label>
          <Input placeholder={m.fabricantePlaceholder} {...register('fabricante')} />
        </div>

        {/* Modelo */}
        <div className="space-y-1.5">
          <Label>{m.modelo}</Label>
          <Input placeholder={m.modeloPlaceholder} {...register('modelo')} />
        </div>

        {/* Numero de Serie */}
        <div className="space-y-1.5">
          <Label>{m.numeroSerie} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
          <Input placeholder={m.numeroSeriePlaceholder} {...register('numeroSerie')} />
        </div>

        {/* Ano fabricacao */}
        <div className="space-y-1.5">
          <Label>{m.anoFabricacao} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
          <Input type="number" placeholder={m.anoFabricacaoPlaceholder} {...register('anoFabricacao')} />
        </div>

        {/* Qtd Estacao */}
        <div className="space-y-1.5">
          <Label>{m.qtdEstacao}</Label>
          <Input type="number" placeholder={m.qtdEstacaoPlaceholder} {...register('qtdEstacao')} />
        </div>

        {/* Norma */}
        <div className="space-y-1.5">
          <Label>{m.norma} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
          <Select value={normaValue} onValueChange={setNormaValue}>
            <SelectTrigger><SelectValue placeholder={m.normaPlaceholder} /></SelectTrigger>
            <SelectContent>
              {NORMAS.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
              <SelectItem value="OTHER">{m.normaOther}</SelectItem>
            </SelectContent>
          </Select>
          {normaValue === 'OTHER' && (
            <Input
              className="mt-1.5"
              placeholder="Digite a norma..."
              {...register('normaCustom')}
              defaultValue={
                defaultValues?.norma && !NORMAS.includes(defaultValues.norma as typeof NORMAS[number])
                  ? defaultValues.norma
                  : ''
              }
            />
          )}
        </div>

        {/* Angulo Chaveta */}
        <div className="space-y-1.5">
          <Label>{m.anguloChaveta} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
          <Input placeholder={m.anguloChavetaPlaceholder} {...register('anguloChaveta')} />
        </div>

        {/* ── Especificações técnicas da compressora ── */}
        <div className="sm:col-span-2 border-t pt-3 mt-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{m.techSpecsTitle}</p>
        </div>

        {/* Tipo (Padrão / Mult-layer) */}
        <div className="space-y-1.5">
          <Label>{m.tipoCompressora}</Label>
          <Controller
            control={control}
            name="tipoCompressora"
            render={({ field }) => (
              <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder={m.selectPlaceholder} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="PADRAO">{m.tipoPadrao}</SelectItem>
                  <SelectItem value="MULT_LAYER">{m.tipoMultLayer}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Torre intercambiável */}
        <div className="space-y-1.5">
          <Label>{m.torreIntercambiavel}</Label>
          <Controller
            control={control}
            name="torreIntercambiavel"
            render={({ field }) => (
              <Select
                value={field.value === true ? 'sim' : field.value === false ? 'nao' : '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v === 'sim')}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="sim">{t.common.yes}</SelectItem>
                  <SelectItem value="nao">{t.common.no}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Capacidade mín/máx CP/HR */}
        <div className="space-y-1.5">
          <Label>{m.capacidadeMinCph}</Label>
          <Input type="number" placeholder="ex: 100000" {...register('capacidadeMinCph')} />
        </div>
        <div className="space-y-1.5">
          <Label>{m.capacidadeMaxCph}</Label>
          <Input type="number" placeholder="ex: 300000" {...register('capacidadeMaxCph')} />
        </div>

        {/* Qtd saídas */}
        <div className="space-y-1.5">
          <Label>{m.qtdSaidas}</Label>
          <Input type="number" placeholder="ex: 1" {...register('qtdSaidas')} />
        </div>

        {/* Força pré-compressão KN + conversão ton */}
        <div className="space-y-1.5">
          <Label>{m.forcaPreCompressaoKN}</Label>
          <Input type="number" step="any" placeholder="ex: 10" {...register('forcaPreCompressaoKN')} />
          {knToTf(Number(forcaPre)) !== null && Number(forcaPre) > 0 && (
            <p className="text-xs text-muted-foreground">≈ {knToTf(Number(forcaPre))} tf</p>
          )}
        </div>

        {/* Força compressão principal KN + conversão ton */}
        <div className="space-y-1.5">
          <Label>{m.forcaCompressaoKN}</Label>
          <Input type="number" step="any" placeholder="ex: 100" {...register('forcaCompressaoKN')} />
          {knToTf(Number(forcaPrinc)) !== null && Number(forcaPrinc) > 0 && (
            <p className="text-xs text-muted-foreground">≈ {knToTf(Number(forcaPrinc))} tf</p>
          )}
        </div>

        {/* Diâmetro / espessura máx do comprimido */}
        <div className="space-y-1.5">
          <Label>{m.diametroMaxComprimidoMm}</Label>
          <Input type="number" step="any" placeholder="ex: 25" {...register('diametroMaxComprimidoMm')} />
        </div>
        <div className="space-y-1.5">
          <Label>{m.espessuraMaxComprimidoMm}</Label>
          <Input type="number" step="any" placeholder="ex: 8" {...register('espessuraMaxComprimidoMm')} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.save}
      </Button>
    </form>
  )
}

export function MachinesPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const { companyId: adminCompanyId, selectedCompany } = useAdminCompany()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)

  const { data: machines = [], isLoading } = useQuery<Machine[]>({
    queryKey: ['machines', adminCompanyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = isAdmin
        ? { ...data, companyId: selectedCompany?.id || (data as unknown as { companyId: string }).companyId }
        : { ...data, companyId: user?.company?.id }
      return api.post('/occurrences/machines', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); setOpen(false); toast.success(t.machines.created) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.machines.createError),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.put(`/occurrences/machines/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); setEditing(null); toast.success(t.machines.updated) },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.machines.updateError),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/occurrences/machines/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] }),
    onError: () => toast.error(t.machines.updateError),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.machines.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.machines.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> {t.machines.newMachine}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t.machines.newMachine}</DialogTitle></DialogHeader>
            <MachineForm
              onSubmit={(d) => createMutation.mutate(d as unknown as FormData)}
              loading={createMutation.isPending}
              t={t}
              isAdmin={isAdmin}
              hasCompanyContext={!!selectedCompany}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.name}</TableHead>
              <TableHead>{t.machines.fabricante}</TableHead>
              <TableHead>{t.machines.modelo}</TableHead>
              <TableHead>{t.machines.norma}</TableHead>
              <TableHead>{t.machines.qtdEstacao}</TableHead>
              {isAdmin && !selectedCompany && <TableHead>{t.common.company}</TableHead>}
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-24">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isAdmin && !selectedCompany ? 8 : 7} className="text-center text-muted-foreground py-8">{t.common.loading}</TableCell></TableRow>
            ) : machines.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin && !selectedCompany ? 8 : 7} className="text-center text-muted-foreground py-8">{t.machines.noMachines}</TableCell></TableRow>
            ) : machines.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  <div>
                    {m.name}
                    {m.code && <span className="ml-1.5 text-xs text-muted-foreground">({m.code})</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.fabricante ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{m.modelo ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{m.norma ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{m.qtdEstacao ?? '—'}</TableCell>
                {isAdmin && !selectedCompany && (
                  <TableCell className="text-muted-foreground text-xs">{m.companyId}</TableCell>
                )}
                <TableCell>
                  <Badge variant={m.active ? 'success' : 'secondary'}>
                    {m.active ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleMutation.mutate(m.id)}
                      className={m.active ? 'text-destructive' : 'text-green-600'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.machines.editMachine}</DialogTitle></DialogHeader>
          {editing && (
            <MachineForm
              defaultValues={{
                name: editing.name,
                code: editing.code ?? '',
                fabricante: editing.fabricante ?? '',
                modelo: editing.modelo ?? '',
                numeroSerie: editing.numeroSerie ?? '',
                anoFabricacao: editing.anoFabricacao ?? undefined,
                qtdEstacao: editing.qtdEstacao ?? undefined,
                norma: editing.norma ?? '',
                anguloChaveta: editing.anguloChaveta ?? '',
                tipoCompressora: editing.tipoCompressora ?? undefined,
                capacidadeMinCph: editing.capacidadeMinCph ?? undefined,
                capacidadeMaxCph: editing.capacidadeMaxCph ?? undefined,
                qtdSaidas: editing.qtdSaidas ?? undefined,
                torreIntercambiavel: editing.torreIntercambiavel ?? undefined,
                forcaPreCompressaoKN: editing.forcaPreCompressaoKN ?? undefined,
                forcaCompressaoKN: editing.forcaCompressaoKN ?? undefined,
                diametroMaxComprimidoMm: editing.diametroMaxComprimidoMm ?? undefined,
                espessuraMaxComprimidoMm: editing.espessuraMaxComprimidoMm ?? undefined,
                companyId: editing.companyId,
              }}
              onSubmit={(d) => updateMutation.mutate(d as unknown as FormData)}
              loading={updateMutation.isPending}
              t={t}
              isAdmin={isAdmin}
              hasCompanyContext={!!selectedCompany}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
