import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { cleanPost, fetchPost, notify, PUBLISH_DIRECT } from "@/lib/posts";
import { deleteImage } from "@/lib/storage";

/**
 * Edit a post: its text, type and photos. The author can edit their own post; HR Admins and the Founder can edit any.
 * When an employee edits a post, it goes back to their manager for approval, because what readers see has changed.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  const post = await fetchPost(me, id);
  if (!post) return fail("Post not found", 404);
  if (!post.can_edit) return fail("You can only edit your own posts", 403);

  const clean = cleanPost(await req.json().catch(() => ({})), me.role, post.category);
  if ("error" in clean) return fail(clean.error);

  const resubmit = post.author_id === me.id && !PUBLISH_DIRECT.includes(me.role) && post.status !== "pending";
  await q(
    `update portal.posts set body = $2, category = $3, images = $4, image_url = $5, updated_at = now(),
            status = case when $6 then 'pending' else status end,
            reviewed_by = case when $6 then null else reviewed_by end, reviewed_at = case when $6 then null else reviewed_at end,
            review_note = case when $6 then null else review_note end
      where id = $1`,
    [id, clean.body, clean.category, clean.images, clean.images[0] ?? null, resubmit],
  );
  // photos the author took out of the post are removed from storage
  await Promise.all(post.images.filter((u) => !clean.images.includes(u)).map(deleteImage));
  if (resubmit) await notify(me.manager_id, "Edited post waiting for your approval", `${me.name} changed a post and sent it for approval again.`, "/approvals");
  return json({ post: await fetchPost(me, id), pending: resubmit });
}

/** Delete a post with its comments, reactions and photos. The author, HR Admins and the Founder can delete. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  const post = await fetchPost(me, id);
  if (!post) return fail("Post not found", 404);
  if (!post.can_delete) return fail("You can only delete your own posts", 403);
  await q(`update portal.achievements set post_id = null where post_id = $1`, [id]);
  await q(`delete from portal.posts where id = $1`, [id]);
  await Promise.all(post.images.map(deleteImage));
  if (post.author_id && post.author_id !== me.id) await notify(post.author_id, "Your post was removed", `${me.name} removed your post from the feed.`);
  return json({ ok: true });
}
