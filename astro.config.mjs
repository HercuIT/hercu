// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
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
