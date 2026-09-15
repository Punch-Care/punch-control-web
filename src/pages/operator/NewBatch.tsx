import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Lock, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useMachinesQuery, useProductsQuery, usePunchSetsQuery, useProductionConfigsQuery } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { ScreenHeader, ChoiceButton, BottomAction, PrimaryButton, SecondaryButton, BigNumberField, apiMessage, toNumberOrNull } from './shared'
import type { ProductionBatch } from '@/types'

const STEPS = ['maquina', 'produto', 'jogo', 'identificacao', 'setup', 'revisar'] as const
type Step = typeof STEPS[number]
const DRAFT_KEY = 'punch-operator-new-batch'

type Draft = {
  machineId: string
  productId: string
  punchSetId: string
  loteNumero: string
  dataProducao: string
  horaInicio: string
  setup: Record<string, string>
}

const vazio = (): Draft => ({
  machineId: '', productId: '', punchSetId: '', loteNumero: '',
  dataProducao: format(new Date(), 'yyyy-MM-dd'), horaInicio: format(new Date(), 'HH:mm'), setup: {},
})

function lerRascunho(): Draft {
  try { return { ...vazio(), ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') } } catch { return vazio() }
}

/**
 * Iniciar lote em páginas: cada passo tem endereço próprio, então voltar no
 * navegador e recarregar a página funcionam sem perder o que foi escolhido.
 */
export function NewBatch() {
  const { step } = useParams<{ step: Step }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()
  const o = t.operator
  const { companyId } = useAdminCompany()
  const [draft, setDraft] = useState<Draft>(lerRascunho)

  useEffect(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) }, [draft])
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }))

  const { data: machines = [], isLoading: l1 } = useMachinesQuery(companyId)
  const { data: products = [], isLoading: l2 } = useProductsQuery(companyId)
  const { data: sets = [], isLoading: l3 } = usePunchSetsQuery(companyId)
  const { data: configs = [], isLoading: l4 } = useProductionConfigsQuery(companyId)
  const carregando = l1 || l2 || l3 || l4

  const podeLiberarJogo = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const machine = machines.find(m => m.id === draft.machineId)
  const product = products.find(p => p.id === draft.productId)
  const punchSet = sets.find(s => s.id === draft.punchSetId)
  const config = configs.find(c => c.productId === draft.productId && c.machineId === draft.machineId)
  const params = useMemo(() => config?.params ?? [], [config])

  const criar = useMutation({
    mutationFn: () => api.post<ProductionBatch>('/production-batches', {
      productId: draft.productId,
      machineId: draft.machineId,
      punchSetId: draft.punchSetId,
      configId: config?.id ?? null,
      loteNumero: draft.loteNumero.trim(),
      dataProducao: draft.dataProducao,
      horaInicio: draft.horaInicio,
      duracaoEstimadaHoras: 8,
      status: 'DRAFT',
      fixedParams: params.map(p => ({
        ordem: p.ordem, nome: p.nome, unidade: p.unidade,
        minimo: p.minimoEfetivo, maximo: p.maximoEfetivo, sugerido: p.sugeridoEfetivo,
        valorReal: toNumberOrNull(draft.setup[p.nome] ?? ''),
      })),
    }).then(r => r.data),
    onSuccess: (lote) => {
      sessionStorage.removeItem(DRAFT_KEY)
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      qc.invalidateQueries({ queryKey: ['stats-dashboard'] })
      toast.success(o.lotStarted(lote.loteNumero))
      navigate(`/operador/lote/${lote.id}`, { replace: true })
    },
    onError: (e) => toast.error(apiMessage(e, o.startError)),
  })

  // Os passos dependem das configurações: sem os dados, um recarregamento no
  // passo de setup parecia um passo inexistente e voltava ao início
  if (carregando) return <p className="text-lg text-[#52606D]">{t.common.loading}</p>

  // O passo de setup só existe quando há parâmetros configurados para produto + máquina
  const passos = STEPS.filter(s => s !== 'setup' || params.length > 0)
  const indice = passos.indexOf(step as Step)
  if (!step || indice === -1) return <Navigate to="/operador/lote/novo/maquina" replace />

  // Não deixa pular passos pela URL
  const faltando: Step | null = !draft.machineId && indice > 0 ? 'maquina'
    : !draft.productId && indice > 1 ? 'produto'
    : !draft.punchSetId && indice > 2 ? 'jogo'
    : !draft.loteNumero.trim() && indice > passos.indexOf('identificacao') ? 'identificacao'
    : null
  if (faltando) return <Navigate to={`/operador/lote/novo/${faltando}`} replace />

  const irPara = (s: Step) => navigate(`/operador/lote/novo/${s}`)
  const proximo = () => irPara(passos[indice + 1])
  const voltar = indice === 0 ? '/operador' : `/operador/lote/novo/${passos[indice - 1]}`
  const header = (title: string, subtitle?: string, help?: Parameters<typeof ScreenHeader>[0]['help']) => (
    <ScreenHeader title={title} subtitle={subtitle} back={voltar} step={{ current: indice + 1, total: passos.length }} help={help} />
  )

  // ── Passo 1: máquina ───────────────────────────────────────────────────────
  if (step === 'maquina') {
    const ativas = machines.filter(m => m.active)
    return (
      <div className="space-y-5">
        {header(o.stepMachine, o.stepMachineHint, o.helpStart)}
        <div className="space-y-3">
          {ativas.map(m => (
            <ChoiceButton
              key={m.id}
              selected={draft.machineId === m.id}
              onClick={() => { set({ machineId: m.id, productId: draft.machineId === m.id ? draft.productId : '', setup: {} }); proximo() }}
              title={m.name}
              detail={[m.code, m.fabricante, m.modelo].filter(Boolean).join(' · ') || undefined}
            />
          ))}
          {ativas.length === 0 && <p className="text-base text-[#52606D]">{o.noMachines}</p>}
        </div>
      </div>
    )
  }

  // ── Passo 2: produto ───────────────────────────────────────────────────────
  if (step === 'produto') {
    const comConfig = new Set(configs.filter(c => c.machineId === draft.machineId).map(c => c.productId))
    const ativos = products.filter(p => p.active).sort((a, b) => Number(comConfig.has(b.id)) - Number(comConfig.has(a.id)) || a.name.localeCompare(b.name))
    return (
      <div className="space-y-5">
        {header(o.stepProduct, o.stepProductHint(machine?.name ?? ''))}
        <div className="space-y-3">
          {ativos.map(p => (
            <ChoiceButton
              key={p.id}
              selected={draft.productId === p.id}
              onClick={() => { set({ productId: p.id, setup: draft.productId === p.id ? draft.setup : {} }); proximo() }}
              title={p.name}
              detail={p.code ?? undefined}
              note={comConfig.has(p.id) ? <span className="text-[#1E8E3E]">{o.hasSetup}</span> : undefined}
            />
          ))}
          {ativos.length === 0 && <p className="text-base text-[#52606D]">{o.noProducts}</p>}
        </div>
      </div>
    )
  }

  // ── Passo 3: jogo ──────────────────────────────────────────────────────────
  if (step === 'jogo') {
    const candidatos = sets.filter(s => s.status === 'ACTIVE')
    const motivo = (s: typeof candidatos[number]) =>
      s.statusJogo === 'LIMPO' ? null : podeLiberarJogo ? null : o.setNotClean(t.jogo.statuses[s.statusJogo])
    const ordenados = [...candidatos].sort((a, b) => Number(!!motivo(a)) - Number(!!motivo(b)) || a.code.localeCompare(b.code))
    return (
      <div className="space-y-5">
        {header(o.stepSet, o.stepSetHint)}
        <div className="space-y-3">
          {ordenados.map(s => {
            const bloqueio = motivo(s)
            return (
              <ChoiceButton
                key={s.id}
                selected={draft.punchSetId === s.id}
                disabled={!!bloqueio}
                onClick={() => { set({ punchSetId: s.id }); proximo() }}
                title={<>{s.code} <span className="font-normal text-[#52606D]">· {s.name}</span></>}
                detail={o.usefulLife(Math.round(s.usefulValue))}
                note={bloqueio
                  ? <span className="text-[#C62828] inline-flex items-center gap-1"><Lock className="h-4 w-4" /> {bloqueio}</span>
                  : s.statusJogo !== 'LIMPO' ? <span className="text-[#9A6B00]">{o.managerOverride(t.jogo.statuses[s.statusJogo])}</span> : undefined}
              />
            )
          })}
          {ordenados.length === 0 && <p className="text-base text-[#52606D]">{o.noSets}</p>}
        </div>
        {ordenados.some(s => motivo(s)) && (
          <div className="rounded-2xl border-2 border-dashed border-[#9AA5B1] p-4 space-y-3">
            <p className="text-base text-[#52606D]">{o.cleanBlockedHint}</p>
            <SecondaryButton onClick={() => navigate('/operador/limpeza/jogo?voltar=lote')}>
              <Sparkles className="h-5 w-5" /> {o.cleanBlockedSet}
            </SecondaryButton>
          </div>
        )}
      </div>
    )
  }

  // ── Passo 4: identificação do lote ─────────────────────────────────────────
  if (step === 'identificacao') {
    return (
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (draft.loteNumero.trim()) proximo() }}>
        {header(o.stepLot, o.stepLotHint)}
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="lote" className="block text-base font-medium">{o.lotNumberLabel}</label>
            <input id="lote" autoFocus value={draft.loteNumero} onChange={e => set({ loteNumero: e.target.value.toUpperCase() })}
              placeholder="Z0032" autoComplete="off"
              className="w-full h-14 rounded-xl border-2 border-[#D9DEE3] bg-white px-4 text-2xl tracking-wide focus:outline-none focus:ring-4 focus:ring-primary/25" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="data" className="block text-base font-medium">{o.date}</label>
              <input id="data" type="date" value={draft.dataProducao} onChange={e => set({ dataProducao: e.target.value })}
                className="w-full h-14 rounded-xl border-2 border-[#D9DEE3] bg-white px-3 text-lg focus:outline-none focus:ring-4 focus:ring-primary/25" />
            </div>
            <div className="space-y-1">
              <label htmlFor="hora" className="block text-base font-medium">{o.startTime}</label>
              <input id="hora" type="time" value={draft.horaInicio} onChange={e => set({ horaInicio: e.target.value })}
                className="w-full h-14 rounded-xl border-2 border-[#D9DEE3] bg-white px-3 text-lg focus:outline-none focus:ring-4 focus:ring-primary/25" />
            </div>
          </div>
        </div>
        <BottomAction><PrimaryButton type="submit" disabled={!draft.loteNumero.trim()}>{o.continue}</PrimaryButton></BottomAction>
      </form>
    )
  }

  // ── Passo 5: setup da máquina ──────────────────────────────────────────────
  if (step === 'setup') {
    const fora = params.filter(p => {
      const n = toNumberOrNull(draft.setup[p.nome] ?? '')
      return n !== null && ((p.minimoEfetivo != null && n < p.minimoEfetivo) || (p.maximoEfetivo != null && n > p.maximoEfetivo))
    }).length
    return (
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); proximo() }}>
        {header(o.stepSetup, o.stepSetupHint, o.helpSetup)}
        <div className="space-y-5">
          {params.map(p => (
            <BigNumberField
              key={p.id}
              id={`p-${p.id}`}
              label={p.nome}
              unit={p.unidade && p.unidade !== '—' ? p.unidade : null}
              value={draft.setup[p.nome] ?? ''}
              onChange={v => set({ setup: { ...draft.setup, [p.nome]: v } })}
              min={p.minimoEfetivo}
              max={p.maximoEfetivo}
              strict
              rangeLabel={p.minimoEfetivo != null || p.maximoEfetivo != null
                ? o.allowedRange(p.minimoEfetivo ?? '—', p.maximoEfetivo ?? '—', p.sugeridoEfetivo)
                : undefined}
            />
          ))}
        </div>
        <BottomAction>
          {fora > 0 && <p className="text-base text-[#C62828] font-medium mb-2 flex items-center gap-2"><XCircle className="h-5 w-5" /> {o.outOfRange(fora)}</p>}
          <PrimaryButton type="submit">{o.continue}</PrimaryButton>
        </BottomAction>
      </form>
    )
  }

  // ── Passo 6: revisar e começar ─────────────────────────────────────────────
  const linhas: [string, string, Step][] = [
    [o.stepMachine, machine?.name ?? '—', 'maquina'],
    [o.stepProduct, product?.name ?? '—', 'produto'],
    [o.stepSet, punchSet ? `${punchSet.code} · ${punchSet.name}` : '—', 'jogo'],
    [o.lotNumberLabel, draft.loteNumero, 'identificacao'],
    [o.startTime, `${format(new Date(`${draft.dataProducao}T00:00:00`), 'dd/MM/yyyy')} ${draft.horaInicio}`, 'identificacao'],
  ]
  const preenchidos = params.filter(p => toNumberOrNull(draft.setup[p.nome] ?? '') !== null).length
  return (
    <div className="space-y-5">
      {header(o.stepReview, o.stepReviewHint)}
      <dl className="rounded-2xl bg-white border divide-y">
        {linhas.map(([rotulo, valor, destino]) => (
          <div key={rotulo} className="flex items-center gap-3 px-4 py-3 min-h-16">
            <div className="flex-1 min-w-0">
              <dt className="text-sm text-[#52606D]">{rotulo}</dt>
              <dd className="text-lg font-medium truncate">{valor}</dd>
            </div>
            <button type="button" onClick={() => irPara(destino)} className="h-11 px-3 rounded-lg text-base text-primary hover:bg-primary/10">{o.change}</button>
          </div>
        ))}
        {params.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 min-h-16">
            <div className="flex-1">
              <dt className="text-sm text-[#52606D]">{o.stepSetup}</dt>
              <dd className={cn('text-lg font-medium flex items-center gap-2', preenchidos === params.length ? 'text-[#1E8E3E]' : 'text-[#9A6B00]')}>
                {preenchidos === params.length && <CheckCircle2 className="h-5 w-5" />}{o.setupFilled(preenchidos, params.length)}
              </dd>
            </div>
            <button type="button" onClick={() => irPara('setup')} className="h-11 px-3 rounded-lg text-base text-primary hover:bg-primary/10">{o.change}</button>
          </div>
        )}
      </dl>
      <BottomAction>
        <PrimaryButton onClick={() => criar.mutate()} loading={criar.isPending}>{o.startLot}</PrimaryButton>
      </BottomAction>
    </div>
  )
}
