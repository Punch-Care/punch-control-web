import { useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/store/settings.store'
import { useLocale } from '@/hooks/useLocale'
import { useState } from 'react'

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => void }
  }
}

function VLibrasLoader({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    const existing = document.getElementById('vlibras-script')
    if (existing) return

    const wrapper = document.createElement('div')
    wrapper.setAttribute('vw', '')
    wrapper.className = 'enabled'
    wrapper.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
    `
    document.body.appendChild(wrapper)

    const script = document.createElement('script')
    script.id = 'vlibras-script'
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
    script.onload = () => {
      if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app')
    }
    document.body.appendChild(script)
  }, [enabled])

  return null
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function AccessibilityPanel({ open, onOpenChange }: Props) {
  const { locale, highContrast, fontSize, libras, setLocale, toggleContrast, setFontSize, toggleLibras } =
    useSettingsStore()
  const { t } = useLocale()
  const a = t.a11y

  return (
    <>
      <VLibrasLoader enabled={libras} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{a.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Language */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.language}</Label>
              <div className="flex gap-2">
                {(['pt-BR', 'en', 'es'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                      locale === l
                        ? 'bg-primary text-primary-foreground border-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-foreground'
                    }`}
                  >
                    {l === 'pt-BR' ? 'PT-BR' : l === 'en' ? 'EN' : 'ES'}
                  </button>
                ))}
              </div>
            </div>

            {/* High contrast */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.contrast}</Label>
              <button
                onClick={toggleContrast}
                className={`relative w-10 h-5 rounded-full transition-colors ${highContrast ? 'bg-primary' : 'bg-muted border border-border'}`}
                aria-checked={highContrast}
                role="switch"
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    highContrast ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.fontSize}</Label>
              <div className="flex gap-2">
                {(['normal', 'large', 'xlarge'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFontSize(f)}
                    className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                      fontSize === f
                        ? 'bg-primary text-primary-foreground border-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-foreground'
                    }`}
                  >
                    {f === 'normal' ? a.fontNormal : f === 'large' ? a.fontLarge : a.fontXLarge}
                  </button>
                ))}
              </div>
            </div>

            {/* Libras */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.libras}</Label>
                <button
                  onClick={toggleLibras}
                  className={`relative w-10 h-5 rounded-full transition-colors ${libras ? 'bg-primary' : 'bg-muted border border-border'}`}
                  aria-checked={libras}
                  role="switch"
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      libras ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {libras && (
                <p className="text-xs text-muted-foreground">{a.librasNote}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AccessibilityButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label="Acessibilidade"
      >
        <Settings className="h-4 w-4 mr-2" />
        <span className="sr-only sm:not-sr-only">Acessibilidade</span>
      </Button>
      <AccessibilityPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
