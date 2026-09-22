import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const args = [
  "node_modules/supabase/dist/supabase.js",
  "gen",
  "types",
  "typescript",
  "--local",
  "--schema",
  "public",
];
const result = spawnSync(process.execPath, args, {
  encoding: "utf8",
  timeout: 120000,
  windowsHide: true,
});
if (
  result.error ||
  result.status !== 0 ||
  !result.stdout.includes("export type Database")
) {
  console.error(result.error ?? result.stderr + result.stdout);
  process.exit(1);
}
mkdirSync("src/types", { recursive: true });
writeFileSync("src/types/database.ts", result.stdout);
