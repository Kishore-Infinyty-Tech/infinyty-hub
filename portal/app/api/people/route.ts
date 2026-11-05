import { fail, json, q } from "@/lib/db";
import { currentUser, hashPassword } from "@/lib/auth";
import { ASSIGNABLE, CAN_MANAGE, tempPassword, validEmail } from "@/lib/people";
import type { Role } from "@/lib/types";

/** The people directory for those who manage people (Founder, HR Admin, Manager). */
export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (me.role === "employee") return fail("Not allowed", 403);
  const people = await q(
    `select u.id, u.name, u.email, u.role, u.title, u.department, u.manager_id, u.avatar_url, m.name as manager_name,
            (u.password_hash is not null) as has_login, u.last_login_at,
            (select count(*)::int from portal.users r where r.manager_id = u.id) as reports
       from portal.users u left join portal.users m on m.id = u.manager_id
      order by case u.role when 'founder' then 0 when 'hr_admin' then 1 when 'manager' then 2 else 3 end, u.name`,
  );
  return json({ people, assignable: ASSIGNABLE[me.role] });
}

/** Create a person who can sign in. Returns the temporary password once. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const allowed = ASSIGNABLE[me.role];
  if (allowed.length === 0) return fail("You cannot create accounts", 403);

  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const role = b.role as Role;
  if (name.length < 2) return fail("Enter the person's full name");
  if (!validEmail(email)) return fail("Enter a valid email address");
  if (!allowed.includes(role)) return fail(`You can only assign: ${allowed.join(", ")}`, 403);

  // managers always add to their own team; everyone else picks the manager
  const managerId = me.role === "manager" ? me.id : b.manager_id ? Number(b.manager_id) : null;
  if (role === "employee" && !managerId) return fail("Every employee reports to a manager. Choose one.");
  if (managerId) {
    const [m] = await q<{ role: Role }>(`select role from portal.users where id = $1`, [managerId]);
    if (!m || !CAN_MANAGE.includes(m.role)) return fail("That person cannot be a manager");
  }
  if ((await q(`select 1 from portal.users where lower(email) = $1`, [email])).length) return fail("Someone with that email already exists", 409);

  const pw = tempPassword();
  const [row] = await q<{ id: number }>(
    `insert into portal.users(name, email, role, title, department, manager_id, password_hash)
     values($1, $2, $3, $4, $5, $6, $7) returning id`,
    [name.slice(0, 80), email, role, String(b.title ?? "").trim().slice(0, 80) || null, String(b.department ?? "").trim().slice(0, 80) || null, managerId, await hashPassword(pw)],
  );
  await q(`insert into portal.notifications(user_id, title, body, href) values($1, 'Welcome to the hub', $2, '/home')`, [row.id, `${me.name} created your account. Change your temporary password on your profile.`]);
  return json({ id: row.id, email, temp_password: pw }, 201);
}
