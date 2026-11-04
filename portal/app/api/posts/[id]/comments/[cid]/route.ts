import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MODERATORS } from "@/lib/posts";

/** Edit a comment (its writer only). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/posts/[id]/comments/[cid]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const { id, cid } = await ctx.params;
  const text = String((await req.json().catch(() => ({}))).body ?? "").trim().slice(0, 1000);
  if (!text) return fail("Write a comment first");
  const r = await q(`update portal.post_comments set body = $3 where id = $2 and post_id = $1 and user_id = $4 returning id`, [id, cid, text, me.id]);
  return r.length ? json({ ok: true }) : fail("You can only edit your own comments", 403);
}

/** Delete a comment: its writer, HR Admins and the Founder. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/posts/[id]/comments/[cid]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const { id, cid } = await ctx.params;
  const [c] = await q<{ user_id: number }>(`select user_id from portal.post_comments where id = $2 and post_id = $1`, [id, cid]);
  if (!c) return fail("Comment not found", 404);
  if (c.user_id !== me.id && !MODERATORS.includes(me.role)) return fail("You can only delete your own comments", 403);
  await q(`delete from portal.post_comments where id = $1`, [cid]);
  return json({ ok: true });
}
