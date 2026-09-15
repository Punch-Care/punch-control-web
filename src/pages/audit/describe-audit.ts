import type { Translations } from '@/lib/i18n'

type Desc = Translations['auditDesc']
type Chave = Exclude<keyof Desc, 'what' | 'technical' | 'failed'>

const ID = '[^/]+'
// Método + caminho da API → frase que o gestor entende. A ordem importa: rotas
// mais específicas primeiro.
const REGRAS: [string, RegExp, Chave][] = [
  ['POST', /^\/auth\/login$/, 'login'],
  ['POST', /^\/auth\/change-password$/, 'changePassword'],
  ['PUT', /^\/companies\/me$/, 'myCompanyUpdated'],
  ['POST', /^\/companies$/, 'companyCreated'],
  ['PUT', new RegExp(`^/companies/${ID}$`), 'companyUpdated'],
  ['PATCH', new RegExp(`^/companies/${ID}/toggle$`), 'companyToggled'],
  ['POST', /^\/users$/, 'userCreated'],
  ['PUT', new RegExp(`^/users/${ID}$`), 'userUpdated'],
  ['PATCH', new RegExp(`^/users/${ID}/active$`), 'userToggled'],
  ['POST', new RegExp(`^/punch-sets/${ID}/cleaning$`), 'setCleaning'],
  ['POST', new RegExp(`^/punch-sets/${ID}/punches$`), 'punchAdded'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/punches/${ID}$`), 'punchRemoved'],
  ['POST', new RegExp(`^/punch-sets/${ID}/products$`), 'linkProduct'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/products/${ID}$`), 'unlinkProduct'],
  ['POST', new RegExp(`^/punch-sets/${ID}/machines$`), 'linkMachine'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/machines/${ID}$`), 'unlinkMachine'],
  ['PUT', new RegExp(`^/punch-sets/${ID}/dimension-records/specs$`), 'specUpdated'],
  ['POST', new RegExp(`^/punch-sets/${ID}/dimension-records$`), 'dimensionCreated'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/dimension-records/${ID}$`), 'dimensionDeleted'],
  ['PUT', new RegExp(`^/punch-sets/${ID}/tooling-components$`), 'toolingUpdated'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/tooling-components/${ID}$`), 'toolingDeleted'],
  ['PUT', new RegExp(`^/punch-sets/${ID}/lifecycle/config$`), 'lifeConfig'],
  ['PUT', new RegExp(`^/punch-sets/${ID}/lifecycle/inventory$`), 'stockUpdated'],
  ['POST', new RegExp(`^/punch-sets/${ID}/lifecycle/production$`), 'productionManual'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/lifecycle/production/${ID}$`), 'productionManualDeleted'],
  ['POST', new RegExp(`^/punch-sets/${ID}/lifecycle/maintenance$`), 'maintenanceCreated'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}/lifecycle/maintenance/${ID}$`), 'maintenanceDeleted'],
  ['POST', new RegExp(`^/punch-sets/${ID}/attachments`), 'attachmentUploaded'],
  ['DELETE', /attachments/, 'attachmentDeleted'],
  ['POST', /^\/punch-sets$/, 'setCreated'],
  ['PUT', new RegExp(`^/punch-sets/${ID}$`), 'setUpdated'],
  ['DELETE', new RegExp(`^/punch-sets/${ID}$`), 'setDeleted'],
  ['POST', new RegExp(`^/production-batches/${ID}/measurements$`), 'measurementCreated'],
  ['PUT', new RegExp(`^/production-batches/${ID}/measurements/${ID}$`), 'measurementUpdated'],
  ['DELETE', new RegExp(`^/production-batches/${ID}/measurements/${ID}$`), 'measurementDeleted'],
  ['POST', /^\/production-batches$/, 'batchCreated'],
  ['PUT', new RegExp(`^/production-batches/${ID}$`), 'batchUpdated'],
  ['DELETE', new RegExp(`^/production-batches/${ID}$`), 'batchDeleted'],
  ['POST', /^\/production-configs$/, 'configCreated'],
  ['PUT', new RegExp(`^/production-configs/${ID}$`), 'configUpdated'],
  ['DELETE', new RegExp(`^/production-configs/${ID}$`), 'configDeleted'],
  ['POST', /^\/occurrences\/machines$/, 'machineCreated'],
  ['PUT', new RegExp(`^/occurrences/machines/${ID}$`), 'machineUpdated'],
  ['PATCH', new RegExp(`^/occurrences/machines/${ID}/toggle$`), 'machineToggled'],
  ['POST', /^\/occurrences\/products$/, 'productCreated'],
  ['PUT', new RegExp(`^/occurrences/products/${ID}$`), 'productUpdated'],
  ['POST', /^\/occurrences$/, 'occurrenceCreated'],
  ['PUT', new RegExp(`^/occurrences/${ID}$`), 'occurrenceUpdated'],
  ['POST', /^\/products$/, 'productCreated'],
  ['PUT', new RegExp(`^/products/${ID}$`), 'productUpdated'],
  ['DELETE', new RegExp(`^/products/${ID}$`), 'productDeleted'],
]

/** Frase legível para uma linha da auditoria; null quando a rota não é conhecida */
export function describeAudit(method: string, path: string, action: string, d: Desc): string | null {
  if (action === 'LOGIN_FAILED') return d.loginFailed
  const limpo = path.split('?')[0].replace(/^\/api/, '')
  const regra = REGRAS.find(([m, re]) => m === method.toUpperCase() && re.test(limpo))
  return regra ? d[regra[2]] : null
}
