import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Máscaras / formatação BR ──────────────────────────────────────────────────

export const onlyDigits = (v: string) => (v ?? '').replace(/\D/g, '')

/** 00.000.000/0000-00 */
export function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`
  return d
}

/** (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length > 0) return `(${d}`
  return ''
}

/** 00000-000 */
export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d
}

/** Inscrição estadual — campo livre, apenas dígitos (estrutura varia por UF) */
export function maskInscricaoEstadual(v: string) {
  return onlyDigits(v).slice(0, 14)
}

/** Unidades federativas (siglas) — padrão de cadastro de estado */
export const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/** KN → toneladas-força (tf): 1 kN ≈ 0,10197 tf */
export function knToTf(kn: number | null | undefined): number | null {
  if (kn === null || kn === undefined || Number.isNaN(kn)) return null
  return Math.round(kn * 0.10197 * 100) / 100
}
