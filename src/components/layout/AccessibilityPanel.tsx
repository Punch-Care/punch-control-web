import { useEffect, useState } from 'react'
import { Accessibility } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/store/settings.store'
import { useLocale } from '@/hooks/useLocale'

function VLibrasSync({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    const wrapper = document.getElementById('vlibras-wrapper')
    if (wrapper) wrapper.style.display = enabled ? '' : 'none'
  }, [enabled])
  return null
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-primary' : 'bg-muted border border-border'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function AccessibilityPanel({ open, onOpenChange }: Props) {
  const { locale, highContrast, fontSize, libras, setLocale, toggleContrast, setFontSize, toggleLibras } =
    useSettingsStore()
  const { t } = useLocale()
  const a = t.a11y

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            {a.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Language */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {a.language}
            </Label>
            <div className="flex gap-2">
              {(['pt-BR', 'en', 'es'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                    locale === l
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  }`}
                >
                  {l === 'pt-BR' ? 'PT-BR' : l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* High contrast */}
          <div className="flex items-center justify-between gap-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {a.contrast}
            </Label>
            <Toggle checked={highContrast} onToggle={toggleContrast} />
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {a.fontSize}
            </Label>
            <div className="flex gap-2">
              {(['normal', 'large', 'xlarge'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFontSize(f)}
                  className={`flex-1 py-1.5 rounded-md border transition-colors ${
                    fontSize === f
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  } ${f === 'normal' ? 'text-sm' : f === 'large' ? 'text-base' : 'text-lg'}`}
                >
                  {f === 'normal' ? a.fontNormal : f === 'large' ? a.fontLarge : a.fontXLarge}
                </button>
              ))}
            </div>
          </div>

          {/* Libras */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {a.libras}
              </Label>
              <Toggle checked={libras} onToggle={toggleLibras} />
            </div>
            {libras && (
              <p className="text-xs text-muted-foreground">{a.librasNote}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AccessibilityButton() {
  const [open, setOpen] = useState(false)
  const { libras } = useSettingsStore()

  return (
    <>
      <VLibrasSync enabled={libras} />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label="Acessibilidade"
      >
        <Accessibility className="h-4 w-4 mr-2 flex-shrink-0" />
        Acessibilidade
      </Button>
      <AccessibilityPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
