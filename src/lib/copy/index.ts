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
 * Optional `vars` replace `{{key}}` placeholders in the resolved string.
 */
export function t(key: string, locale: Locale = defaultLocale, vars?: Record<string, string>): string {
  let result = resolve(locales[locale] as Dict, key.split('.'))
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${name}}}`, value)
    }
  }
  return result
}
