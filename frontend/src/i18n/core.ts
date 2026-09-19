import type { Dictionary, Lang, TranslationKey } from './types'
import en from './en'
import de from './de'

const DICTIONARIES: Record<Lang, Dictionary> = { en, de }

export function translate(lang: Lang, key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en
  let text = dict[key] ?? DICTIONARIES.en[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

export function translateEnum(
  lang: Lang,
  namespace: string,
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback
  const key = `${namespace}.${value}` as TranslationKey
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en
  return dict[key] ?? DICTIONARIES.en[key] ?? fallback
}
