import { fail, json, q } from "@/lib/db";
import { currentUser, demoMode } from "@/lib/auth";

/** The directory. In demo mode it also feeds the "switch person" menu. */
export async function GET() {
  if (!(await currentUser())) return fail("Sign in first", 401);
  const users = await q(`select id, name, email, role, title, department, manager_id, avatar_url from portal.users order by id`);
  return json({ users, demo: demoMode() });
}
