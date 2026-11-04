import { fail, json } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { fetchPosts, MODERATORS } from "@/lib/posts";

/** Member posts waiting for a decision that this person can make: a manager sees their team's, HR and the Founder see all. */
export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (me.role === "employee") return fail("Not allowed", 403);
  const where = MODERATORS.includes(me.role)
    ? "p.status = 'pending' and p.source = 'member'"
    : "p.status = 'pending' and p.source = 'member' and a.manager_id = $1";
  return json({ posts: await fetchPosts(me, where, [], "p.created_at asc") });
}
