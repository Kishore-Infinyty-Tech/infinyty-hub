import { fail, json, q } from "@/lib/db";
import { currentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const { current, next } = await req.json().catch(() => ({}));
  if (typeof next !== "string" || next.length < 8) return fail("The new password needs at least 8 characters");
  const [row] = await q<{ password_hash: string | null }>(`select password_hash from portal.users where id = $1`, [me.id]);
  if (!(await verifyPassword(String(current ?? ""), row?.password_hash ?? null))) return fail("Your current password is not right", 403);
  await q(`update portal.users set password_hash = $1 where id = $2`, [await hashPassword(next), me.id]);
  return json({ ok: true });
}
