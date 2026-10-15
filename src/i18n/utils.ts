import { strings } from '../constants/strings';
import { defaultLocale, locales, type Locale } from './config';

export { defaultLocale, locales, type Locale };

/** Locale configuration that is not UI copy. Language names are written in their own language. */
export const localeMeta: Record<Locale, { htmlLang: string; ogLocale: string; short: string; name: string }> = {
  es: { htmlLang: 'es-MX', ogLocale: 'es_MX', short: 'ES', name: 'Español' },
  en: { htmlLang: 'en', ogLocale: 'en_US', short: 'EN', name: 'English' },
};

export function getLocale(current: string | undefined): Locale {
  return (locales as readonly string[]).includes(current ?? '') ? (current as Locale) : defaultLocale;
}

/** Privacy notice route per locale (Spanish default at the root, English under /en/). */
export const privacyPaths: Record<Locale, string> = { es: '/aviso-de-privacidad', en: '/en/privacy-notice' };

/** Usage in any component: `const t = useStrings(Astro.currentLocale);` */
export function useStrings(current: string | undefined) {
  return strings[getLocale(current)];
}
