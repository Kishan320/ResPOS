export type Lang = 'en' | 'de'

export const SUPPORTED_LANGS: readonly Lang[] = ['en', 'de'] as const

/** localStorage key for the guest (non-authenticated) language preference. */
export const LANG_STORAGE_KEY = 'dineflow_lang'

/**
 * Dictionaries use flat dotted keys ('nav.dashboard') so the English file is a
 * single source of truth and German is checked for exact key parity at compile time.
 */
export type Dictionary = Record<string, string>

/** Any valid dotted translation key present in the English dictionary. */
export type TranslationKey = keyof typeof import('./en').default | (string & {})

export type TranslationParams = Record<string, string | number>

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'de'
}
