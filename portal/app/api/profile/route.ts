import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Everything the profile page shows besides the person's own fields. */
export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const [[manager], reports, [counts], apps] = await Promise.all([
    q(`select id, name, title, avatar_url from portal.users where id = $1`, [me.manager_id]),
    q(`select id, name, title, avatar_url from portal.users where manager_id = $1 order by name`, [me.id]),
    q(`select (select count(*)::int from portal.achievements where user_id = $1 and status = 'approved') as verified,
              (select count(*)::int from portal.achievements where user_id = $1 and status = 'pending') as pending,
              (select count(*)::int from portal.posts where $1 = any(tagged_user_ids) and status = 'published') as tagged_posts,
              (select count(*)::int from portal.post_comments where user_id = $1) as comments,
              (select last_login_at from portal.users where id = $1) as last_login_at`, [me.id]),
    q(`select a.id, a.name, a.icon, a.hue from portal.apps a
        where exists (select 1 from portal.app_permissions p where p.app_id = a.id and p.role = $1) order by a.sort`, [me.role]),
  ]);
  const [{ total }] = await q<{ total: number }>(`select count(*)::int as total from portal.apps`);
  return json({ manager: manager ?? null, reports, counts, apps, total_apps: total });
}
