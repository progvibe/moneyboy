# Repository Guidelines

## Project Structure & Module Organization
- Next.js app directory lives in `app/` (`layout.tsx`, `page.tsx`, shared `globals.css`). Feature sections are composed from `components/`, which holds reusable UI pieces. Domain helpers and data mocks should go into `lib/`; reusable hooks belong in `hooks/`. Static assets live in `public/`. Tailwind styles and design tokens sit in `styles/` and `app/globals.css`. Keep new pages under `app/<route>/page.tsx` with colocated components when they are route-specific.

## Build, Test, and Development Commands
- Install: `pnpm install`. Run locally: `pnpm dev` (Next dev server). Lint: `pnpm lint` (ESLint over the repo). Production build: `pnpm build`; start the compiled app: `pnpm start`. If adding preview data or seed steps, document them in the route README or inline comments near the data loader.

## Coding Style & Naming Conventions
- TypeScript + React functional components; prefer server components unless you need client-only APIs, then add `"use client"` at the top. Indent with 2 spaces; keep imports sorted (third-party, aliases like `@/`, then relative). Name components in `PascalCase` (`StockWatchlist`), hooks in `camelCase` prefixed with `use` (`usePositions`), and utility modules in `kebab-case` file names. Use Tailwind classes for styling; prefer composable utility classes over ad-hoc CSS. Run `pnpm lint` before pushing; align with the existing ESLint config and Tailwind conventions in `app/globals.css`.

## Testing Guidelines
- No test harness is set up yet; add coverage using a light stack (e.g., Vitest + React Testing Library) under `__tests__/` or alongside components as `ComponentName.test.tsx`. Favor component-level tests for rendering and critical flows (watchlist interactions, dashboards) and snapshot sparingly. Keep fixtures small and colocated with the test. Gate additions with `pnpm lint` until a test runner is wired.

## Commit & Pull Request Guidelines
- Write concise, imperative commit messages (`Add watchlist table`, `Fix dashboard layout`). For PRs, include a short summary, key screenshots or recordings for UI changes, and any manual verification steps (browsers, responsive sizes). Link issues when applicable and call out risk areas (data fetching, client/server boundaries). Ensure the branch is lint-clean; once tests exist, note the test command and result.
