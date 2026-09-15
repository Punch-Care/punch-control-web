import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useMachinesQuery, usePunchSetsQuery } from '@/hooks/queries'
import {
  ScreenHeader, ChoiceButton, BottomAction, PrimaryButton, SetChoiceList, ReviewList, DoneScreen, apiMessage, readDraft,
} from './shared'

const STEPS = ['jogo', 'tipo', 'maquina', 'descricao', 'revisar'] as const
type Step = typeof STEPS[number] | 'pronto'
const TYPES = ['COMPRESSION', 'DIMENSIONAL', 'MAINTENANCE', 'OTHER'] as const
type ProblemType = typeof TYPES[number]
const DRAFT_KEY = 'punch-operator-problem'

type Draft = { setId: string; type: ProblemType | ''; machineId: string | null; machineChosen: boolean; description: string }
const vazio: Draft = { setId: '', type: '', machineId: null, machineChosen: false, description: '' }

/** Registrar problema em páginas: jogo → tipo → máquina → o que aconteceu → conferir */
export function ReportProblem() {
  const { step } = useParams<{ step: Step }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const f = t.opFlows
  const { companyId } = useAdminCompany()
  const [draft, setDraft] = useState<Draft>(() => readDraft(DRAFT_KEY, vazio))
  useEffect(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) }, [draft])
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }))

  const { data: sets = [], isLoading: l1 } = usePunchSetsQuery(companyId)
  const { data: machines = [], isLoading: l2 } = useMachinesQuery(companyId)

  const enviar = useMutation({
    mutationFn: () => api.post('/occurrences', {
      setId: draft.setId,
      type: draft.type,
      machineId: draft.machineId ?? undefined,
      description: draft.description.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      qc.invalidateQueries({ queryKey: ['stats-dashboard'] })
      navigate('/operador/problema/pronto', { replace: true })
    },
    onError: (e) => toast.error(apiMessage(e, f.saveError)),
  })

  if (step === 'pronto') {
    return (
      <DoneScreen
        title={f.problemDoneTitle}
        text={f.problemDoneText}
        primary={{ label: f.backHome, onClick: () => { sessionStorage.removeItem(DRAFT_KEY); navigate('/operador') } }}
        secondary={{ label: f.reportAnother, onClick: () => { sessionStorage.removeItem(DRAFT_KEY); setDraft(vazio); navigate('/operador/problema/jogo') } }}
      />
    )
  }

  if (l1 || l2) return <p className="text-sm text-muted-foreground">{t.common.loading}</p>

  const ativas = machines.filter(m => m.active)
  const passos = STEPS.filter(s => s !== 'maquina' || ativas.length > 0)
  const indice = passos.indexOf(step as typeof STEPS[number])
  if (indice === -1) return <Navigate to="/operador/problema/jogo" replace />

  const faltando = !draft.setId && indice > 0 ? 'jogo'
    : !draft.type && indice > passos.indexOf('tipo') ? 'tipo'
    : draft.description.trim().length < 5 && indice > passos.indexOf('descricao') ? 'descricao'
    : null
  if (faltando) return <Navigate to={`/operador/problema/${faltando}`} replace />

  const irPara = (s: Step) => navigate(`/operador/problema/${s}`)
  const proximo = () => irPara(passos[indice + 1])
  const voltar = indice === 0 ? '/operador' : `/operador/problema/${passos[indice - 1]}`
  const header = (title: string, subtitle?: string, help = false) => (
    <ScreenHeader title={title} subtitle={subtitle} back={voltar} step={{ current: indice + 1, total: passos.length }} help={help ? f.helpProblem : undefined} />
  )
  const punchSet = sets.find(s => s.id === draft.setId)
  const machine = ativas.find(m => m.id === draft.machineId)

  if (step === 'jogo') {
    return (
      <div className="space-y-5">
        {header(f.pickSet, f.pickSetHint, true)}
        <SetChoiceList
          sets={sets.filter(s => s.status === 'ACTIVE' || s.status === 'IN_REPAIR')}
          selectedId={draft.setId}
          onPick={s => { set({ setId: s.id }); proximo() }}
          emptyText={f.noSets}
        />
      </div>
    )
  }

  if (step === 'tipo') {
    return (
      <div className="space-y-5">
        {header(f.problemTypeTitle, f.problemTypeHint, true)}
        <div className="space-y-3">
          {TYPES.map(tipo => (
            <ChoiceButton
              key={tipo}
              selected={draft.type === tipo}
              onClick={() => { set({ type: tipo }); proximo() }}
              title={f.problemTypes[tipo].title}
              detail={<span className="whitespace-normal">{f.problemTypes[tipo].desc}</span>}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 'maquina') {
    return (
      <div className="space-y-5">
        {header(f.problemMachineTitle, f.problemMachineHint)}
        <div className="space-y-3">
          {ativas.map(m => (
            <ChoiceButton
              key={m.id}
              selected={draft.machineChosen && draft.machineId === m.id}
              onClick={() => { set({ machineId: m.id, machineChosen: true }); proximo() }}
              title={m.name}
              detail={[m.code, m.fabricante, m.modelo].filter(Boolean).join(' · ') || undefined}
            />
          ))}
          <ChoiceButton
            selected={draft.machineChosen && draft.machineId === null}
            onClick={() => { set({ machineId: null, machineChosen: true }); proximo() }}
            title={f.noMachine}
          />
        </div>
      </div>
    )
  }

  if (step === 'descricao') {
    const curto = draft.description.trim().length < 5
    return (
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (!curto) proximo() }}>
        {header(f.describeTitle, f.describeHint, true)}
        <div className="space-y-1">
          <label htmlFor="descricao" className="block text-base font-medium">{f.describeLabel}</label>
          <textarea
            id="descricao"
            autoFocus
            rows={5}
            value={draft.description}
            onChange={e => set({ description: e.target.value })}
            placeholder={f.describePlaceholder}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {draft.description.length > 0 && curto && <p className="text-sm text-amber-700">{f.describeMin}</p>}
        </div>
        <BottomAction><PrimaryButton type="submit" disabled={curto}>{f.continue}</PrimaryButton></BottomAction>
      </form>
    )
  }

  return (
    <div className="space-y-5">
      {header(f.confirmTitle, f.confirmHint)}
      <ReviewList rows={[
        { label: f.setRow, value: punchSet ? `${punchSet.code} · ${punchSet.name}` : '—', onChange: () => irPara('jogo') },
        { label: f.problemTypeRow, value: draft.type ? f.problemTypes[draft.type].title : '—', onChange: () => irPara('tipo') },
        ...(ativas.length > 0 ? [{ label: f.machineRow, value: machine?.name ?? f.noMachine, onChange: () => irPara('maquina') }] : []),
        { label: f.descriptionRow, value: <span className="font-normal">{draft.description.trim()}</span>, onChange: () => irPara('descricao') },
      ]} />
      <BottomAction>
        <PrimaryButton onClick={() => enviar.mutate()} loading={enviar.isPending}>{f.sendProblem}</PrimaryButton>
      </BottomAction>
    </div>
  )
}
