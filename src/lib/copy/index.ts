import { ru } from './ru'

/**
 * Locale registry. `ru` is the default and only required bundle at launch
 * (FR-029); adding a locale is adding a sibling module + a line here.
 */
export const locales = { ru } as const
export type Locale = keyof typeof locales

export const defaultLocale: Locale = 'ru'

type Dict = Record<string, unknown>

function resolve(dict: Dict, path: string[]): string {
  let node: unknown = dict
  for (const segment of path) {
    if (typeof node !== 'object' || node === null || !(segment in node)) {
      return path.join('.')
    }
    node = (node as Dict)[segment]
  }
  return typeof node === 'string' ? node : path.join('.')
}

/**
 * `t('enquiry.submit')` — dotted-path lookup into the active locale bundle.
 * Falls back to the key itself (visibly wrong, never a crash) if a key is
 * missing, so a typo surfaces in the UI during development rather than
 * throwing in production.
 */
export function t(key: string, locale: Locale = defaultLocale): string {
  return resolve(locales[locale] as Dict, key.split('.'))
}
