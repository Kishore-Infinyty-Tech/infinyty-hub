import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { cleanPost, fetchPost, fetchPosts, notify, notifyEveryone, PUBLISH_DIRECT } from "@/lib/posts";

/**
 * The feed. `sort=latest` (default) shows the newest posts, plus the viewer's own posts that are still waiting
 * for approval. `sort=trending` shows published posts from the last 30 days, most reactions and comments first.
 */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const sort = new URL(req.url).searchParams.get("sort");
  const posts =
    sort === "announcements"
      ? await fetchPosts(me, "p.status = 'published' and p.category = 'announcement'", [], "p.pinned desc, p.published_at desc", 50)
    : sort === "trending"
      ? await fetchPosts(me, "p.status = 'published' and p.pinned = false and p.published_at > now() - interval '30 days'", [], "trend_score desc, p.published_at desc", 30)
      : await fetchPosts(me, "(p.status = 'published' or (p.author_id = $1 and p.status in ('pending','rejected')))", [], "p.pinned desc, p.published_at desc");
  return json({ posts });
}

/** Create a post. Managers, HR Admins and the Founder publish at once; an employee's post goes to their manager first. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const clean = cleanPost(await req.json().catch(() => ({})), me.role);
  if ("error" in clean) return fail(clean.error);

  const direct = PUBLISH_DIRECT.includes(me.role);
  const [row] = await q<{ id: number }>(
    `insert into portal.posts(title, body, category, image_url, images, author_id, author_name, source, status, published_at)
     values(null, $1, $2, $3, $4, $5, $6, 'member', $7, now()) returning id`,
    [clean.body, clean.category, clean.images[0] ?? null, clean.images, me.id, me.name, direct ? "published" : "pending"],
  );
  if (clean.category === "announcement") await notifyEveryone(me.id, "New announcement", clean.body.slice(0, 90) || "The Founder posted an announcement", "/home");
  if (!direct) await notify(me.manager_id, "Post waiting for your approval", `${me.name} wrote a post for the company feed.`, "/approvals");
  return json({ post: await fetchPost(me, row.id), pending: !direct }, 201);
}
