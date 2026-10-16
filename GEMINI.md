# HércuIT Project Standards

## Core Mandates
- **Quality-First:** Every component and script must prioritize performance, accessibility, and clean code.
- **Centralized String Management:** All UI text must be defined through `src/constants/strings.ts`, in **both** locale dictionaries (`src/constants/strings/es.ts` and `en.ts`). Components read it with `useStrings(Astro.currentLocale)` from `src/i18n/utils.ts`. Direct hardcoding of strings in components is prohibited.
- **Bilingual (Spanish default):** Spanish is served at `/`, English at `/en/`. `en.ts` must satisfy the `Dictionary` type derived from `es.ts`; run `npm run check` to catch missing translations. Spanish copy uses the formal *usted* register.
- **Brand spelling:** the company is **HércuIT**; the assistant is **Hércules** in Spanish and **Hercules** in English.

## Architecture
- **Framework:** Astro 7 (static output), TypeScript strict.
- **Styling:** Tailwind CSS v4; brand colour tokens in `src/styles/global.css` (`@theme`).
- **Assistant backend:** Cloudflare Worker in `worker/` (POST `/api/hercules`), configured in `wrangler.jsonc`.
- **Directory Structure:**
  - `src/components/`: Reusable UI components.
  - `src/client/`: Browser-side TypeScript (Hércules widget, launcher intro, reply formatting, contact-form service preselection in `contact-preselect.ts`). Keep logic in plain, DOM-free modules so it can be unit-tested; components only wire it to the DOM.
  - `src/layouts/`: Page layouts.
  - `src/pages/`: Route-based pages.
  - `src/constants/`: Centralized strings and configuration.
  - `src/styles/`: Global CSS and Tailwind directives.
  - `worker/`: Worker code and its tests (own `tsconfig.json`).
  - `tests/`: Cross-cutting tests (config, theme, markup checks).
  - `e2e/`: Playwright browser tests (`*.spec.ts`, Chromium at desktop and phone sizes) and their helpers (`helpers.ts`, e.g. `gotoReady`).

## Naming Conventions
- **Components:** PascalCase (e.g., `HeroSection.astro`).
- **Constants:** camelCase or UPPER_SNAKE_CASE (e.g., `strings.heroTitle`).
- **Files:** kebab-case for everything except Astro components.

## Quality Consultancy Services Focus
- Ensure technical language reflects HércuIT's expertise in SQA, automated testing, and performance audits.

## Privacy
- Never log visitor data. The assistant keeps no database; leads are sent once by email.
- Any change to what data is collected, where it goes, or which providers process it requires an update to the privacy notice (`privacy` in both dictionaries) and its "last updated" date.

## Testing

After adding or modifying code, add unit tests for all applicable positive, negative and edge scenarios. Each new function, branch and rule gets tests for:

- **Positive (happy path):** the expected, valid behavior.
- **Negative:** invalid input, missing or unknown values, and failure paths. Assert that the code rejects them or falls back as intended.
- **Edge:** empty values, boundaries (first/last, min/max, zero, one, many), unusual characters (accents such as `é`/`ñ`, emoji, very long strings), and every supported locale (`es`, `en`).

Rules:
- Keep tests next to the code they cover or under `tests/`, named `*.test.ts`.
- A bug fix starts with a failing test that reproduces the bug.
- If something is genuinely hard to unit-test (for example pure Astro markup), extract the logic into a plain TypeScript function and test that; note any remaining gap in the PR.
- After every code change, add Playwright regression tests when applicable: whenever the change affects what a visitor sees or does in the page (layout, links and navigation, forms, focus and keyboard, animations, anything at a specific screen width).
  Put them in `e2e/*.spec.ts`. They run in Chromium at desktop (1280 px) and phone (360 px) sizes; set other widths in the test when they matter (e.g. 768 px, where the header nav appears). A bug found in the browser gets a failing Playwright test first. Tests that measure layout (sizes, positions, wrapping) navigate with `gotoReady` from `e2e/helpers.ts`, which waits for the web fonts, so they never measure fallback-font widths. Run them with `npm run test:e2e`.
- Tests, `npm run check`, `npm run build` and `npm run test:e2e` must all pass before a change is considered done.

## Keeping these instructions current

After each code change, check whether `AGENTS.md`, `CLAUDE.md` (a symlink to `AGENTS.md`) and `GEMINI.md` need updates, and if so update them in the same change. For example:
- a new folder, module or architectural pattern;
- a new or changed command, script or CI step;
- a new rule or convention (strings, locales, privacy, testing);
- anything these files describe that no longer matches the code.

Keep `AGENTS.md` and `GEMINI.md` consistent with each other: a rule added to one belongs in the other.
