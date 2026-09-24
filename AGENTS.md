# AGENTS.md — TRANSJAP Horímetro

## Stack
- Vite 8 + React 19 + Tailwind 4 (via `@tailwindcss/vite`)
- Package manager: **Bun** (bun.lock is the source of truth; npm fails on peer dep conflicts)
- In-memory data store (`src/services/store.ts`) — no database needed in dev
- No external API keys or credentials required to run the dev server

## Running in Base44
- `docker compose -f docker-compose.base44.yml up -d` — Bun image, bind-mounted source, `bun run dev`
- Dev server: `vite --port=3000 --host=0.0.0.0` (live reload via Vite HMR)
- Health check: `GET /` on port 3000
- The repo's own `docker-compose.yml` is production-only (builds Dockerfile, runs prebuilt bundle) — do not use it for dev

## Architecture notes
- `src/services/api.ts` is a client-side module calling the in-memory store directly; there is no separate Express server in dev mode
- `packages/shared/` contains Zod schemas, types, QR parser, business rules, and the 77-fleet seed data
- The app has 4 views toggled in `src/App.tsx`: admin panel, operator app, quality test suite, docs
