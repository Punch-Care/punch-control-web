import { useSettingsStore } from '@/store/settings.store'
import { getT } from '@/lib/i18n'

export function useLocale() {
  const locale = useSettingsStore((s) => s.locale)
  return { locale, t: getT(locale) }
}
