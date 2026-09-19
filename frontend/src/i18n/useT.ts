import { useMemo } from 'react'
import { useI18nStore } from './i18nStore'
import { translate, translateEnum } from './core'
import type { TranslationKey, TranslationParams } from './types'

/**
 * Access translations in components: `const t = useT()` then `t('nav.dashboard')`.
 * Subscribes to `lang` (not the stable `t` reference) so every translated string
 * re-renders immediately when the language changes — no reload required.
 */
export function useT() {
  const lang = useI18nStore((s) => s.lang)
  return useMemo(
    () => (key: TranslationKey, params?: TranslationParams) => translate(lang, key, params),
    [lang]
  )
}

/** Translate known enum values (statuses, roles, types) with a fallback for dynamic values. */
export function useTEnum() {
  const lang = useI18nStore((s) => s.lang)
  return useMemo(
    () => (namespace: string, value: string | null | undefined, fallback: string) =>
      translateEnum(lang, namespace, value, fallback),
    [lang]
  )
}
