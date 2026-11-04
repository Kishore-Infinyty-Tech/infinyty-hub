// Creates (or updates) a person who can sign in.
//   npm run user:add -- --email priya@company.com --name "Priya Sharma" --role manager --password "Temp#12345" \
//                       [--title "Finance Manager"] [--dept Finance] [--manager boss@company.com]   (--manager is required for employees)
// Roles: employee | manager | hr_admin | founder (founder is the top role and sees everything). If the email already exists, name, role and password are updated.
import pg from "pg";
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const need = ["email", "name", "role", "password"].filter((k) => !args[k]);
if (need.length || !["employee", "manager", "hr_admin", "founder"].includes(args.role)) {
  console.error(`Missing or invalid: ${need.join(", ") || "role (employee | manager | hr_admin | founder)"}\nSee the comment at the top of scripts/add-user.mjs`);
  process.exit(1);
}
if (args.role === "employee" && !args.manager) { console.error("Every employee reports to a manager: add --manager manager@company.com"); process.exit(1); }
if (args.password.length < 8) { console.error("Password needs at least 8 characters"); process.exit(1); }

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(args.password, salt, 64).toString("hex")}`;

const db = new pg.Client({ connectionString: env.DATABASE_URL });
await db.connect();
let managerId = null;
if (args.manager) {
  const m = await db.query("select id from portal.users where lower(email) = lower($1)", [args.manager]);
  if (!m.rows[0]) { console.error(`Manager ${args.manager} not found. Add them first.`); process.exit(1); }
  managerId = m.rows[0].id;
}
const r = await db.query(
  `insert into portal.users(name, email, role, title, department, manager_id, password_hash)
   values($1, lower($2), $3, $4, $5, $6, $7)
   on conflict (email) do update set name = excluded.name, role = excluded.role, password_hash = excluded.password_hash,
     title = coalesce(excluded.title, portal.users.title), department = coalesce(excluded.department, portal.users.department),
     manager_id = coalesce(excluded.manager_id, portal.users.manager_id)
   returning id`,
  [args.name, args.email, args.role, args.title ?? null, args.dept ?? null, managerId, hash],
);
console.log(`Saved ${args.name} <${args.email.toLowerCase()}> as ${args.role} (id ${r.rows[0].id}). They can sign in now.`);
await db.end();
