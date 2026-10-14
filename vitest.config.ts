/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Reuse Astro's Vite setup so tests resolve modules exactly like the site build does.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
