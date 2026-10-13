// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { defaultLocale, locales } from './src/i18n/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://hercuit.com', // TODO: confirm the production domain (specs/i18n README, decision 2)
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: {
      prefixDefaultLocale: false, // Spanish at "/", English at "/en/"
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Sora',
      cssVariable: '--font-sora',
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [500],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
