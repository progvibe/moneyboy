# Repository Guidelines

## Project Structure & Module Organization
- App router lives in `app/` (`layout.tsx`, `page.tsx`, `globals.css`). Feature UI is composed from `components/`; shared hooks go in `hooks/`; helpers in `lib/`. Database code lives in `db/` (`schema.ts`, `client.ts`) with migrations under `drizzle/`. Static assets are in `public/`; theme tokens and utility styles in `styles/` and `app/globals.css`. Add new routes under `app/<route>/page.tsx`; colocate route-specific components if they are not reused elsewhere.

## Build, Test, and Development Commands
- Install: `pnpm install`. Run locally: `pnpm dev` (Next dev server). Lint: `pnpm lint` (ESLint). Build: `pnpm build`; run prod: `pnpm start`.
- Drizzle/DB: `pnpm db:generate` (generate migrations), `pnpm db:migrate` or `pnpm db:push` (apply), `pnpm db:studio` (inspect). Seed: `pnpm seed:dev` (runs `scripts/seed-dev.ts`).

## Coding Style & Naming Conventions
- TypeScript + React components; prefer server components unless you need client-only APIs, then add `"use client"` at the top. Indent with 2 spaces; group imports (external → `@/` aliases → relative). Name components in `PascalCase`, hooks in `camelCase` with `use` prefix, and utility files in `kebab-case`. Use Tailwind utility classes; keep styles consistent with the Tokyo Night palette. Run `pnpm lint` before pushing.

## Testing Guidelines
- No test harness is set up yet; add coverage with Vitest + React Testing Library under `__tests__/` or alongside components as `ComponentName.test.tsx`. Favor component-level tests and minimal fixtures. Until tests exist, gate changes with `pnpm lint`.

## Database & API Notes
- ENV: set `DATABASE_URL` (PlanetScale Postgres, sslmode=require). `.env.example` is provided.
- Drizzle schema lives in `db/schema.ts`; client in `db/client.ts` (postgres.js + drizzle).
- Smoke test: `GET /api/db-test` selects from `documents` to confirm connectivity.
- Search API: `POST /api/search` filters by date range and tickers against `documents` and returns a mock summary. Results are capped at 20; sentiment is placeholder.
- Seed: run `pnpm seed:dev` to insert example documents and chunks for UI demos.

## Commit & Pull Request Guidelines
- Use concise, imperative commits (`Add search API`, `Seed demo documents`). For PRs, include a summary, screenshots/recordings for UI changes, and manual verification steps (browsers, responsive sizes). Link issues when applicable; call out risk areas (DB access, client/server boundaries). Ensure lint passes; once tests exist, note the test command/result.
