import { fail, json, q } from "@/lib/db";
import { currentUser, hashPassword } from "@/lib/auth";
import { ASSIGNABLE, CAN_MANAGE, tempPassword } from "@/lib/people";
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
