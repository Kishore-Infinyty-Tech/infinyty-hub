import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MODERATORS } from "@/lib/posts";
import type { Post } from "@/lib/types";

export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (!MODERATORS.includes(me.role)) return fail("HR Admins and Founders only", 403);

  // Staged incoming WhatsApp stories
  const posts = await q<Post>(
    `select p.id, p.title, p.body, p.category, p.image_url, p.images, p.author_name,
            p.source, p.status, p.pinned, p.tagged_user_ids, p.send_to_performance,
            p.published_at, p.created_at, p.updated_at, p.review_note,
            coalesce((select json_agg(json_build_object('id', u.id, 'name', u.name, 'title', u.title, 'avatar_url', u.avatar_url, 'department', u.department, 'manager_id', u.manager_id) order by u.name)
                        from portal.users u where u.id = any(p.tagged_user_ids)), '[]') as tagged
       from portal.posts p
      where p.status = 'pending' and p.source = 'whatsapp'
      order by p.created_at desc`,
  );

  // Stats for the moderation dashboard
  const [stats] = await q<{
    pending_count: number;
    published_count: number;
    achievements_routed: number;
  }>(
    `select
       (select count(*)::int from portal.posts where status = 'pending' and source = 'whatsapp') as pending_count,
       (select count(*)::int from portal.posts where status = 'published' and source = 'whatsapp') as published_count,
       (select count(*)::int from portal.achievements where post_id is not null) as achievements_routed`,
  );

  // Also fetch recent published stories (up to 15) so HR can review history
  const publishedHistory = await q<Post>(
    `select p.id, p.title, p.body, p.category, p.image_url, p.images, p.author_name,
            p.source, p.status, p.pinned, p.tagged_user_ids, p.send_to_performance,
            p.published_at, p.created_at, rv.name as reviewer_name,
            coalesce((select json_agg(json_build_object('id', u.id, 'name', u.name, 'title', u.title, 'avatar_url', u.avatar_url) order by u.name)
                        from portal.users u where u.id = any(p.tagged_user_ids)), '[]') as tagged
       from portal.posts p
       left join portal.users rv on rv.id = p.reviewed_by
      where p.status = 'published' and p.source = 'whatsapp'
      order by p.published_at desc limit 15`,
  );

  return json({
    posts: posts.map((p) => ({
      ...p,
      images: p.images ?? [],
      reactions: {},
      reaction_total: 0,
      my_reaction: null,
      comment_count: 0,
      trend_score: 0,
      can_edit: true,
      can_delete: true,
      author_id: null,
      author_title: null,
      author_avatar: null,
      reviewer_name: null,
      approver_name: null,
    })),
    publishedHistory: publishedHistory.map((p) => ({
      ...p,
      images: p.images ?? [],
      reactions: {},
      reaction_total: 0,
      my_reaction: null,
      comment_count: 0,
      trend_score: 0,
      can_edit: true,
      can_delete: true,
      author_id: null,
      author_title: null,
      author_avatar: null,
      approver_name: null,
    })),
    stats: stats ?? { pending_count: 0, published_count: 0, achievements_routed: 0 },
  });
}
