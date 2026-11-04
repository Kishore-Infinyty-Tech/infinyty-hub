import { fail, json, q } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return fail("Enter your email and password");
  const [u] = await q<{ id: number; password_hash: string | null }>(`select id, password_hash from portal.users where lower(email) = lower($1)`, [String(email).trim()]);
  // same message for "no such user" and "wrong password" so emails cannot be probed
  if (!u || !(await verifyPassword(String(password), u.password_hash))) return fail("That email or password is not right", 401);
  await q(`update portal.users set last_login_at = now() where id = $1`, [u.id]);
  await startSession(u.id);
  return json({ ok: true });
}
