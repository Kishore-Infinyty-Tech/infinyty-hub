import { q } from "./db";
import type { Post, PostCategory, Role } from "./types";

/** Roles that publish straight to the feed. Everyone else's posts wait for their manager. */
export const PUBLISH_DIRECT: Role[] = ["manager", "hr_admin", "founder"];
export const MODERATORS: Role[] = ["hr_admin", "founder"];
export const CATEGORIES: PostCategory[] = ["update", "client_win", "award", "office_update", "announcement"];
export const MAX_IMAGES = 10;
export const MAX_BODY = 3000;

const SELECT = `
  select p.id, p.title, p.body, p.category, p.image_url, p.images, p.author_id,
         coalesce(a.name, p.author_name) as author_name, a.title as author_title, a.avatar_url as author_avatar, p.source, p.status, p.pinned,
         p.published_at, p.updated_at, p.review_note, rv.name as reviewer_name, am.name as approver_name, p.send_to_performance,
         coalesce((select json_agg(json_build_object('id', u.id, 'name', u.name, 'title', u.title, 'avatar_url', u.avatar_url) order by u.name)
                     from portal.users u where u.id = any(p.tagged_user_ids)), '[]') as tagged,
         coalesce((select json_object_agg(kind, n) from
                     (select kind, count(*)::int n from portal.post_reactions where post_id = p.id group by kind) k), '{}') as reactions,
         (select count(*)::int from portal.post_reactions where post_id = p.id) as reaction_total,
         (select kind from portal.post_reactions where post_id = p.id and user_id = $1) as my_reaction,
         (select count(*)::int from portal.post_comments where post_id = p.id) as comment_count,
         ((select count(*)::int from portal.post_reactions where post_id = p.id)
          + 2 * (select count(*)::int from portal.post_comments where post_id = p.id)) as trend_score
    from portal.posts p
    left join portal.users a on a.id = p.author_id
    left join portal.users am on am.id = a.manager_id
    left join portal.users rv on rv.id = p.reviewed_by`;

type Raw = Omit<Post, "can_edit" | "can_delete">;

/** Runs the shared post query ($1 is always the viewer's id) and adds what the viewer may do with each post. */
export async function fetchPosts(me: { id: number; role: Role }, where: string, params: unknown[] = [], order = "p.published_at desc", limit = 60): Promise<Post[]> {
  const rows = await q<Raw>(`${SELECT} where ${where} order by ${order} limit ${limit}`, [me.id, ...params]);
  return rows.map((p) => ({
    ...p,
    images: p.images ?? [],
    // announcements can only be edited or removed by the Founder
    can_edit: p.category === "announcement" ? me.role === "founder" : p.author_id === me.id || (p.author_id === null && MODERATORS.includes(me.role)),
    can_delete: p.category === "announcement" ? me.role === "founder" : p.author_id === me.id || MODERATORS.includes(me.role),
  }));
}

export async function fetchPost(me: { id: number; role: Role }, id: number) {
  return (await fetchPosts(me, "p.id = $2", [id]))[0] ?? null;
}

/** Validates the parts of a post that come from the browser. Returns an error message or the clean values. */
export function cleanPost(b: { body?: unknown; category?: unknown; images?: unknown }, role: Role, existing?: PostCategory): { error: string } | { body: string; category: PostCategory; images: string[] } {
  const body = String(b.body ?? "").trim();
  const images = Array.isArray(b.images) ? b.images.map(String) : [];
  const category = (b.category ?? "update") as PostCategory;
  if (!body && images.length === 0) return { error: "Write something or add a photo" };
  if (body.length > MAX_BODY) return { error: `Posts can be up to ${MAX_BODY} characters` };
  if (images.length > MAX_IMAGES) return { error: `You can add up to ${MAX_IMAGES} photos` };
  if (images.some((u) => !u.startsWith("/api/media/posts/") || u.includes(".."))) return { error: "Photos must be uploaded through the portal" };
  if (!CATEGORIES.includes(category)) return { error: "Unknown post type" };
  // announcements are the Founder only: nobody else can create one or turn a post into one
  if (category === "announcement" && role !== "founder") return { error: "Only the Founder can post announcements" };
  if (existing === "announcement" && category !== "announcement") return { error: "An announcement cannot be changed into another type" };
  return { body, category, images };
}

/** Tells everyone who can sign in (except the sender) about something new. */
export async function notifyEveryone(exceptId: number, title: string, body: string, href = "/home") {
  await q(`insert into portal.notifications(user_id, title, body, href) select id, $2, $3, $4 from portal.users where password_hash is not null and id <> $1`, [exceptId, title, body, href]);
}

export async function notify(userId: number | null, title: string, body: string, href = "/home") {
  if (!userId) return;
  await q(`insert into portal.notifications(user_id, title, body, href) values($1, $2, $3, $4)`, [userId, title, body, href]);
}
