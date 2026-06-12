# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React app, with pages in `src/pages/`, reusable UI in `src/components/`, shared state in `src/contexts/`, hooks in `src/hooks/`, and API helpers in `src/lib/`.
- `supabase/` holds database migrations in `supabase/migrations/` and Edge Functions in `supabase/functions/`.
- `tests/e2e/` contains Playwright end-to-end tests.
- `public/` and `assets/` store static files and downloadable templates.
- Keep feature-specific SQL, docs, and scripts close to the feature they support. Prefer adding new migrations over editing applied ones.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite development server.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built app locally.
- `npm run lint` runs ESLint across the repository.
- `npm run test:e2e` runs Playwright tests headlessly.
- `npm run test:e2e:headed` runs Playwright with a visible browser.
- `npm run test:e2e:ui` opens the Playwright UI runner.

## Coding Style & Naming Conventions
- Use ES modules, React function components, and hooks.
- Follow the existing 2-space indentation style in JS/JSX files.
- Use `PascalCase` for components and page files, `camelCase` for functions, hooks, and variables, and `*.spec.js` for Playwright tests.
- Keep filenames descriptive and consistent with existing patterns, such as `BookingForm.jsx`, `useAuth.js`, and `20260612150000_system_mail.sql`.
- Run `npm run lint` before committing; keep lint warnings to zero.

## Testing Guidelines
- Add or update Playwright coverage for user-facing flows under `tests/e2e/`.
- Name tests by feature or scenario, not by implementation detail.
- Prefer deterministic assertions over visual-only checks.
- If a change affects auth, payments, bookings, or Supabase functions, verify the flow locally with `npm run test:e2e`.

## Commit & Pull Request Guidelines
- Keep commit messages short, imperative, and specific, matching the existing history style: `Fix Stripe portal auth handling`, `Add POS payment for past unpaid lessons`.
- For pull requests, include a concise summary, the commands you ran, and screenshots or screen recordings for UI changes.
- Link related issues or migration notes when the change touches database schema, payments, or authentication.

## Security & Configuration Tips
- Do not commit secrets, API keys, or environment files.
- Review `supabase/migrations/` and `supabase/functions/` together when changing backend behavior.
- Treat `public/` and `assets/` downloads as user-facing artifacts; keep them versioned and named clearly.
