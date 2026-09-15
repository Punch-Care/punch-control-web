import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { usePunchSetsQuery } from '@/hooks/queries'
import {
  ScreenHeader, ChoiceButton, BottomAction, PrimaryButton, SetChoiceList, ReviewList, DoneScreen, QuantityStepper,
  apiMessage, readDraft,
} from './shared'
import type { ComponentInventoryType, LifecycleData, PunchSet } from '@/types'

const ACTIONS = ['LIMPO', 'POLIDO', 'NAO_LIMPO', 'EM_MANUTENCAO', 'COLOQUEI', 'DEVOLVI'] as const
type Action = typeof ACTIONS[number]
const COMPONENTS: ComponentInventoryType[] = ['P_SUPERIOR', 'P_INFERIOR', 'MATRIZ_1', 'MATRIZ_2']
type Step = 'jogo' | 'acao' | 'peca' | 'quantidade' | 'revisar' | 'pronto'
const DRAFT_KEY = 'punch-operator-cleaning'

type Draft = { setId: string; action: Action | ''; componente: ComponentInventoryType | ''; quantidade: number; notas: string; voltarLote?: boolean }
const vazio: Draft = { setId: '', action: '', componente: '', quantidade: 1, notas: '' }
type DoneState = { code: string; statusJogo?: PunchSet['statusJogo']; sobra?: number | null; resumo?: string; voltarLote?: boolean }

const trocaDePecas = (a: Draft['action']) => a === 'COLOQUEI' || a === 'DEVOLVI'

/** Limpeza, polimento, manutenção e troca de peças do jogo, uma escolha por página */
export function CleaningFlow() {
  const { step } = useParams<{ step: Step }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: DoneState }
  const qc = useQueryClient()
  const { t } = useLocale()
  const f = t.opFlows
  const { companyId } = useAdminCompany()
  const [searchParams] = useSearchParams()
  // Veio do Iniciar lote com jogo bloqueado: no fim, volta para escolher o jogo
  const [draft, setDraft] = useState<Draft>(() => ({ ...readDraft(DRAFT_KEY, vazio), ...(searchParams.get('voltar') === 'lote' ? { voltarLote: true } : {}) }))
  useEffect(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) }, [draft])
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }))

  const { data: sets = [], isLoading } = usePunchSetsQuery(companyId)
  const punchSet = sets.find(s => s.id === draft.setId)
  const troca = trocaDePecas(draft.action)

  const { data: vida } = useQuery<LifecycleData>({
    queryKey: ['lifecycle', draft.setId],
    queryFn: () => api.get(`/punch-sets/${draft.setId}/lifecycle`).then(r => r.data),
    enabled: !!draft.setId && troca,
  })
  const estoque = (c: ComponentInventoryType) => vida?.inventory.find(i => i.tipo === c)?.sobra ?? null

  const salvar = useMutation({
    mutationFn: async (): Promise<DoneState> => {
      const code = punchSet?.code ?? ''
      if (troca) {
        await api.post(`/punch-sets/${draft.setId}/lifecycle/maintenance`, {
          data: new Date().toISOString(),
          componente: draft.componente,
          // Positivo tira do estoque (colocou no jogo); negativo devolve
          quantidade: draft.action === 'COLOQUEI' ? draft.quantidade : -draft.quantidade,
          notas: draft.notas.trim() || null,
        })
        const atual = await api.get<LifecycleData>(`/punch-sets/${draft.setId}/lifecycle`).then(r => r.data)
        const peca = draft.componente ? t.componentTypes[draft.componente] : ''
        return {
          code,
          sobra: atual.inventory.find(i => i.tipo === draft.componente)?.sobra ?? null,
          resumo: draft.action === 'COLOQUEI' ? f.partsPut(draft.quantidade, peca, code) : f.partsReturned(draft.quantidade, peca, code),
        }
      }
      const r = await api.post<PunchSet>(`/punch-sets/${draft.setId}/cleaning`, { acao: draft.action })
      return { code, statusJogo: r.data.statusJogo, voltarLote: draft.voltarLote }
    },
    onSuccess: (done) => {
      qc.invalidateQueries({ queryKey: ['punch-sets'] })
      qc.invalidateQueries({ queryKey: ['stats-dashboard'] })
      qc.invalidateQueries({ queryKey: ['lifecycle', draft.setId] })
      sessionStorage.removeItem(DRAFT_KEY)
      navigate('/operador/limpeza/pronto', { replace: true, state: done })
    },
    onError: (e) => toast.error(apiMessage(e, f.saveError)),
  })

  if (step === 'pronto') {
    const recomecar = () => { setDraft(vazio); navigate('/operador/limpeza/jogo') }
    return (
      <DoneScreen
        title={f.cleaningDoneTitle}
        text={state?.statusJogo ? f.setNowIs(state.code, t.jogo.statuses[state.statusJogo]) : state?.resumo}
        primary={state?.voltarLote && state.statusJogo === 'LIMPO'
          ? { label: f.backToBatch, onClick: () => navigate('/operador/lote/novo/jogo') }
          : { label: f.backHome, onClick: () => navigate('/operador') }}
        secondary={{ label: f.recordAnother, onClick: recomecar }}
      >
        {state?.sobra != null && (
          <p className="rounded-2xl bg-white border p-5 text-2xl font-semibold text-center">{f.stockLeft(state.sobra)}</p>
        )}
      </DoneScreen>
    )
  }

  if (isLoading) return <p className="text-lg text-[#52606D]">{t.common.loading}</p>

  const passos: Step[] = troca ? ['jogo', 'acao', 'peca', 'quantidade', 'revisar'] : ['jogo', 'acao', 'revisar']
  const indice = passos.indexOf(step as Step)
  if (indice === -1) return <Navigate to="/operador/limpeza/jogo" replace />
  const faltando = !draft.setId && indice > 0 ? 'jogo'
    : !draft.action && indice > 1 ? 'acao'
    : troca && !draft.componente && indice > 2 ? 'peca'
    : null
  if (faltando) return <Navigate to={`/operador/limpeza/${faltando}`} replace />

  const irPara = (s: Step) => navigate(`/operador/limpeza/${s}`)
  const voltar = indice === 0 ? '/operador' : `/operador/limpeza/${passos[indice - 1]}`
  const header = (title: string, subtitle?: string, help = false) => (
    <ScreenHeader title={title} subtitle={subtitle} back={voltar} step={{ current: indice + 1, total: passos.length }} help={help ? f.helpCleaning : undefined} />
  )

  if (step === 'jogo') {
    return (
      <div className="space-y-5">
        {header(f.pickSet, f.pickSetHint, true)}
        <SetChoiceList
          sets={sets.filter(s => (s.status === 'ACTIVE' || s.status === 'IN_REPAIR') && (!draft.voltarLote || s.statusJogo !== 'LIMPO'))}
          selectedId={draft.setId}
          onPick={s => { set({ setId: s.id }); irPara('acao') }}
          emptyText={f.noSets}
        />
      </div>
    )
  }

  if (step === 'acao') {
    return (
      <div className="space-y-5">
        {header(f.cleaningActionTitle, punchSet ? `${punchSet.code} · ${t.jogo.statuses[punchSet.statusJogo]}` : f.cleaningActionHint, true)}
        <div className="space-y-3">
          {ACTIONS.map(a => (
            <ChoiceButton
              key={a}
              selected={draft.action === a}
              onClick={() => { set({ action: a }); irPara(trocaDePecas(a) ? 'peca' : 'revisar') }}
              title={f.cleaningActions[a].title}
              detail={<span className="whitespace-normal">{f.cleaningActions[a].desc}</span>}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 'peca') {
    return (
      <div className="space-y-5">
        {header(f.componentTitle, f.componentHint)}
        <div className="space-y-3">
          {COMPONENTS.map(c => {
            const sobra = estoque(c)
            return (
              <ChoiceButton
                key={c}
                selected={draft.componente === c}
                onClick={() => { set({ componente: c }); irPara('quantidade') }}
                title={t.componentTypes[c]}
                detail={sobra === null ? f.noStockInfo : f.inStock(sobra)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 'quantidade') {
    const sobra = draft.componente ? estoque(draft.componente) : null
    const acimaDoEstoque = draft.action === 'COLOQUEI' && sobra !== null && draft.quantidade > sobra
    return (
      <div className="space-y-6">
        {header(draft.action === 'COLOQUEI' ? f.qtyPutTitle : f.qtyReturnTitle, draft.componente ? t.componentTypes[draft.componente] : f.qtyHint)}
        <QuantityStepper label={f.qtyLabel} value={draft.quantidade} onChange={n => set({ quantidade: n })} />
        <p className="text-center text-base text-[#52606D]">{sobra === null ? f.qtyHint : f.inStock(sobra)}</p>
        {acimaDoEstoque && (
          <p className="text-base text-[#9A6B00] font-medium flex items-center gap-2 justify-center"><AlertTriangle className="h-5 w-5" /> {f.moreThanStock}</p>
        )}
        <BottomAction><PrimaryButton onClick={() => irPara('revisar')}>{f.continue}</PrimaryButton></BottomAction>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {header(f.confirmTitle, f.confirmHint)}
      <ReviewList rows={[
        { label: f.setRow, value: punchSet ? `${punchSet.code} · ${punchSet.name}` : '—', onChange: () => irPara('jogo') },
        { label: f.actionRow, value: draft.action ? f.cleaningActions[draft.action].title : '—', onChange: () => irPara('acao') },
        ...(troca ? [
          { label: f.componentRow, value: draft.componente ? t.componentTypes[draft.componente] : '—', onChange: () => irPara('peca') },
          { label: f.qtyRow, value: String(draft.quantidade), onChange: () => irPara('quantidade') },
        ] : []),
        { label: f.whenRow, value: f.now },
      ]} />
      {troca && (
        <div className="space-y-1">
          <label htmlFor="notas" className="block text-base font-medium">{f.noteLabel}</label>
          <textarea id="notas" rows={2} value={draft.notas} onChange={e => set({ notas: e.target.value })} placeholder={f.notePlaceholder}
            className="w-full rounded-xl border-2 border-[#D9DEE3] bg-white px-4 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-primary/25" />
        </div>
      )}
      <BottomAction>
        <PrimaryButton onClick={() => salvar.mutate()} loading={salvar.isPending}>{f.saveRecord}</PrimaryButton>
      </BottomAction>
    </div>
  )
}
