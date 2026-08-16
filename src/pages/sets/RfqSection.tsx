import { useState } from 'react'
import { Building2, User, Factory, Tags, Loader2, Save, Unlink, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { ToolingSection, CARACTERISTICAS_PRODUTO } from './ToolingSection'
import { generateRfqPdf } from './rfq-pdf'
import type { PunchSet, Company, Machine, ToolingComponent, Product } from '@/types'

// Parse do campo caracteristicas (JSON string array) com fallback seguro.
function parseCaracteristicas(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

type CompanyDraft = {
  cnpj: string; razaoSocial: string; inscricaoEstadual: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; cidade: string; estado: string; telefone: string
}

function field(label: string, value: string, onChange: (v: string) => void, disabled: boolean, placeholder = '', span?: string) {
  return (
    <div className={`space-y-1 ${span ?? ''}`}>
      <Label className="text-xs">{label}</Label>
      <Input className="h-8 text-xs" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} />
    </div>
  )
}

export function RfqSection({ set, canEdit }: { set: PunchSet; canEdit: boolean }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  // ── Empresa ──────────────────────────────────────────────────────────────
  const { data: company } = useQuery<Company>({
    queryKey: ['company', set.companyId],
    queryFn: () => api.get(`/companies/${set.companyId}`).then(r => r.data),
    enabled: !!set.companyId,
  })

  const [companyDraft, setCompanyDraft] = useState<CompanyDraft | null>(null)
  const cd: CompanyDraft = companyDraft ?? {
    cnpj: company?.cnpj ?? '', razaoSocial: company?.razaoSocial ?? '', inscricaoEstadual: company?.inscricaoEstadual ?? '',
    cep: company?.cep ?? '', logradouro: company?.logradouro ?? '', numero: company?.numero ?? '', complemento: company?.complemento ?? '',
    bairro: company?.bairro ?? '', cidade: company?.cidade ?? '', estado: company?.estado ?? '', telefone: company?.telefone ?? '',
  }
  const setCd = (patch: Partial<CompanyDraft>) => setCompanyDraft({ ...cd, ...patch })

  const saveCompany = useMutation({
    // COMPANY edita a própria empresa via /me; ADMIN/MANAGER via /:id.
    mutationFn: () => api.put(isAdmin ? `/companies/${set.companyId}` : '/companies/me', cd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company', set.companyId] }); setCompanyDraft(null); toast.success('Dados da empresa salvos') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao salvar empresa'),
  })

  // ── Máquinas ────────────────────────────────────────────────────────────────
  // O RFQ do cliente lista as compressoras a que o ferramental serve, não todas
  // as da empresa — daí o vínculo explícito, com as demais oferecidas para incluir.
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines', set.companyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: set.companyId } }).then(r => r.data),
    enabled: !!set.companyId,
  })

  const { data: setMachines = [] } = useQuery<Machine[]>({
    queryKey: ['punch-set-machines', set.id],
    queryFn: () => api.get(`/punch-sets/${set.id}/machines`).then(r => r.data),
  })

  const linkMachine = useMutation({
    mutationFn: (machineId: string) => api.post(`/punch-sets/${set.id}/machines`, { machineId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['punch-set-machines', set.id] }); toast.success('Compressora vinculada') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao vincular'),
  })

  const unlinkMachine = useMutation({
    mutationFn: (machineId: string) => api.delete(`/punch-sets/${set.id}/machines/${machineId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['punch-set-machines', set.id] }); toast.success('Compressora desvinculada') },
    onError: () => toast.error('Erro ao desvincular'),
  })

  const naoVinculadas = machines.filter(m => !setMachines.some(sm => sm.id === m.id))

  // ── Solicitante + Características + Observações (no próprio jogo) ─────────────
  const [solicitante, setSolicitante] = useState(set.solicitante ?? '')
  const [funcaoSolicitante, setFuncao] = useState(set.funcaoSolicitante ?? '')
  const [emailSolicitante, setEmail] = useState(set.emailSolicitante ?? '')
  const [telefoneSolicitante, setTel] = useState(set.telefoneSolicitante ?? '')
  const [caracteristicas, setCaracteristicas] = useState<string[]>(parseCaracteristicas(set.caracteristicas))
  const [notes, setNotes] = useState(set.notes ?? '')

  // ── Exportação do RFQ ────────────────────────────────────────────────────────
  const { data: components = [] } = useQuery<ToolingComponent[]>({
    queryKey: ['tooling-components', set.id],
    queryFn: () => api.get(`/punch-sets/${set.id}/tooling-components`).then(r => r.data),
  })

  const { data: linkedProducts = [] } = useQuery<Product[]>({
    queryKey: ['punch-set-products', set.id],
    queryFn: () => api.get(`/punch-sets/${set.id}/products`).then(r => r.data),
  })

  const exportRfq = () => {
    generateRfqPdf({
      set, company, machines: setMachines, components,
      products: linkedProducts, caracteristicas,
    })
    toast.success('RFQ exportado')
  }

  const toggleCaracteristica = (c: string) =>
    setCaracteristicas(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const saveSet = useMutation({
    mutationFn: () => api.put(`/punch-sets/${set.id}`, {
      solicitante: solicitante || null,
      funcaoSolicitante: funcaoSolicitante || null,
      emailSolicitante: emailSolicitante || null,
      telefoneSolicitante: telefoneSolicitante || null,
      caracteristicas: caracteristicas.length ? JSON.stringify(caracteristicas) : null,
      notes: notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['punch-set', set.id] }); toast.success('Dados do RFQ salvos') },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Erro ao salvar'),
  })

  return (
    <div className="space-y-4">
      {/* Cabeçalho — exportação no formato da planilha de RFQ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Estes dados compõem o documento enviado ao fornecedor.
        </p>
        <Button size="sm" variant="outline" onClick={exportRfq}>
          <FileDown className="h-4 w-4" /> Exportar RFQ em PDF
        </Button>
      </div>

      {/* ── Dados da empresa ── */}
      <section className="border rounded-xl p-4 bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-base">Dados da empresa</h3>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>
              {saveCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar empresa
            </Button>
          )}
        </div>
        <div className="text-sm font-medium">{company?.name ?? set.company?.name ?? '—'}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {field('CNPJ', cd.cnpj, v => setCd({ cnpj: v }), !canEdit, '00.000.000/0000-00')}
          {field('Inscrição Estadual', cd.inscricaoEstadual, v => setCd({ inscricaoEstadual: v }), !canEdit)}
          {field('Razão Social', cd.razaoSocial, v => setCd({ razaoSocial: v }), !canEdit, '', 'sm:col-span-2')}
          {field('Logradouro', cd.logradouro, v => setCd({ logradouro: v }), !canEdit, '', 'sm:col-span-2')}
          {field('Nº', cd.numero, v => setCd({ numero: v }), !canEdit)}
          {field('Complemento', cd.complemento, v => setCd({ complemento: v }), !canEdit)}
          {field('Bairro', cd.bairro, v => setCd({ bairro: v }), !canEdit)}
          {field('Cidade', cd.cidade, v => setCd({ cidade: v }), !canEdit)}
          {field('Estado', cd.estado, v => setCd({ estado: v }), !canEdit, 'UF')}
          {field('CEP', cd.cep, v => setCd({ cep: v }), !canEdit, '00000-000')}
          {field('Telefone', cd.telefone, v => setCd({ telefone: v }), !canEdit)}
        </div>
      </section>

      {/* ── Dados do solicitante + Características + Observações ── */}
      <section className="border rounded-xl p-4 bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-base">Solicitante e características</h3>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => saveSet.mutate()} disabled={saveSet.isPending}>
              {saveSet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {field('Solicitante', solicitante, setSolicitante, !canEdit)}
          {field('Função', funcaoSolicitante, setFuncao, !canEdit)}
          {field('E-mail', emailSolicitante, setEmail, !canEdit)}
          {field('Telefone', telefoneSolicitante, setTel, !canEdit)}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Tags className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Características do produto</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CARACTERISTICAS_PRODUTO.map(c => {
              const selected = caracteristicas.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleCaracteristica(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60 ${
                    selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t pt-3">
          {field('Observações', notes, setNotes, !canEdit, 'Texto livre')}
        </div>
      </section>

      {/* ── Informações da máquina (referência da empresa) ── */}
      <section className="border rounded-xl p-4 bg-background space-y-3">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-base">Informações da máquina</h3>
          <span className="text-xs text-muted-foreground">Compressoras a que este jogo serve</span>
        </div>

        {setMachines.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma compressora vinculada a este jogo ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-3 font-medium">Fabricante</th>
                  <th className="py-1.5 pr-3 font-medium">Modelo</th>
                  <th className="py-1.5 pr-3 font-medium">Nº de série</th>
                  <th className="py-1.5 pr-3 font-medium">Ano</th>
                  <th className="py-1.5 pr-3 font-medium">Qtd. estações</th>
                  {canEdit && <th className="py-1.5 w-10" />}
                </tr>
              </thead>
              <tbody>
                {setMachines.map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{m.fabricante ?? m.name ?? '—'}</td>
                    <td className="py-1.5 pr-3">{m.modelo ?? '—'}</td>
                    <td className="py-1.5 pr-3">{m.numeroSerie ?? '—'}</td>
                    <td className="py-1.5 pr-3">{m.anoFabricacao ?? '—'}</td>
                    <td className="py-1.5 pr-3">{m.qtdEstacao ?? '—'}</td>
                    {canEdit && (
                      <td className="py-1.5">
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => unlinkMachine.mutate(m.id)}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit && naoVinculadas.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs">Vincular compressora</Label>
            <div className="flex flex-wrap gap-2">
              {naoVinculadas.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => linkMachine.mutate(m.id)}
                  disabled={linkMachine.isPending}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-foreground transition-colors disabled:opacity-50"
                >
                  + {m.fabricante ?? m.name}{m.modelo ? ` ${m.modelo}` : ''}{m.numeroSerie ? ` · ${m.numeroSerie}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {canEdit && machines.length === 0 && (
          <p className="text-xs text-muted-foreground border-t pt-3">
            Nenhuma compressora cadastrada nesta empresa — cadastre em Máquinas para poder vincular.
          </p>
        )}
      </section>

      {/* ── Informações do ferramental (Punções, Matrizes, Segmentos) ── */}
      <section className="border rounded-xl p-4 bg-background">
        <ToolingSection setId={set.id} canEdit={canEdit} />
      </section>
    </div>
  )
}
