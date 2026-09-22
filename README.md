# KLANG Management

ระบบจัดการคลัง Clan & Gang

Implemented scope: **Phase 1 — Project Foundation** through **Phase 6 — Transactions**.
Users can create Clan/Gang spaces, maintain members and roles, configure Assets and Warehouses, and post Deposit/Withdraw/Transfer transactions with evidence and Void/Reversal support. Invite/join and offline-member account linking remain deferred by product decision.

- App: KLANG Management
- Repository/package: `klang-management`
- Supabase local project: `klang-management`
- Stack: Next.js 16.3.5 App Router, React 19, strict TypeScript, Tailwind 4, shadcn-style Button/component configuration, Supabase SSR, Zod, Vitest, Playwright.
- Node.js 24 or later. Exact dependencies are recorded in `package-lock.json`.
- The repository is linked to the Supabase project `KlangManagement`; migrations through `20260922000600` are deployed.

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

- `create_clan(p_name, p_slug, p_type, p_character_name)`: requires an authenticated active profile and atomically creates a clan, six system roles, their permissions, the creator's Manager membership, and Main Warehouse.
- `post_transaction(p_transaction_id)`: verifies current actor, tenant, permission, lifecycle, asset precision, warehouse direction/default/activation, contributor, and aggregated balance; posts atomically and supports retries.
- `warehouse_asset_balances`: security-invoker view derived from POSTED transaction items. Never update a balance.
- Custom Role RPCs atomically maintain Role names and permission mappings while protecting system Roles and assigned Roles.
- Phase 5 RPCs create/update/deactivate Assets and Warehouses, switch the default Warehouse atomically, and reject deactivation while a balance remains.
- `create_and_post_transaction(...)` validates permission, direction, precision, balance and idempotency, then posts all lines atomically.
- `void_transaction(...)` creates an auditable reversal record and removes the original transaction from derived balances only when the resulting balances remain valid.
- Transaction evidence is stored in the private `transaction-evidence` bucket and registered in `attachments` after MIME, size, tenant and actor checks.
- The Clan creation Server Action validates the session and Zod input, then calls `create_clan` in the authenticated user's RLS context.

See [the Phase 1–2 schema and security handoff](docs/phase-1-2-handoff.md), [the Phase 3 authentication handoff](docs/phase-3-handoff.md), [the Phase 4A Multi-Clan handoff](docs/phase-4a-handoff.md), [the Phase 5 handoff](docs/phase-5-handoff.md), and [the Phase 6 handoff](docs/phase-6-handoff.md).
