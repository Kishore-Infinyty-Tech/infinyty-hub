// Creates the "portal" schema and seeds demo data. Safe to re-run: it drops and rebuilds the schema.
import pg from "pg";
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL });
await db.connect();

// free, key-less, on-topic photos: loremflickr picks a Flickr image by keyword; lock keeps it stable per post
// same format as lib/auth.ts: "salt:hash" (scrypt)
const hash = (pw) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`; };
// Everyone who can sign in starts with the same dummy password (DUMMY_PASSWORD, default Infinyty@2026). Change it on the Profile page.
// Directory-only people cannot sign in.
const tempPassword = () => `Hub-${randomBytes(9).toString("base64url")}`;
const DUMMY_PASSWORD = process.env.DUMMY_PASSWORD ?? env.DUMMY_PASSWORD ?? "Infinyty@2026";

const img = (tags, lock) => `https://loremflickr.com/1200/700/${tags}?lock=${lock}`;

await db.query(`
drop schema if exists portal cascade;
create schema portal;

-- Dev A reads/writes: apps, app_permissions, access_requests, post_reactions, post_comments, notifications (read).
-- Dev B writes:       posts (new items), achievements, notifications. Both read everything.
create table portal.users (
  id serial primary key, name text not null, email text unique not null,
  role text not null check (role in ('employee','manager','hr_admin','founder')),
  title text, department text, manager_id int references portal.users(id),
  phone text, password_hash text, last_login_at timestamptz,
  avatar_url text, cover_url text
);
create table portal.apps (
  id text primary key, name text not null, tagline text, category text not null,
  icon text not null, hue text not null, sort int not null,
  kind text not null check (kind in ('live','demo')), url text, featured boolean default false
);
create table portal.app_permissions (app_id text references portal.apps(id), role text not null, primary key (app_id, role));
create table portal.access_requests (
  id serial primary key, app_id text references portal.apps(id), user_id int references portal.users(id),
  reason text, status text not null default 'pending', created_at timestamptz default now()
);
create table portal.posts (
  id serial primary key, title text, body text not null,
  category text not null check (category in ('client_win','office_update','award','announcement','update')),
  image_url text, author_name text, source text not null default 'whatsapp',
  status text not null default 'published' check (status in ('pending','published','rejected')),
  pinned boolean default false, tagged_user_ids int[] default '{}', send_to_performance boolean default false,
  published_at timestamptz default now(), created_at timestamptz default now(),
  author_id int references portal.users(id) on delete set null, images text[] not null default '{}', updated_at timestamptz,
  reviewed_by int references portal.users(id) on delete set null, reviewed_at timestamptz, review_note text
);
create table portal.post_reactions (
  post_id int references portal.posts(id) on delete cascade, user_id int references portal.users(id),
  kind text not null default 'like', primary key (post_id, user_id)
);
create table portal.post_comments (
  id serial primary key, post_id int references portal.posts(id) on delete cascade,
  user_id int references portal.users(id), body text not null, created_at timestamptz default now()
);
create table portal.achievements (
  id serial primary key, user_id int references portal.users(id), post_id int references portal.posts(id),
  title text not null, category text not null, impact text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  manager_comment text, achieved_on date default current_date, created_at timestamptz default now()
);
create table portal.notifications (
  id serial primary key, user_id int references portal.users(id), title text not null, body text,
  href text, read boolean default false, created_at timestamptz default now()
);
`);

// ---- people ----
// login: "real" = a real teammate with a temporary password, "dummy" = demo employee, null = directory entry only (cannot sign in)
const users = [
  // name, email, role, title, dept, manager email, login
  ["Aditi Vad", "aditi@infinityanalyticsconsulting.com", "founder", "Founder", "Leadership", null, "real"],
  ["Aayush Mahendru", "aayush@infinityanalyticsconsulting.com", "founder", "Founder", "Leadership", null, "real"],
  ["Kishore Reddy R", "kishore@infinityanalyticsconsulting.com", "hr_admin", "HR Admin", "Human Resources", "aditi@infinityanalyticsconsulting.com", "real"],
  ["Dhanush", "dhanush@infinityanalyticsconsulting.com", "manager", "Manager", "Operations", "aayush@infinityanalyticsconsulting.com", "real"],
  ["Rhea Kapoor", "rhea@infinity.demo", "manager", "Engineering Manager", "Technology", "aditi@infinityanalyticsconsulting.com", null],
  ["Alex Johnson", "alex@infinity.demo", "employee", "Senior Account Executive", "Sales & Delivery", "dhanush@infinityanalyticsconsulting.com", "dummy"],
  ["Neha Iyer", "neha@infinity.demo", "employee", "Business Development Lead", "Sales & Delivery", "dhanush@infinityanalyticsconsulting.com", "dummy"],
  ["Sana Qureshi", "sana@infinity.demo", "employee", "Regional Operations Lead", "Operations", "dhanush@infinityanalyticsconsulting.com", "dummy"],
  ["Meera Pillai", "meera@infinity.demo", "employee", "Talent Partner", "Human Resources", "dhanush@infinityanalyticsconsulting.com", "dummy"],
  ["Vikram Rao", "vikram@infinity.demo", "employee", "Solutions Architect", "Technology", "rhea@infinity.demo", "dummy"],
  ["Arjun Nair", "arjun@infinity.demo", "employee", "Data Engineer", "Technology", "rhea@infinity.demo", "dummy"],
];
const uid = {};
const issued = [];
for (const [name, email, role, title, dept, , login] of users) {
  const pw = login ? DUMMY_PASSWORD : null; // everyone who can sign in starts with the same dummy password
  const r = await db.query("insert into portal.users(name,email,role,title,department,password_hash) values($1,$2,$3,$4,$5,$6) returning id", [name, email, role, title, dept, pw ? hash(pw) : null]);
  uid[email.split("@")[0]] = r.rows[0].id;
  if (login === "real") issued.push([name, email, role, pw]);
}
for (const [, email, , , , mgr] of users) if (mgr) await db.query("update portal.users set manager_id=$1 where id=$2", [uid[mgr.split("@")[0]], uid[email.split("@")[0]]]);

// ---- app catalogue: the five named ones first, then the rest ----
const ALL = ["employee", "manager", "hr_admin"];
const apps = [
  // id, name, tagline, category, icon, hue, kind, url, roles
  ["performance", "Performance Tracker", "Goals, reviews and verified milestones", "People", "Gauge", "violet", "demo", null, ALL],
  ["leave", "Leave Management", "Apply, approve and track time off", "People", "CalendarCheck", "emerald", "demo", null, ALL],
  ["invoices", "Invoice Management", "Raise, send and reconcile client invoices", "Finance", "ReceiptText", "amber", "demo", null, ["manager", "hr_admin"]],
  ["payables", "Payables Management", "Vendor bills, approvals and payouts", "Finance", "WalletCards", "rose", "demo", null, ["hr_admin"]],
  ["crm", "Infinyty CRM", "Leads, follow-ups, prototypes and wins", "Sales", "Handshake", "blue", "live", "CRM", ALL],
  ["attendance", "Attendance", "Check-ins, shifts and regularisation", "People", "Fingerprint", "teal", "demo", null, ALL],
  ["payroll", "Payroll", "Payslips, tax declarations and CTC", "Finance", "Banknote", "green", "demo", null, ["hr_admin"]],
  ["expenses", "Expense Claims", "Submit receipts and track reimbursements", "Finance", "Coins", "orange", "demo", null, ALL],
  ["recruitment", "Recruitment", "Openings, candidates and interview loops", "People", "UserSearch", "indigo", "demo", null, ["manager", "hr_admin"]],
  ["helpdesk", "IT Helpdesk", "Raise tickets for devices, access and software", "Workplace", "LifeBuoy", "cyan", "demo", null, ALL],
  ["assets", "Asset Management", "Laptops, licences and hardware lifecycle", "Workplace", "Laptop", "slate", "demo", null, ["hr_admin"]],
  ["rooms", "Meeting Rooms", "Book rooms and desks across offices", "Workplace", "DoorOpen", "pink", "demo", null, ALL],
  ["travel", "Travel Desk", "Flights, hotels and travel approvals", "Workplace", "Plane", "sky", "demo", null, ["manager", "hr_admin"]],
  ["learning", "Learning Hub", "Courses, certifications and skill paths", "People", "GraduationCap", "fuchsia", "demo", null, ALL],
  ["analytics", "Business Analytics", "Company dashboards and KPI reports", "Insights", "ChartNoAxesCombined", "lime", "demo", null, ["manager", "hr_admin"]],
  ["policies", "Policy Library", "Handbooks, SOPs and compliance documents", "Workplace", "BookOpenCheck", "stone", "demo", null, ALL],
];
let sort = 0;
for (const [id, name, tagline, category, icon, hue, kind, url, roles] of apps) {
  await db.query("insert into portal.apps values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [id, name, tagline, category, icon, hue, sort, kind, url, sort < 5]);
  sort++;
  // the Founder sees and opens every app
  for (const r of [...new Set([...roles, "founder"])]) await db.query("insert into portal.app_permissions values($1,$2)", [id, r]);
}

// ---- seed news (as if HR already approved them) ----
const posts = [
  ["Welcome to the new Infinyty Hub", "One home for company news, celebrations and every tool you use. Browse the feed, open an app from the launcher, and tell us what you want to see next. Apps you do not have yet are still visible, so you can request access in one click.", "announcement", "/api/media/posts/seed/01-welcome.webp", "Aditi Vad", true, [], 0, 2],
  ["Alex Johnson closes the $500k Acme Corp deal", "Huge congratulations to Alex for closing our biggest annual contract of the quarter with Acme Corp. Six months of discovery, two prototypes and one very patient procurement team later, we are now their analytics partner for the next three years.", "client_win", "/api/media/posts/seed/02-acme-deal.webp", "Aayush Mahendru", false, [uid.alex, uid.neha], 1, 4],
  ["Our Hyderabad office is open", "The new 12,000 sq ft Hyderabad office opened its doors this week with 80 seats, a client demo lounge and a collaboration floor. Thank you Sana and the operations crew who made a 6-week fit-out happen in 5.", "office_update", "/api/media/posts/seed/03-hyderabad-office.webp", "Sana Qureshi", false, [uid.sana], 3, 0],
  ["Infinyty honoured at the State Digital Excellence Awards", "We were felicitated by the state IT department for our work on citizen-facing analytics. The award recognises the team led by Vikram Rao, who architected the platform now used by 14 districts.", "award", "/api/media/posts/seed/04-state-award.webp", "Aditi Vad", false, [uid.vikram, uid.arjun], 5, 3],
  ["Kishore ships the prototype loop in record time", "Our CRM prototype-and-feedback loop went from an idea to production in nine days. Sales now logs client feedback against every prototype round, so nothing gets lost between demo and decision.", "client_win", "/api/media/posts/seed/05-prototype-loop.webp", "Rhea Kapoor", false, [uid.kishore], 8, 1],
  ["Q3 town hall: Friday 4 PM", "Join the quarterly town hall in the main hall or online. Agenda: Q3 results, the Hyderabad launch, the promotion cycle and an open Q&A with leadership. Lunch will be served after.", "announcement", "/api/media/posts/seed/06-town-hall.webp", "Aditi Vad", false, [], 10, 0],
];
const pid = [];
for (const [title, body, cat, seed, author, pinned, tagged, d, h] of posts) {
  const r = await db.query(
    `insert into portal.posts(title,body,category,image_url,author_name,pinned,tagged_user_ids,send_to_performance,published_at)
     values($1,$2,$3,$4,$5,$6,$7,$8, now() - make_interval(days => $9::int, hours => $10::int)) returning id`,
    [title, body, cat, seed, author, pinned, tagged, tagged.length > 0 && cat !== "office_update", d, h]);
  pid.push(r.rows[0].id);
}
// every post keeps its photos in `images` (image_url stays as the first one for older code), and its author as a real person
await db.query("update portal.posts set images = case when image_url is null then '{}'::text[] else array[image_url] end");
await db.query("update portal.posts p set author_id = u.id from portal.users u where u.name = p.author_name");
// two posts written by members themselves, with several photos each
const member = [
  [uid.neha, "Neha Iyer", "update", "What a day at the Acme kickoff! The whole team showed up, the demo landed, and the client was smiling by the end. Proud of everyone who made this happen.", ["02-acme-deal", "01-welcome", "05-prototype-loop"], 2, 5],
  [uid.alex, "Alex Johnson", "update", "Hyderabad office tour with the sales team. The demo lounge is going to be perfect for client meetings.", ["03-hyderabad-office", "06-town-hall"], 4, 2],
];
for (const [aid, aname, cat, text, files, d, h] of member) {
  const imgs = files.map((f) => `/api/media/posts/seed/${f}.webp`);
  const r = await db.query(
    `insert into portal.posts(title, body, category, image_url, images, author_id, author_name, source, published_at)
     values(null, $1, $2, $3, $4, $5, $6, 'member', now() - make_interval(days => $7::int, hours => $8::int)) returning id`,
    [text, cat, imgs[0], imgs, aid, aname, d, h]);
  pid.push(r.rows[0].id);
}

const everyone = Object.values(uid);
const kinds = ["like", "celebrate", "love"];
for (let i = 0; i < pid.length; i++)
  for (let j = 0; j < everyone.length; j++)
    if ((i + j) % 3 !== 0) await db.query("insert into portal.post_reactions values($1,$2,$3)", [pid[i], everyone[j], kinds[(i + j) % 3]]);
const comments = [
  [1, uid.vikram, "Brilliant work Alex. The discovery phase on this one was textbook."],
  [1, uid.aditi, "Congratulations to the whole account team!"],
  [2, uid.arjun, "The demo lounge looks incredible. When can we visit?"],
  [3, uid.rhea, "Proud of this team. Richly deserved."],
];
for (const [i, u, body] of comments) await db.query("insert into portal.post_comments(post_id,user_id,body,created_at) values($1,$2,$3, now() - interval '1 hour' * $4)", [pid[i], u, body, i * 3 + 1]);

// ---- performance milestones (verified, plus two waiting on the manager) ----
const ach = [
  [uid.alex, pid[1], "Closed $500k Acme Corp annual contract", "Client Win", "Largest single deal of the quarter; 3-year analytics partnership.", "approved", "Outstanding. Clear KPI credit.", 21],
  [uid.alex, null, "Onboarded 4 mid-market accounts in Q2", "Client Win", "Combined ARR of $180k with zero churn.", "approved", "Consistent delivery.", 120],
  [uid.alex, null, "Mentored two new account executives", "Leadership", "Both reached quota within their first quarter.", "approved", null, 200],
  [uid.vikram, pid[3], "Architected citizen analytics platform (14 districts)", "Award", "Recognised at the State Digital Excellence Awards.", "pending", null, 5],
  [uid.kishore, pid[4], "Delivered the CRM prototype-and-feedback loop", "Delivery", "Idea to production in 9 days; used by the full sales team.", "approved", "Great ownership.", 8],
  [uid.neha, pid[1], "Co-led discovery and demos for Acme Corp", "Client Win", "Ran two prototype rounds that won the deal.", "pending", null, 1],
];
for (const [u, p, title, cat, impact, st, mc, d] of ach)
  await db.query(`insert into portal.achievements(user_id,post_id,title,category,impact,status,manager_comment,achieved_on) values($1,$2,$3,$4,$5,$6,$7, current_date - $8::int)`, [u, p, title, cat, impact, st, mc, d]);

await db.query("insert into portal.notifications(user_id,title,body,href) values($1,$2,$3,$4),($5,$6,$7,$8)", [
  uid.dhanush, "Achievement awaiting your approval", "HR tagged Neha Iyer for the Acme Corp deal.", "/approvals",
  uid.alex, "You were tagged in a post", "Congratulations! You are a major contributor on the Acme Corp win.", "/",
]);

console.log("\nTEMPORARY PASSWORDS (shown once, change them on the Profile page):");
for (const [n, e, r] of issued) console.log(`  ${r.padEnd(9)} ${n.padEnd(16)} ${e}`);
console.log(`  dummy employees (alex, neha, sana, meera, vikram, arjun @infinity.demo): ${DUMMY_PASSWORD}\n`);
console.log("portal schema ready:", (await db.query("select (select count(*) from portal.users) u,(select count(*) from portal.apps) a,(select count(*) from portal.posts) p")).rows[0]);
await db.end();
