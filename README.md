# KLANG Management

ระบบจัดการคลัง Clan & Gang

Implemented scope: **Phase 1 — Project Foundation**, **Phase 2 — Database and Security**, **Phase 3 — Authentication**, and the first **Phase 4 — Multi-Clan** checkpoint.
Invite/join, member management, custom roles, and Phase 5 or later business flows have not started.

- App: KLANG Management
- Repository/package: `klang-management`
- Supabase local project: `klang-management`
- Stack: Next.js 16.3.5 App Router, React 19, strict TypeScript, Tailwind 4, shadcn-style Button/component configuration, Supabase SSR, Zod, Vitest, Playwright.
- Node.js 24 or later. Exact dependencies are recorded in `package-lock.json`.
- No cloud database, GitHub remote, or deployment has been provisioned.

## Run the app

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. The homepage works without credentials. Registration, login, password reset, session refresh, and the profile page require a configured Supabase project:

```powershell
Copy-Item .env.example .env.local
```

Replace every placeholder in `.env.local`. Use the publishable/legacy anon key in the public variable and the secret/legacy service-role key only in the server variable. Set `AUTH_RATE_LIMIT_SECRET` to a private random value with at least 32 characters.

The browser client uses public configuration. The server and admin modules import `server-only`. `src/proxy.ts` refreshes Supabase SSR cookies and protects `/profile`, `/clans`, `/c/*`, and `/reset-password`. The service-role client is limited to username resolution and the shared login limiter; tenant writes still use the authenticated user's RLS context.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run format:check
```

`npm test` includes unit tests and **real PostgreSQL 17** integration tests. Each run starts an isolated, password-protected PostgreSQL process bound to loopback, applies every migration to a fresh database, runs fixtures, and stops it. This requires permission to launch local executables and an available loopback port, but no Docker or project credentials. Synthetic users and tenant data exist only inside this disposable test database.

The test harness supplies the minimal Supabase `auth.users`, `auth.uid()`, and role contract; it does not run GoTrue, PostgREST, Storage, or a Supabase cloud project. Full Auth email/cookie verification still requires real project credentials.

## Supabase migrations and types

With Docker functioning:

```powershell
npm run db:start
npm run db:reset
npm run db:types
```

`db:reset` is for the local development database; it resets local data. No remote migration is applied by these scripts.

When Docker is unavailable:

```powershell
npm run db:types:embedded
```

This applies the same migrations to an isolated PostgreSQL 17 database and uses Supabase's official `@supabase/postgrest-typegen` engine to introspect and generate `src/types/database.ts`. It does not infer types from handwritten interfaces. The regular `db:types` command uses Supabase CLI and preserves the existing output file when generation fails.

Permissions and default-role templates are migration-owned configuration, so deployment does not depend on a developer seed step. `supabase/seed.sql` deliberately inserts no demo users or application data. The Phase 3 auth trigger provisions a profile from validated signup metadata.

## Database API

- `create_clan(p_name, p_slug, p_type, p_character_name)`: requires an authenticated active profile and atomically creates a clan, five system roles, their permissions, the creator's Leader membership, and Main Warehouse.
- `post_transaction(p_transaction_id)`: verifies current actor, tenant, permission, lifecycle, asset precision, warehouse direction/default/activation, contributor, and aggregated balance; posts atomically and supports retries.
- `warehouse_asset_balances`: security-invoker view derived from POSTED transaction items. Never update a balance.
- The Clan creation Server Action validates the session and Zod input, then calls `create_clan` in the authenticated user's RLS context.

See [the Phase 1–2 schema and security handoff](docs/phase-1-2-handoff.md), [the Phase 3 authentication handoff](docs/phase-3-handoff.md), and [the Phase 4A Multi-Clan handoff](docs/phase-4a-handoff.md).
