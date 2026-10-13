# Hércuit Project Standards

## Core Mandates
- **Quality-First:** Every component and script must prioritize performance, accessibility, and clean code.
- **Centralized String Management:** All UI text must be defined through `src/constants/strings.ts`, in **both** locale dictionaries (`src/constants/strings/es.ts` and `en.ts`). Components read it with `useStrings(Astro.currentLocale)` from `src/i18n/utils.ts`. Direct hardcoding of strings in components is prohibited.
- **Bilingual (Spanish default):** Spanish is served at `/`, English at `/en/`. `en.ts` must satisfy the `Dictionary` type derived from `es.ts`; run `npm run check` to catch missing translations.

## Architecture
- **Framework:** Astro (Static Site Generator).
- **Styling:** Tailwind CSS.
- **Directory Structure:**
  - `src/components/`: Reusable UI components.
  - `src/layouts/`: Page layouts.
  - `src/pages/`: Route-based pages.
  - `src/constants/`: Centralized strings and configuration.
  - `src/styles/`: Global CSS and Tailwind directives.

## Naming Conventions
- **Components:** PascalCase (e.g., `HeroSection.astro`).
- **Constants:** camelCase or UPPER_SNAKE_CASE (e.g., `strings.heroTitle`).
- **Files:** kebab-case for everything except Astro components.

## Quality Consultancy Services Focus
- Ensure technical language reflects Hércuit's expertise in SQA, automated testing, and performance audits.
