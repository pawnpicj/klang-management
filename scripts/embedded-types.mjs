import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { introspect } from "@supabase/postgrest-typegen/introspection";
import {
  generateTypescript,
  sortGeneratorMetadata,
} from "@supabase/postgrest-typegen/generation";
import { startFixtureDatabase } from "../tests/database/fixture-db.mjs";

const database = await startFixtureDatabase();
const client = new pg.Pool({ connectionString: database.connectionString });
try {
  const metadata = await introspect(client, { includedSchemas: ["public"] });
  const types = await generateTypescript(sortGeneratorMetadata(metadata), {
    detectOneToOneRelationships: true,
  });
  await mkdir("src/types", { recursive: true });
  await writeFile(
    "src/types/database.ts",
    "// Generated from migrated PostgreSQL 17 by Supabase postgrest-typegen. Do not edit.\n" +
      types,
  );
  console.log("Generated src/types/database.ts from all migrations.");
} finally {
  await client.end();
  await database.stop();
}
