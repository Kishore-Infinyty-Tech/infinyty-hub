import { fail, json, q } from "@/lib/db";

export async function POST(req: Request, ctx: RouteContext<"/api/apps/[id]/request">) {
  const { id } = await ctx.params;
  const { userId, reason } = await req.json();
  if (!userId) return fail("userId is required");
  const existing = await q(`select 1 from portal.access_requests where app_id = $1 and user_id = $2 and status = 'pending'`, [id, userId]);
  if (existing.length) return json({ ok: true, already: true });
  await q(`insert into portal.access_requests(app_id, user_id, reason) values($1, $2, $3)`, [id, userId, String(reason ?? "").slice(0, 500)]);
  // tell every HR admin
  await q(
    `insert into portal.notifications(user_id, title, body, href)
     select h.id, 'Access request', u.name || ' asked for access to ' || a.name, '/'
       from portal.users h, portal.users u, portal.apps a
      where h.role = 'hr_admin' and u.id = $2 and a.id = $1`,
    [id, userId],
  );
  return json({ ok: true });
}
