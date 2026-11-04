import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MODERATORS, notify } from "@/lib/posts";

export async function GET(_req: Request, ctx: RouteContext<"/api/posts/[id]/comments">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const { id } = await ctx.params;
  const rows = await q<{ user_id: number }>(
    `select c.id, c.body, c.created_at, u.id as user_id, u.name as user_name, u.title as user_title, u.avatar_url as user_avatar
       from portal.post_comments c join portal.users u on u.id = c.user_id
      where c.post_id = $1 order by c.created_at`,
    [id],
  );
  return json({ comments: rows.map((c) => ({ ...c, can_delete: c.user_id === me.id || MODERATORS.includes(me.role) })) });
}

export async function POST(req: Request, ctx: RouteContext<"/api/posts/[id]/comments">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  const text = String((await req.json().catch(() => ({}))).body ?? "").trim().slice(0, 1000);
  if (!text) return fail("Write a comment first");
  const [post] = await q<{ author_id: number | null }>(`select author_id from portal.posts where id = $1 and status = 'published'`, [id]);
  if (!post) return fail("Post not found", 404);
  await q(`insert into portal.post_comments(post_id, user_id, body) values($1, $2, $3)`, [id, me.id, text]);
  if (post.author_id && post.author_id !== me.id) await notify(post.author_id, "New comment on your post", `${me.name}: ${text.slice(0, 80)}`);
  return json({ ok: true });
}
