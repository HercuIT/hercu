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

## Testing

Every change that adds or modifies code must include unit tests. Cover as many scenarios as practical:

- **Happy path:** the expected, valid behavior.
- **Negative scenarios:** invalid input, missing or unknown values, and failure paths. Assert that the code rejects them or falls back as intended.
- **Edge cases:** empty values, boundaries (first/last, min/max, zero, one, many), unusual characters (accents such as `é`/`ñ`, emoji, very long strings), and every supported locale (`es`, `en`).

Rules:
- Keep tests next to the code they cover or under `tests/`, named `*.test.ts`.
- A bug fix starts with a failing test that reproduces the bug.
- If something is genuinely hard to unit-test (for example pure Astro markup), extract the logic into a plain TypeScript function and test that; note any remaining gap in the PR.
- Tests, `npm run check` and `npm run build` must all pass before a change is considered done.
