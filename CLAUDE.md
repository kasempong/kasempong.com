# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`kasempong.com` is a personal portfolio site for Kasempong, a Thai dentist and hobby coder. It is a **plain static site** — no framework, no build step, no bundler for the main pages. It is deployed on **Cloudflare Pages** with a thin Workers Functions layer for server-side API proxying.

## Development Commands

```bash
# Local dev (requires wrangler installed globally or via npx)
npx wrangler pages dev . --compatibility-date=2026-04-25

# Deploy to Cloudflare Pages (pushes the current directory as static assets + functions)
npx wrangler pages deploy .
```

There are no lint or test commands — the project has no package scripts (package.json is `{}`). Wrangler is the only dev tooling.

## Architecture

### Page Flow (entry gate)

All traffic first lands on **`welcome.html`** (the animated intro screen). `redirect.js` is loaded synchronously in `<head>` of `index.html` — it checks `sessionStorage` for `_entered` and redirects to `/welcome.html` if absent. `welcome.js` sets `sessionStorage._entered = '1'` before navigating to `/`, so the main page only renders after the user has clicked through the gate.

```
Browser → welcome.html (welcome.js)
                ↓ [user clicks Enter → sessionStorage._entered='1']
         index.html (redirect.js checks flag, allows render)
```

### Main Page (`index.html` + `script.js`)

`script.js` is a single self-contained file with everything in IIFEs. Key subsystems:

- **Theme** — `data-theme` attribute on `<html>`, persisted to `localStorage`. Spotify embed `src` switches between `theme=0` (dark) and `theme=1` (light).
- **i18n** — Inline `translations` object (EN/TH/ZH), applied via `data-i18n` attributes. TH and ZH show a "work-in-progress" overlay on selection.
- **Typing effect** — Cycles through `translations[lang].roles` with a typewriter loop.
- **Canvas background** — A single `<canvas id="bg-canvas">` renders 55 animated particles (stars, moons, teeth) with mouse repulsion.
- **Floating companions** — Star, Jupiter, Moon, and Kuromi image float with bounded physics, are draggable, and show speech-bubble messages on click.
- **Island panel** — A sliding `<aside>` opened by clicking the 3-D island widget. On first open it fetches Bangkok weather + AQI + news (30-minute localStorage cache, key `ksp_env_cache`).
- **Status bar** — The green "working on…" pill in the hero. Triple-clicking the text opens a password-protected editor. Password is stored as a SHA-256 hash in `localStorage` (key `ksp_pw`); the default hash is of `'vibecheck'`.
- **Birthday gate** — Hidden overlay triggered by long-pressing Kuromi (500 ms) or triple-clicking the footer "Made with ♡". Accepts a date in `ddmmyyyy` format verified against a SHA-256 hash, then navigates to `/birthday.html`.
- **Cursor sparkle / click burst** — A second fixed `<canvas>` (z-index 8888) renders particle trails on mousemove; click anywhere non-interactive emits emoji bursts.

### 3-D Island Widget (`island3d.js` / `island3d.bundle.js`)

`island3d.js` imports **Three.js** (ES module) and renders the floating island into `<canvas id="island-canvas">` inside the island widget button. It is pre-bundled into `island3d.bundle.js` (the file checked into the repo) and loaded as a plain `<script>` — **do not edit `island3d.bundle.js` directly**. Re-bundle after editing `island3d.js`:

```bash
npx esbuild island3d.js --bundle --outfile=island3d.bundle.js --format=iife
```

`three.min.js` is a local copy of Three.js kept for reference but is **not used** at runtime (the bundle is self-contained).

### Cloudflare Functions (`functions/api/`)

Two serverless endpoints, each exported as `onRequest(context)`:

| File | Path | Purpose |
|---|---|---|
| `functions/api/aqi.js` | `/api/aqi` | Proxies IQAir AirVisual API; requires `IQAIR_KEY` env var set in Cloudflare dashboard |
| `functions/api/news.js` | `/api/news` | Calls Claude Haiku via Anthropic API with web_search tool; requires `ANTHROPIC_API_KEY` env var |

The front-end (`script.js`) does **not** call these endpoints directly — it calls Open-Meteo (no key), `api.waqi.info/demo` (AQICN demo token), and `api.rss2json.com` directly from the browser. The Functions are available but currently bypassed by the client-side fetch logic.

### Static Asset Conventions

- **Images** are `.webp` / `.jpeg`, cached `immutable` for 1 year via `_headers`.
- **JS and CSS** are cache-revalidated on every load via ETag (also in `_headers`). When bumping a file that is already cache-revalidated, this is a no-op — but the HTML files use `?v=N` query strings (`script.js?v=1`, `island3d.bundle.js?v=1`) to force a cache bust when needed.
- `_redirects` is intentionally minimal (HTTPS is handled by Cloudflare, not a redirect rule).
- `_headers` enforces a strict CSP. If you add external resources (scripts, fonts, images, connect targets), update the `Content-Security-Policy` line in `_headers` accordingly.
- `.cfignore` prevents `node_modules/`, `.claude/`, `.env*`, and `*.log` from being deployed.

### Birthday / Special Pages

- `birthday.html` + `birthday.css` + `birthday.js` — Private page; only reachable after entering the correct date through the birthday gate.
- `bouquet-3d-test.html` — Development scratch page for 3-D bouquet experiments; not linked from the main site.
- `island.html` — Standalone test page for the island scene; not linked from the main site.

### Font

`fonts/SrirachaRegular.ttf` is a local Thai display font. It is referenced in `birthday.css` and served as a self-hosted asset.
