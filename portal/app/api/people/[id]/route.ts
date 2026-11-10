import { fail, json, q } from "@/lib/db";
import { currentUser, hashPassword } from "@/lib/auth";
import { ASSIGNABLE, CAN_MANAGE, tempPassword } from "@/lib/people";
import { companyEmail, type OrgNode } from "@/lib/email";
import type { Role } from "@/lib/types";

/** Edit a person's role, manager, title or department, or reset their password. Founder and HR Admin only. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/people/[id]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (me.role !== "founder" && me.role !== "hr_admin") return fail("Only the Founder and HR Admins can edit people", 403);

  const id = Number((await ctx.params).id);
  const [target] = await q<{ id: number; role: Role; manager_id: number | null }>(`select id, role, manager_id from portal.users where id = $1`, [id]);
  if (!target) return fail("Person not found", 404);
  if (target.role === "founder" && me.role !== "founder") return fail("Only a Founder can edit a Founder", 403);

  const b = await req.json().catch(() => ({}));
  const role = (b.role ?? target.role) as Role;
  if (role !== target.role) {
    if (id === me.id) return fail("You cannot change your own role", 400);
    if (!ASSIGNABLE[me.role].includes(role)) return fail("You cannot assign that role", 403);
  }
  const managerId = "manager_id" in b ? (b.manager_id ? Number(b.manager_id) : null) : target.manager_id;
  if (role === "employee" && !managerId) return fail("Every employee reports to a manager. Choose one.");
  if (managerId) {
    if (managerId === id) return fail("A person cannot report to themselves");
    const [m] = await q<{ role: Role }>(`select role from portal.users where id = $1`, [managerId]);
    if (!m || !CAN_MANAGE.includes(m.role)) return fail("That person cannot be a manager");
  }

  const fields: string[] = ["role = $2", "manager_id = $3"];
  const params: unknown[] = [id, role, managerId];
  for (const k of ["name", "title", "department"] as const) {
    if (k in b) { params.push(String(b[k] ?? "").trim().slice(0, 80) || null); fields.push(`${k} = $${params.length}`); }
  }
  let temp: string | undefined;
  if (b.reset_password) { temp = tempPassword(); params.push(await hashPassword(temp)); fields.push(`password_hash = $${params.length}`); }
  await q(`update portal.users set ${fields.join(", ")} where id = $1`, params);
  return json({ ok: true, temp_password: temp });
}

interface Row { id: number; name: string; email: string; role: Role; title: string | null; department: string | null; manager_id: number | null; avatar_url: string | null; cover_url: string | null }

/** A person's public profile and where they sit in the organisation. Any signed-in person can see it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/people/[id]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail("Person not found", 404);

  // the whole company is small, so load everyone once and walk the reporting lines in memory
  const all = await q<Row>(`select id, name, email, role, title, department, manager_id, avatar_url, cover_url from portal.users`);
  const byId = new Map(all.map((r) => [r.id, r]));
  const person = byId.get(id);
  if (!person) return fail("Person not found", 404);

  const node = (r: Row): Omit<OrgNode, "reports"> => ({ id: r.id, name: r.name, title: r.title, department: r.department, role: r.role, avatar_url: r.avatar_url });
  const kids = new Map<number, Row[]>();
  for (const r of all) if (r.manager_id) kids.set(r.manager_id, [...(kids.get(r.manager_id) ?? []), r]);
  const seen = new Set<number>();
  const below = (r: Row): OrgNode => {
    seen.add(r.id);
    const sorted = (kids.get(r.id) ?? []).filter((k) => !seen.has(k.id)).sort((a, b) => a.name.localeCompare(b.name));
    return { ...node(r), reports: sorted.map(below) };
  };
  // people above them, nearest manager last in the list (top of the company first)
  const chain: Omit<OrgNode, "reports">[] = [];
  for (let cur = person.manager_id ? byId.get(person.manager_id) : undefined, guard = 0; cur && guard < 20; cur = cur.manager_id ? byId.get(cur.manager_id) : undefined, guard++) chain.unshift(node(cur));

  const tree = below(person);
  const count = (n: OrgNode): number => n.reports.reduce((t, c) => t + 1 + count(c), 0);
  const achievements = await q(
    `select id, title, category, impact, achieved_on from portal.achievements where user_id = $1 and status = 'approved' order by achieved_on desc limit 5`,
    [id],
  );
  return json({
    person: { ...node(person), email: companyEmail(person.email), cover_url: person.cover_url, manager_id: person.manager_id },
    above: chain,
    tree,
    team_size: count(tree),
    direct_reports: tree.reports.length,
    achievements,
    is_me: person.id === me.id,
  });
}
