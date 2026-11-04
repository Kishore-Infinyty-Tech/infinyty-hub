import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const KINDS = ["like", "celebrate", "love"];

/** Same reaction again removes it; a different one switches it. Only published posts can be reacted to. */
export async function POST(req: Request, ctx: RouteContext<"/api/posts/[id]/react">) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const id = Number((await ctx.params).id);
  const { kind } = await req.json().catch(() => ({}));
  if (!KINDS.includes(kind)) return fail("A valid reaction is required");
  if (!(await q(`select 1 from portal.posts where id = $1 and status = 'published'`, [id])).length) return fail("Post not found", 404);
  const current = await q<{ kind: string }>(`select kind from portal.post_reactions where post_id = $1 and user_id = $2`, [id, me.id]);
  if (current[0]?.kind === kind) {
    await q(`delete from portal.post_reactions where post_id = $1 and user_id = $2`, [id, me.id]);
  } else {
    await q(
      `insert into portal.post_reactions(post_id, user_id, kind) values($1, $2, $3)
       on conflict (post_id, user_id) do update set kind = excluded.kind`,
      [id, me.id, kind],
    );
  }
  return json({ ok: true });
}
