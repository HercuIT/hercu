import { strings } from '../constants/strings';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

/** Locale configuration that is not UI copy. Language names are written in their own language. */
export const localeMeta: Record<Locale, { htmlLang: string; ogLocale: string; short: string; name: string }> = {
  es: { htmlLang: 'es-MX', ogLocale: 'es_MX', short: 'ES', name: 'Español' },
  en: { htmlLang: 'en', ogLocale: 'en_US', short: 'EN', name: 'English' },
};

export function getLocale(current: string | undefined): Locale {
  return (locales as readonly string[]).includes(current ?? '') ? (current as Locale) : defaultLocale;
}

/** Usage in any component: `const t = useStrings(Astro.currentLocale);` */
export function useStrings(current: string | undefined) {
  return strings[getLocale(current)];
}
