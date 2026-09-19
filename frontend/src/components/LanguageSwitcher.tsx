import { useEffect, useRef, useState } from 'react'
import { useI18nStore } from '@/i18n/i18nStore'
import { cn } from '@/components/ui'
import { Check, ChevronDown, Globe2, Languages } from 'lucide-react'

type Props = {
  /** 'light' for light surfaces, 'dark' for the dark landing hero/footer and dark sidebars */
  surface?: 'light' | 'dark'
  className?: string
}

const LANGS = [
  { code: 'en' as const, labelKey: 'language.english' as const },
  { code: 'de' as const, labelKey: 'language.german' as const },
]

/**
 * Language dropdown (English / Deutsch). Switching updates the store instantly
 * (no reload), writes the guest cookie, and persists the preference for the
 * signed-in user in the background.
 */
export default function LanguageSwitcher({ surface = 'light', className }: Props) {
  const lang = useI18nStore((s) => s.lang)
  const setLang = useI18nStore((s) => s.setLang)
  const t = useI18nStore((s) => s.t)
  const label = t(lang === 'en' ? 'language.english' : 'language.german')
  const titleText = t('language.switch')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const triggerBase =
    surface === 'dark'
      ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={titleText}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition whitespace-nowrap',
          triggerBase
        )}
      >
        {surface === 'dark' ? (
          <Globe2 size={14} className="opacity-80" />
        ) : (
          <Languages size={14} className="opacity-80" />
        )}
        <span>{label}</span>
        <ChevronDown size={13} className={cn('opacity-70 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 z-[90] mt-1.5 w-44 overflow-hidden rounded-xl border shadow-xl',
            surface === 'dark'
              ? 'border-white/10 bg-slate-900 text-slate-200'
              : 'border-slate-200 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
          )}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={lang === l.code}
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold transition',
                lang === l.code
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <span>{t(l.labelKey)}</span>
              {lang === l.code && <Check size={15} className="text-emerald-600 dark:text-emerald-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
