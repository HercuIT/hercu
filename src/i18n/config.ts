// Single source of truth for supported locales. Imported by astro.config.mjs (routing) and by
// src/i18n/utils.ts (switcher, metadata, dictionaries), so keep this module dependency-free.
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';
