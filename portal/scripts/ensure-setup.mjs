// Run by start.bat before the portal starts. Safe to run every time:
//  1. makes sure .env.local exists and has a database address and a login-cookie secret
//  2. creates the portal tables and demo data ONLY if they are not there yet (it never wipes an existing database)
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = (p) => fileURLToPath(new URL(p, import.meta.url));
const envFile = dir("../.env.local");
const example = dir("../.env.example");

if (!existsSync(envFile)) {
  if (!existsSync(example)) { console.error("Missing portal\\.env.example"); process.exit(1); }
  copyFileSync(example, envFile);
  console.log("Created portal\\.env.local");
}

const read = () => Object.fromEntries(
  readFileSync(envFile, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
function set(key, value) {
  const lines = readFileSync(envFile, "utf8").split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`; else lines.push(`${key}=${value}`);
  writeFileSync(envFile, lines.join("\n"));
}

let env = read();

if (!env.DATABASE_URL) {
  console.log("\nThe portal needs a PostgreSQL database.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Paste the connection string (it starts with postgresql://): ")).trim();
  rl.close();
  if (!answer.startsWith("postgres")) { console.error("That does not look like a PostgreSQL connection string."); process.exit(1); }
  set("DATABASE_URL", answer);
  env = read();
}
if (!env.AUTH_SECRET) { set("AUTH_SECRET", randomBytes(32).toString("hex")); env = read(); }
if (!env.NEXT_PUBLIC_CRM_URL) { set("NEXT_PUBLIC_CRM_URL", "http://localhost:3200"); env = read(); }
if (!env.DEMO_MODE) { set("DEMO_MODE", "0"); env = read(); }

const db = new pg.Client({ connectionString: env.DATABASE_URL });
try {
  await db.connect();
} catch (e) {
  console.error(`\nCould not reach the database: ${e.message}\nCheck DATABASE_URL in portal\\.env.local and your internet connection.`);
  process.exit(1);
}
const { rows } = await db.query("select to_regclass('portal.users') is not null as ready");
await db.end();

if (rows[0].ready) {
  console.log("Database is ready.");
} else {
  console.log("\nFirst run: creating the portal tables and demo data...");
  const run = (script) => spawnSync(process.execPath, [dir(`./${script}`)], { stdio: "inherit", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  if (run("setup-db.mjs").status !== 0) { console.error("Database setup failed."); process.exit(1); }
  if (env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET) {
    console.log("Uploading the demo news photos to your photo storage...");
    run("upload-seed-images.mjs");
  } else {
    console.log("Photo storage (B2_* in portal\\.env.local) is not set, so photo uploads and the demo news photos are off for now.");
  }
  console.log("\nSign in with aditi@infinityanalyticsconsulting.com and the password Infinyty@2026 (every demo account uses that password).");
}
