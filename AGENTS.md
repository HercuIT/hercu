## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project rules

Full standards: [GEMINI.md](GEMINI.md). The essentials:

- Every UI string goes in **both** `src/constants/strings/es.ts` and `en.ts`; no hardcoded text in components.
- Spanish is the default locale (`/`) and uses formal *usted*; English is at `/en/`.
- Spelling: the company is **HércuIT**; the assistant is **Hércules** (es) / **Hercules** (en).
- Never log visitor data. Changes to collected data, its destination or its processors need a privacy notice update (both locales) and a new "last updated" date.
- Keep logic in plain TypeScript modules (`src/client/`, `worker/`) and only wire it to the DOM in components, so it can be unit-tested.

## Testing

After adding or modifying code, always add unit tests covering all meaningful positive, negative and edge scenarios. Each new function, branch and rule gets tests for applicable behaviors and representative boundaries:

- **Positive (happy path):** the expected, valid behavior.
- **Negative:** invalid input, missing or unknown values, and failure paths. Assert that the code rejects them or falls back as intended.
- **Edge:** empty values, boundaries (first/last, min/max, zero, one, many), unusual characters (accents such as `é`/`ñ`, emoji, very long strings), and every supported locale (`es`, `en`).

Rules:
- Keep tests next to the code they cover or under `tests/`, named `*.test.ts`.
- A bug fix starts with a failing test that reproduces the bug.
- If something is genuinely hard to unit-test (for example pure Astro markup), extract the logic into a plain TypeScript function and test that; note any remaining gap in the PR.
- After every code change, add Playwright regression tests when applicable: whenever the change affects what a visitor sees or does in the page (layout, links and navigation, forms, focus and keyboard, animations, anything at a specific screen width).
  Put them in `e2e/*.spec.ts`. They run in Chromium at desktop (1280 px) and phone (360 px) sizes; set other widths in the test when they matter (e.g. 768 px, where the header nav appears). A bug found in the browser gets a failing Playwright test first. Run them with `npm run test:e2e`.
- Tests, `npm run check`, `npm run build` and `npm run test:e2e` must all pass before a change is considered done.

## Keeping these instructions current

After each code change, check whether `AGENTS.md`, `CLAUDE.md` (a symlink to `AGENTS.md`) and `GEMINI.md` need updates, and if so update them in the same change. For example:
- a new folder, module or architectural pattern;
- a new or changed command, script or CI step;
- a new rule or convention (strings, locales, privacy, testing);
- anything these files describe that no longer matches the code.

Keep `AGENTS.md` and `GEMINI.md` consistent with each other: a rule added to one belongs in the other.
