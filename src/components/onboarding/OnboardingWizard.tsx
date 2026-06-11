import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle2, ChevronDown, X, Loader2, ArrowRight,
  Package, Cpu, Layers3, SlidersHorizontal, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useAdminCompany } from '@/hooks/useAdminCompany'

const DISMISS_KEY = 'punch-onboarding-dismissed'

// ── Schemas ────────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  code: z.string().optional(),
})

const machineSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  code: z.string().optional(),
})

const punchSetSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
})

type ProductFormData = z.infer<typeof productSchema>
type MachineFormData = z.infer<typeof machineSchema>
type PunchSetFormData = z.infer<typeof punchSetSchema>

// ── Inline forms ───────────────────────────────────────────────────────────────

function ProductStepForm({ companyId, onSuccess }: { companyId: string; onSuccess: () => void }) {
  const qc = useQueryClient()
  const form = useForm<ProductFormData>({ resolver: zodResolver(productSchema) })

  const mutation = useMutation({
    mutationFn: (data: ProductFormData) => api.post('/products', { ...data, companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto cadastrado com sucesso!')
      form.reset()
      onSuccess()
    },
    onError: () => toast.error('Erro ao cadastrar produto. Tente novamente.'),
  })

  return (
    <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="pt-2 pb-1 space-y-3">
      <p className="text-xs text-muted-foreground">
        Cadastre o comprimido, cápsula ou produto que será fabricado.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nome do produto *</Label>
          <Input
            placeholder="ex: Paracetamol 500mg"
            className="h-8 text-sm"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Código <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            placeholder="ex: PCT-500"
            className="h-8 text-sm"
            {...form.register('code')}
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Cadastrar produto
        </Button>
      </div>
    </form>
  )
}

function MachineStepForm({ companyId, onSuccess }: { companyId: string; onSuccess: () => void }) {
  const qc = useQueryClient()
  const form = useForm<MachineFormData>({ resolver: zodResolver(machineSchema) })

  const mutation = useMutation({
    mutationFn: (data: MachineFormData) => api.post('/occurrences/machines', { ...data, companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] })
      toast.success('Máquina cadastrada com sucesso!')
      form.reset()
      onSuccess()
    },
    onError: () => toast.error('Erro ao cadastrar máquina. Tente novamente.'),
  })

  return (
    <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="pt-2 pb-1 space-y-3">
      <p className="text-xs text-muted-foreground">
        Registre a máquina compressora utilizada na produção dos comprimidos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nome da máquina *</Label>
          <Input
            placeholder="ex: Compressora 01"
            className="h-8 text-sm"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Fabricante</Label>
          <Input
            placeholder="ex: Fette"
            className="h-8 text-sm"
            {...form.register('fabricante')}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Modelo</Label>
          <Input
            placeholder="ex: 1200i"
            className="h-8 text-sm"
            {...form.register('modelo')}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Código <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            placeholder="ex: FETTE-01"
            className="h-8 text-sm"
            {...form.register('code')}
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Cadastrar máquina
        </Button>
      </div>
    </form>
  )
}

function PunchSetStepForm({ companyId, onSuccess }: { companyId: string; onSuccess: () => void }) {
  const qc = useQueryClient()
  const form = useForm<PunchSetFormData>({ resolver: zodResolver(punchSetSchema) })

  const mutation = useMutation({
    mutationFn: (data: PunchSetFormData) => api.post('/punch-sets', { ...data, companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      toast.success('Conjunto cadastrado com sucesso!')
      form.reset()
      onSuccess()
    },
    onError: () => toast.error('Erro ao cadastrar conjunto. Tente novamente.'),
  })

  return (
    <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="pt-2 pb-1 space-y-3">
      <p className="text-xs text-muted-foreground">
        Adicione o conjunto de punções e matrizes utilizado na fabricação.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Código do conjunto *</Label>
          <Input
            placeholder="ex: PC-001"
            className="h-8 text-sm"
            {...form.register('code')}
          />
          {form.formState.errors.code && (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nome *</Label>
          <Input
            placeholder="ex: Punção Redonda 8mm"
            className="h-8 text-sm"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Cadastrar conjunto
        </Button>
      </div>
    </form>
  )
}

function ConfigStepContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="pt-2 pb-1 space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure os parâmetros fixos de processo para cada combinação de{' '}
        <strong>Produto + Máquina</strong>. Isso define os limites usados no controle estatístico
        (CEP) durante a produção.
      </p>
      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">O que você vai definir:</p>
        <p>• Parâmetros de setup (pressão, velocidade, peso médio...)</p>
        <p>• Valores mínimo, máximo e sugerido de cada parâmetro</p>
        <p>• Medições horárias do turno de produção</p>
      </div>
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={() => navigate('/production?tab=configs')}>
          Ir para Configurações <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Step item ──────────────────────────────────────────────────────────────────

type StepItemProps = {
  index: number
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  isDone: boolean
  doneDetail?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function StepItem({
  index, icon: Icon, label, hint, isDone, doneDetail, isExpanded, onToggle, children,
}: StepItemProps) {
  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isDone
          ? 'bg-green-50/60 border-green-200/70'
          : isExpanded
            ? 'bg-background border-primary/30 shadow-sm'
            : 'bg-background/60 border-border/50'
      }`}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={isDone ? undefined : onToggle}
        disabled={isDone}
      >
        {/* Step indicator */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            isDone
              ? 'bg-green-100'
              : isExpanded
                ? 'bg-primary/10'
                : 'bg-muted'
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <span
              className={`text-xs font-bold ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {index + 1}
            </span>
          )}
        </div>

        {/* Icon + label */}
        <Icon
          className={`h-4 w-4 flex-shrink-0 ${
            isDone ? 'text-green-600' : isExpanded ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-tight ${
              isDone ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {label}
          </p>
          <p className={`text-xs mt-0.5 truncate ${isDone ? 'text-green-600' : 'text-muted-foreground'}`}>
            {isDone ? `✓ ${doneDetail}` : hint}
          </p>
        </div>

        {/* Chevron */}
        {!isDone && (
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Expandable content */}
      {!isDone && isExpanded && (
        <div className="px-4 pb-3 border-t border-border/40 mt-0">{children}</div>
      )}
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const { user } = useAuth()
  const { companyId } = useAdminCompany()
  const navigate = useNavigate()

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true',
  )
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  // All hooks must run before any conditional return
  const { data: products = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['products', companyId],
    queryFn: () => api.get('/products', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: machines = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['machines', companyId],
    queryFn: () =>
      api.get('/occurrences/machines', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: sets = [] } = useQuery<{ id: string; name: string; code: string }[]>({
    queryKey: ['punch-sets', companyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: configs = [] } = useQuery<{ id: string }[]>({
    queryKey: ['production-configs', companyId],
    queryFn: () =>
      api.get('/production-configs', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  // Only show for COMPANY users who can edit
  const isCompanyUser = user?.role === 'COMPANY'
  if (!isCompanyUser || dismissed || !companyId) return null

  const steps = [
    { done: products.length > 0, doneDetail: products[0]?.name ?? `${products.length} produto(s)` },
    { done: machines.length > 0, doneDetail: machines[0]?.name ?? `${machines.length} máquina(s)` },
    { done: sets.length > 0, doneDetail: sets[0] ? `${sets[0].code} — ${sets[0].name}` : `${sets.length} conjunto(s)` },
    { done: configs.length > 0, doneDetail: `${configs.length} configuração(ões) criada(s)` },
  ]

  const completedCount = steps.filter(s => s.done).length

  // All done — don't show
  if (completedCount === 4) return null

  // Which step to show expanded: explicit selection or first incomplete
  const firstIncompleteIdx = steps.findIndex(s => !s.done)
  const activeStep = expandedStep !== null ? expandedStep : firstIncompleteIdx

  function handleToggle(idx: number) {
    setExpandedStep(prev => (prev === idx ? null : idx))
  }

  function advanceTo(idx: number) {
    setExpandedStep(idx < 4 ? idx : null)
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">Configure seu ambiente</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount} de 4 etapas concluídas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
            title="Ocultar guia de configuração"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step.done ? 'bg-green-500' : i === activeStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <StepItem
            index={0}
            icon={Package}
            label="Cadastrar produto"
            hint="O comprimido ou cápsula que será fabricado"
            isDone={steps[0].done}
            doneDetail={steps[0].doneDetail}
            isExpanded={activeStep === 0}
            onToggle={() => handleToggle(0)}
          >
            <ProductStepForm companyId={companyId} onSuccess={() => advanceTo(1)} />
          </StepItem>

          <StepItem
            index={1}
            icon={Cpu}
            label="Cadastrar máquina"
            hint="A compressora onde os comprimidos são fabricados"
            isDone={steps[1].done}
            doneDetail={steps[1].doneDetail}
            isExpanded={activeStep === 1}
            onToggle={() => handleToggle(1)}
          >
            <MachineStepForm companyId={companyId} onSuccess={() => advanceTo(2)} />
          </StepItem>

          <StepItem
            index={2}
            icon={Layers3}
            label="Cadastrar conjunto de punções"
            hint="O ferramental utilizado na compressão dos comprimidos"
            isDone={steps[2].done}
            doneDetail={steps[2].doneDetail}
            isExpanded={activeStep === 2}
            onToggle={() => handleToggle(2)}
          >
            <PunchSetStepForm companyId={companyId} onSuccess={() => advanceTo(3)} />
          </StepItem>

          <StepItem
            index={3}
            icon={SlidersHorizontal}
            label="Configurar processo (CEP)"
            hint="Parâmetros de controle para Produto + Máquina"
            isDone={steps[3].done}
            doneDetail={steps[3].doneDetail}
            isExpanded={activeStep === 3}
            onToggle={() => handleToggle(3)}
          >
            <ConfigStepContent navigate={navigate} />
          </StepItem>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Você pode fechar este guia e retomá-lo a qualquer momento pelo Dashboard.
        </p>
      </CardContent>
    </Card>
  )
}
