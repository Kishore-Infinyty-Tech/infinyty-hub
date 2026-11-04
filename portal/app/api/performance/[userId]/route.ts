import { json, q } from "@/lib/db";

/** Verified milestones for one person (plus those still waiting on the manager). */
export async function GET(_req: Request, ctx: RouteContext<"/api/performance/[userId]">) {
  const { userId } = await ctx.params;
  const [user] = await q(
    `select u.id, u.name, u.title, u.department, u.email, u.avatar_url, u.cover_url, m.name as manager_name
       from portal.users u left join portal.users m on m.id = u.manager_id where u.id = $1`,
    [userId],
  );
  const achievements = await q(
    `select id, user_id, post_id, title, category, impact, status, manager_comment, achieved_on
       from portal.achievements where user_id = $1 order by achieved_on desc`,
    [userId],
  );
  return json({ user: user ?? null, achievements });
}
