# HércuIT Website

[![CI](https://github.com/HercuIT/hercu/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/HercuIT/hercu/actions/workflows/ci.yml)

The corporate website of **HércuIT, S. de R.L. de C.V.**, a software house in Torreón, Coahuila,
México: AI, software quality (QA), app development and team training. It's live at
[hercuit.com](https://hercuit.com).

The site is static and bilingual: Spanish (the default) at `/`, English at `/en/`. It also includes
**Hércules**, an AI assistant built with Claude. Hércules answers questions about the services and,
with the visitor's consent, emails their request to the team.

## Technology

| Area | Choice |
|---|---|
| Site | [Astro 7](https://astro.build/), static output, TypeScript strict |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/), brand tokens in `src/styles/global.css` |
| Assistant backend | Cloudflare Worker (`worker/`) with the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) |
| Bot protection | Cloudflare Turnstile |
| Lead delivery | Cloudflare Email Routing (`send_email` binding) |
| Hosting | Cloudflare Workers (static assets + `/api/*` Worker) |
| Tests | [Vitest](https://vitest.dev/) |

## Project structure

```text
/
├── src/
│   ├── client/        # Browser code for Hércules: chat widget (loaded on first click), launcher
│   │                  # intro, safe reply formatting (chat-format.ts / chat-render.ts),
│   │                  # contact-form service preselection (contact-preselect.ts)
│   ├── components/    # Astro components (Hero, Services, Contact, HerculesLauncher, …)
│   ├── constants/     # Shared data and copy: strings/es.ts + en.ts, services, projects
│   ├── i18n/          # Locale helpers (useStrings, paths)
│   ├── layouts/       # Page layout
│   ├── pages/         # Routes: /, /en/, privacy notices (/aviso-de-privacidad, /en/privacy-notice)
│   └── styles/        # Tailwind entry and brand tokens
├── worker/            # Cloudflare Worker: POST /api/hercules (guards, prompt, tool, lead email)
├── tests/             # Cross-cutting tests (config, theme, launcher markup, Node engines)
├── e2e/               # Browser tests (Playwright, Chromium): launcher, monitoring section, layout
├── wrangler.jsonc     # Worker config: assets, vars, email binding, rate limit, secrets
└── AGENTS.md          # Project rules for contributors and AI agents (CLAUDE.md links to it)
```

Specs for each feature live in `specs/`. That folder is git-ignored and kept locally.

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) `^22.12.0`, `^24` or `>=26` (see `engines` in `package.json`)
- npm

### Install and run

```bash
npm install
npm run dev        # http://localhost:4321
```

`npm run dev` serves the static site. To also run the Hércules Worker locally:
1. Copy `.dev.vars.example` to `.dev.vars` and follow its comments. The Anthropic key and the
   Turnstile secret come from the Cloudflare Secrets Store, never from the repo.
2. Run `npx wrangler dev`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built site |
| `npm test` | All unit tests (Vitest) |
| `npm run check` | Type checks: `astro check` for the site, `tsc -p worker` for the Worker |
| `npm run test:e2e` | Builds the site, then runs the browser tests (`e2e/`, Playwright in Chromium, desktop + 360 px phone) |

Before a change is done, `npm test`, `npm run check`, `npm run build` and `npm run test:e2e` must all
pass. CI runs the first three on Node 22 and 24, then the browser tests on Node 24
(`.github/workflows/ci.yml`). The first time, install the browser with `npx playwright install chromium`.
The browser tests always start their own server on port 4322; set `PW_REUSE_SERVER=1` to reuse one
that is already running.

## Hércules (AI assistant)

- **Model:** Claude (`HERCULES_MODEL` in `wrangler.jsonc`). The system prompt in `worker/prompt.ts`
  is built from the site's own service catalogue and projects.
- **Protection:** Turnstile verification (action plus hostname allowlist), a per-IP rate limit, and
  a visitor consent checkbox that is enforced server-side.
- **No database:** the conversation lives only in the visitor's tab (`sessionStorage`). A lead is
  sent once, by email, **from `info@hercuit.com` to `hercuitmx@gmail.com`** (`LEAD_FROM`, `LEAD_TO`).
  The binding is pinned to that single destination, and `tests/wrangler-config.test.ts` keeps the
  two in sync.
- **Logs** carry no visitor data. A failed email logs only its error type, a fixed reason
  category and the message length.
- **Replies** may use bold text and bullet lists. They're rendered safely: elements and text nodes
  only, links reduced to their label.
- **Launcher:** a short "power-on" intro and a teaser bubble draw attention on the first page view.
  The motion ends within 5 s, and it respects reduced-motion settings.

### Cloudflare setup (one time, in the dashboard)
- **Email Routing:** enabled on `hercuit.com`, with `hercuitmx@gmail.com` added and **verified** as
  a destination. Add a routing rule `info@hercuit.com` → `hercuitmx@gmail.com`, so mail sent to the
  public address arrives too.
- **Secrets Store:** `ANTHROPIC_API_KEY` and `TURNSTILE_SECRET`.
- **Turnstile widget:** its hostnames must match `TURNSTILE_HOSTNAMES`.

## Conventions

See [AGENTS.md](AGENTS.md) and [GEMINI.md](GEMINI.md):
- every UI string goes in both `es.ts` and `en.ts`;
- Spanish uses formal *usted*;
- every code change ships with tests covering the happy path, negative cases and edge cases.

## Legal

HércuIT, S. de R.L. de C.V. is a Mexican company. All rights reserved. The privacy notice
(LFPDPPP) is published at [/aviso-de-privacidad](https://hercuit.com/aviso-de-privacidad) and
[/en/privacy-notice](https://hercuit.com/en/privacy-notice).
