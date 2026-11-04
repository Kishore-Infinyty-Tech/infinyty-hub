import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** The signed-in person's notifications. */
export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const notifications = await q(
    `select id, title, body, href, read, created_at from portal.notifications where user_id = $1 order by created_at desc limit 20`,
    [me.id],
  );
  return json({ notifications });
}

/** Mark everything read. */
export async function POST() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  await q(`update portal.notifications set read = true where user_id = $1`, [me.id]);
  return json({ ok: true });
}
