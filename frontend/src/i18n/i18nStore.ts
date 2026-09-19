import { create } from 'zustand'
import { useAuthStore } from '@/store/authStore'
import { translate, translateEnum } from './core'
import type { Lang, TranslationKey, TranslationParams } from './types'
import { LANG_STORAGE_KEY, isLang } from './types'

/**
 * Guest language persistence uses localStorage (like the existing pos-auth /
 * pos-cart stores). Logged-in users are additionally synced to their backend
 * user profile.
 */
function readStoredLang(): Lang | null {
  try {
    const value = window.localStorage.getItem(LANG_STORAGE_KEY)
    return isLang(value) ? value : null
  } catch {
    return null
  }
}

function writeStoredLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    /* storage unavailable (private mode etc.) - session-only language */
  }
}

function resolveInitialLang(): Lang {
  // Authenticated user's saved preference wins; otherwise the guest's stored choice.
  const user = useAuthStore.getState().user
  if (user && isLang(user.language)) return user.language
  return readStoredLang() ?? 'en'
}

function applyDocumentLang(lang: Lang) {
  document.documentElement.setAttribute('lang', lang)
}

type I18nState = {
  lang: Lang
  t: (key: TranslationKey, params?: TranslationParams) => string
  tEnum: (namespace: string, value: string | null | undefined, fallback: string) => string
  setLang: (lang: Lang) => void
}

export const useI18nStore = create<I18nState>((set, get) => {
  const initial = resolveInitialLang()
  applyDocumentLang(initial)

  return {
    lang: initial,
    t: (key, params) => translate(get().lang, key, params),
    tEnum: (namespace, value, fallback) => translateEnum(get().lang, namespace, value, fallback),
    setLang: (lang) => {
      writeStoredLang(lang)
      applyDocumentLang(lang)
      set({ lang })
      // Persist against the authenticated user when logged in (fire-and-forget).
      const { token } = useAuthStore.getState()
      if (token) {
        import('@/lib/api').then(({ api }) =>
          api.patch('/auth/language', { language: lang }).catch(() => {
            /* preference is best-effort; UI language is already switched */
          })
        )
      }
    },
  }
})

/** Standalone translate for non-component code (error boundary, api helpers). */
export function tStatic(key: TranslationKey, params?: TranslationParams): string {
  return translate(useI18nStore.getState().lang, key, params)
}
