import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

export async function startFixtureDatabase() {
  const port = await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
  const databaseDir = await mkdtemp(join(tmpdir(), "klang-pg-tests-"));
  const database = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "local-test-only",
    port,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
  const connectionString =
    "postgresql://postgres:local-test-only@127.0.0.1:" + port + "/postgres";
  try {
    await database.initialise();
    await database.start();
    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      // Test harness only: model the Supabase auth contract. Business data,
      // migrations, RLS, triggers, functions, locks are real PostgreSQL.
      await client.query(`
        create role anon nologin;
        create role authenticated nologin;
        create role service_role nologin bypassrls;
        create schema auth;
        create schema storage;
        create table auth.users(
          id uuid primary key,
          email text,
          raw_user_meta_data jsonb not null default '{}'::jsonb
        );
        create table storage.buckets(
          id text primary key,
          name text not null,
          public boolean not null default false,
          file_size_limit bigint,
          allowed_mime_types text[]
        );
        create table storage.objects(
          id uuid primary key default gen_random_uuid(),
          bucket_id text not null references storage.buckets(id),
          name text not null,
          owner_id text,
          unique(bucket_id, name)
        );
        alter table storage.objects enable row level security;
        create function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
        $$;
        grant usage on schema auth,public,storage to anon,authenticated,service_role;
        grant all on storage.buckets,storage.objects to service_role;
        grant select,insert,update,delete on storage.objects to authenticated;
        grant execute on function auth.uid() to anon,authenticated,service_role;
        alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
        alter default privileges in schema public grant all on functions to anon,authenticated,service_role;
        create schema extensions;
        create extension pgcrypto with schema extensions;
      `);
      for (const file of (await readdir(resolve("supabase/migrations")))
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        await client.query("begin");
        try {
          await client.query(
            await readFile(resolve("supabase/migrations", file), "utf8"),
          );
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw new Error("Migration failed: " + file, { cause: error });
        }
      }
      await client.query(await readFile(resolve("supabase/seed.sql"), "utf8"));
    } finally {
      await client.end();
    }
    return { connectionString, stop: () => database.stop() };
  } catch (error) {
    await database.stop().catch(() => {});
    throw error;
  }
}
