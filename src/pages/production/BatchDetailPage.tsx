import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2, Clock, Download, FlaskConical, XCircle, ChevronRight, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { parseDateOnly } from '@/lib/utils'
import { useLocale } from '@/hooks/useLocale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { HelpButton } from '@/components/ui/help-button'
import { nextMeasurementTime } from '@/pages/operator/shared'
import { generateCompletedPdf } from './BatchFormPage'
import { BatchActionsMenu } from './BatchActionsMenu'
import type { ProductionBatch, PunchSet } from '@/types'

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * Página do lote: primeiro o que está acontecendo e o que fazer agora,
 * depois o registro organizado (setup, medições, problemas). Editar o
 * formulário inteiro fica em "Mais ações".
 */
export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const b = t.batchPage
  const o = t.operator

  const { data: lote, isLoading } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
    enabled: !!id,
  })
  const { data: jogo } = useQuery<PunchSet>({
    queryKey: ['punch-set', lote?.punchSetId],
    queryFn: () => api.get(`/punch-sets/${lote!.punchSetId}`).then(r => r.data),
    enabled: !!lote,
  })

  if (isLoading || !lote) return <p className="p-6 text-sm text-muted-foreground">{t.common.loading}</p>

  const emAndamento = lote.status !== 'COMPLETED'
  const medicoes = [...(lote.hourlyMeasurements ?? [])].sort((a, c) => a.horario.localeCompare(c.horario))
  const params = [...(lote.fixedParams ?? [])].sort((a, c) => a.ordem - c.ordem)
  const problemas = lote.batchOccurrences ?? []
  const proxima = nextMeasurementTime(lote, medicoes)
  const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString(locale, { maximumFractionDigits: 3 }))
  const dataInicio = format(parseDateOnly(lote.dataProducao), 'dd/MM/yyyy')

  const fatos: { label: string; value: ReactNode }[] = [
    { label: b.factStart, value: <>{dataInicio} <span className="text-muted-foreground font-normal">{lote.horaInicio}</span></> },
    { label: b.factKg, value: lote.kgProduzidos != null ? `${num(lote.kgProduzidos)} kg` : '—' },
    { label: b.factMeasurements, value: medicoes.length },
    { label: b.factProblems, value: <span className={problemas.length ? 'text-red-600' : ''}>{problemas.length}</span> },
  ]

  // Duas colunas por grandeza: direito/esquerdo ou lado 1/lado 2
  const grupos = [
    { titulo: o.groups.rolo, campos: [['roloCmpDir', b.rightShort], ['roloCmpEsq', b.leftShort]] },
    { titulo: o.groups.rampa, campos: [['rampaDosDir', b.rightShort], ['rampaDosEsq', b.leftShort]] },
    { titulo: o.groups.cfc, campos: [['pressaoCFCL1', 'L1'], ['pressaoCFCL2', 'L2']] },
    { titulo: `${o.groups.cv} (%)`, campos: [['coefVarL1', 'L1'], ['coefVarL2', 'L2']] },
  ] as const

  return (
    <div className="min-h-full bg-muted/20">
      {/* Cabeçalho: quem é o lote e a ação principal */}
      <div className="bg-background border-b px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-start gap-3">
          <Button variant="ghost" size="icon" className="flex-shrink-0 -ml-2" onClick={() => navigate('/production')} aria-label={o.back}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <Breadcrumb items={[{ label: t.production.title, href: '/production' }, { label: b.lotTitle(lote.loteNumero) }]} />
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{b.lotTitle(lote.loteNumero)}</h1>
              <Badge variant={emAndamento ? 'secondary' : 'success'} className="gap-1">
                {emAndamento ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {emAndamento ? t.production.statusDraft : t.production.statusCompleted}
              </Badge>
              <HelpButton content={b.helpBatch} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{lote.product.name} · {lote.machine.name} · {o.setShort(lote.punchSet.code)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!emAndamento && (
              <Button variant="outline" onClick={() => generateCompletedPdf(lote, t.batchForm)}>
                <Download className="h-4 w-4" /> {b.downloadPdf}
              </Button>
            )}
            <BatchActionsMenu batch={lote} label onDeleted={() => navigate('/production')} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* O que fazer agora */}
        {emAndamento ? (
          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <span className="hidden sm:flex h-12 w-12 rounded-xl bg-primary/10 text-primary items-center justify-center flex-shrink-0">
                <FlaskConical className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{o.nextMeasurement}</p>
                <p className="text-3xl font-bold tabular-nums leading-tight">{proxima}</p>
                <p className="text-sm text-muted-foreground">{b.inProgressHint}</p>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-col lg:flex-row">
              <Button className="flex-1" onClick={() => navigate(`/operador/lote/${lote.id}/medicao`)}>{b.recordMeasurement}</Button>
              <Button className="flex-1" variant="outline" onClick={() => navigate(`/operador/lote/${lote.id}/encerrar/kg`)}>{b.finish}</Button>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-green-200 bg-green-50/60 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm">{b.completedHint(num(lote.kgProduzidos))}</p>
          </section>
        )}

        {/* Resumo em quatro números */}
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {fatos.map(f => (
            <div key={f.label} className="rounded-xl border bg-card shadow-sm px-4 py-3">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            {/* Medições da hora */}
            <Section title={b.measurementsTitle} aside={emAndamento && medicoes.length > 0 ? <span className="text-xs text-muted-foreground hidden sm:inline">{b.tapToFix}</span> : undefined}>
              {medicoes.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">{b.measurementsEmpty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th rowSpan={2} className="text-left font-medium px-4 py-2">{b.hour}</th>
                        {grupos.map(g => <th key={g.titulo} colSpan={2} className="font-medium px-2 pt-2 text-center border-l">{g.titulo}</th>)}
                        <th rowSpan={2} className="text-left font-medium px-4 py-2 border-l">{b.who}</th>
                      </tr>
                      <tr>
                        {grupos.flatMap(g => g.campos.map(([campo, rotulo], i) => (
                          <th key={campo} className={`font-medium px-2 pb-2 text-center ${i === 0 ? 'border-l' : ''}`}>{rotulo}</th>
                        )))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {medicoes.map(m => (
                        <tr key={m.id}
                          className={emAndamento ? 'cursor-pointer hover:bg-muted/40' : ''}
                          onClick={emAndamento ? () => navigate(`/operador/lote/${lote.id}/medicao/${m.id}`) : undefined}>
                          <td className="px-4 py-2 font-semibold tabular-nums">{m.horario}</td>
                          {grupos.flatMap(g => g.campos.map(([campo], i) => (
                            <td key={campo} className={`px-2 py-2 text-center tabular-nums ${i === 0 ? 'border-l' : ''}`}>{num(m[campo])}</td>
                          )))}
                          <td className="px-4 py-2 border-l text-muted-foreground truncate max-w-[10rem]">{m.responsavel ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Setup */}
            <Section title={b.setupTitle}>
              {params.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">{b.setupEmpty}</p>
              ) : (
                <ul className="divide-y">
                  {params.map(p => (
                    <li key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{b.range}: {num(p.minimo)} – {num(p.maximo)}{p.unidade && p.unidade !== '—' ? ` ${p.unidade}` : ''}</p>
                      </div>
                      <p className="text-base font-semibold tabular-nums">{p.valorReal == null ? <span className="text-sm font-normal text-muted-foreground">{b.notFilled}</span> : num(p.valorReal)}</p>
                      {p.valorReal != null && (p.isOk === false
                        ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{b.outRange}</Badge>
                        : <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{b.inRange}</Badge>)}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            {/* Problemas e observações */}
            <Section title={b.problemsTitle}>
              <div className="px-4 sm:px-5 py-4 space-y-4 text-sm">
                {problemas.length === 0 ? (
                  <p className="text-muted-foreground">{b.noneReported}</p>
                ) : (
                  <ul className="space-y-2">
                    {problemas.map(pr => (
                      <li key={pr.id} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span><span className="font-medium">{t.production[pr.type]}</span>{pr.notas ? <span className="text-muted-foreground"> — {pr.notas}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {lote.observacoesOperador && (
                  <div><p className="text-xs text-muted-foreground">{b.operatorNotes}</p><p>{lote.observacoesOperador}</p></div>
                )}
                {lote.observacoesTecnico && (
                  <div><p className="text-xs text-muted-foreground">{b.technicianNotes}</p><p>{lote.observacoesTecnico}</p></div>
                )}
              </div>
            </Section>

            {/* Jogo */}
            <Section title={b.setTitle}>
              <Link to={`/sets/${lote.punchSetId}`} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-mono">{lote.punchSet.code}</p>
                  <p className="text-xs text-muted-foreground truncate">{lote.punchSet.name}</p>
                  {jogo && <p className="text-xs mt-1">{o.usefulLife(Math.round(jogo.usefulValue))}</p>}
                </div>
                <span className="text-sm text-primary inline-flex items-center">{b.openSet}<ChevronRight className="h-4 w-4" /></span>
              </Link>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
