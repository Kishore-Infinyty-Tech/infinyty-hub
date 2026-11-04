import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const { name, phone } = await req.json().catch(() => ({}));
  const n = String(name ?? "").trim();
  if (n.length < 2) return fail("Enter your full name");
  await q(`update portal.users set name = $1, phone = $2 where id = $3`, [n.slice(0, 80), String(phone ?? "").trim().slice(0, 30) || null, me.id]);
  return json({ ok: true });
}
