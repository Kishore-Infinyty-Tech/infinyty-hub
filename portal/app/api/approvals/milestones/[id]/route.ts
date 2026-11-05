import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (me.role === "employee") return fail("Managers and HR only", 403);

  const id = Number((await ctx.params).id);
  const body = await req.json().catch(() => ({}));
  const action: "approve" | "reject" = body.action;
  const comment = String(body.comment ?? body.manager_comment ?? "").trim();

  if (action !== "approve" && action !== "reject") {
    return fail("action must be approve or reject", 400);
  }

  // Find achievement and employee's manager
  const [achievement] = await q<{
    id: number;
    user_id: number;
    title: string;
    status: string;
    manager_id: number | null;
    employee_name: string;
  }>(
    `select a.id, a.user_id, a.title, a.status, u.manager_id, u.name as employee_name
       from portal.achievements a
       join portal.users u on u.id = a.user_id
      where a.id = $1`,
    [id],
  );

  if (!achievement) return fail("Milestone not found", 404);
  if (achievement.status !== "pending") return fail("Milestone has already been reviewed", 400);

  const isGlobalModerator = me.role === "hr_admin" || me.role === "founder";
  const isDirectManager = achievement.manager_id === me.id;

  if (!isGlobalModerator && !isDirectManager) {
    return fail("Only the employee's direct manager or HR can review this milestone", 403);
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const defaultComment = action === "approve" ? "Verified & KPI credited." : "Not approved for KPI credit.";
  const finalComment = comment || defaultComment;

  await q(
    `update portal.achievements
        set status = $2,
            manager_comment = $3
      where id = $1`,
    [id, newStatus, finalComment],
  );

  // Notify the employee
  if (action === "approve") {
    await q(
      `insert into portal.notifications(user_id, title, body, href)
       values($1, 'Performance Milestone Verified!', $2, '/apps/performance')`,
      [
        achievement.user_id,
        `${me.name} verified "${achievement.title}". Locked in as a verified milestone for your review cycle!`,
      ],
    );
  } else {
    await q(
      `insert into portal.notifications(user_id, title, body, href)
       values($1, 'Milestone Update', $2, '/apps/performance')`,
      [
        achievement.user_id,
        `${me.name} did not approve "${achievement.title}": ${finalComment}`,
      ],
    );
  }

  return json({ ok: true, status: newStatus });
}
