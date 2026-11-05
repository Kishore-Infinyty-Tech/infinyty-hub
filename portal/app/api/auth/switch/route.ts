import { fail, json, q } from "@/lib/db";
import { currentUser, demoMode, startSession } from "@/lib/auth";

/** Demo only: lets a signed-in person jump to another person to show role differences. Off when DEMO_MODE is not 1. */
export async function POST(req: Request) {
  if (!demoMode()) return fail("Not available", 404);
  if (!(await currentUser())) return fail("Sign in first", 401);
  const { userId } = await req.json().catch(() => ({}));
  const [u] = await q(`select id from portal.users where id = $1`, [Number(userId)]);
  if (!u) return fail("Person not found", 404);
  await startSession(Number(userId));
  return json({ ok: true });
}
