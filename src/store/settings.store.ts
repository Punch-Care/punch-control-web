import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'pt-BR' | 'en' | 'es'
export type FontSize = 'normal' | 'large' | 'xlarge'

interface SettingsState {
  locale: Locale
  highContrast: boolean
  fontSize: FontSize
  libras: boolean
  setLocale: (l: Locale) => void
  toggleContrast: () => void
  setFontSize: (f: FontSize) => void
  toggleLibras: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      highContrast: false,
      fontSize: 'normal',
      libras: false,
      setLocale: (locale) => set({ locale }),
      toggleContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleLibras: () => set((s) => ({ libras: !s.libras })),
    }),
    { name: 'punch-settings' },
  ),
)
