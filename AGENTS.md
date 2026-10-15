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

After adding or modifying code, always add unit tests with **all possible coverage**: every positive, negative and edge scenario the code can meet, not just a sample. Each new function, branch and rule gets tests for:

- **Positive (happy path):** the expected, valid behavior.
- **Negative:** invalid input, missing or unknown values, and failure paths. Assert that the code rejects them or falls back as intended.
- **Edge:** empty values, boundaries (first/last, min/max, zero, one, many), unusual characters (accents such as `é`/`ñ`, emoji, very long strings), and every supported locale (`es`, `en`).

Rules:
- Keep tests next to the code they cover or under `tests/`, named `*.test.ts`.
- A bug fix starts with a failing test that reproduces the bug.
- If something is genuinely hard to unit-test (for example pure Astro markup), extract the logic into a plain TypeScript function and test that; note any remaining gap in the PR.
- Tests, `npm run check` and `npm run build` must all pass before a change is considered done.
