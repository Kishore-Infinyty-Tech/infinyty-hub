import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { fetchPost, MODERATORS, notify } from "@/lib/posts";

/** Approve or reject a pending post. Allowed for the author's manager, HR Admins and the Founder, never for the author. */
export async function POST(req: Request, ctx: RouteContext<"/api/posts/[id]/review">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  const { action, note } = await req.json().catch(() => ({}));
  if (action !== "approve" && action !== "reject") return fail("action must be approve or reject");

  const post = await fetchPost(me, id);
  if (!post || post.status !== "pending" || post.source !== "member") return fail("This post is not waiting for approval", 404);
  if (post.author_id === me.id) return fail("You cannot approve your own post", 403);
  const [author] = await q<{ manager_id: number | null }>(`select manager_id from portal.users where id = $1`, [post.author_id]);
  const mayReview = MODERATORS.includes(me.role) || (me.role === "manager" && author?.manager_id === me.id);
  if (!mayReview) return fail("Only the author's manager, HR or the Founder can review this post", 403);

  const text = String(note ?? "").trim().slice(0, 300);
  if (action === "approve") {
    await q(`update portal.posts set status = 'published', published_at = now(), reviewed_by = $2, reviewed_at = now(), review_note = null where id = $1`, [id, me.id]);
    await notify(post.author_id, "Your post is live", `${me.name} approved your post. Everyone can see it now.`);
  } else {
    await q(`update portal.posts set status = 'rejected', reviewed_by = $2, reviewed_at = now(), review_note = $3 where id = $1`, [id, me.id, text || null]);
    await notify(post.author_id, "Your post was not approved", text ? `${me.name}: ${text}` : `${me.name} did not approve your post. You can edit it and send it again.`);
  }
  return json({ ok: true });
}
