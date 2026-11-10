import { fail, json, q } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/auth";
import { COMPANY_DOMAIN, LEGACY_DOMAINS, emailName } from "@/lib/email";

/**
 * Sign in with a work email (name@infinyty.tech) and password.
 * Set ALLOW_ANY_PASSWORD=1 (demo / local testing) and any password works for a correct email.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return fail("Enter your email and password");
  const entered = String(email).trim().toLowerCase();
  const domain = entered.includes("@") ? entered.split("@")[1] : COMPANY_DOMAIN;
  // only the company domain (or an old address that still exists in the database) can sign in
  const domainOk = domain === COMPANY_DOMAIN || LEGACY_DOMAINS.includes(domain);
  const [u] = domainOk
    ? await q<{ id: number; password_hash: string | null }>(
        `select id, password_hash from portal.users where split_part(lower(email), '@', 1) = $1 order by (lower(email) = $2) desc, id limit 1`,
        [emailName(entered), entered],
      )
    : [];
  const anyPassword = process.env.ALLOW_ANY_PASSWORD === "1";
  // same message for "no such user" and "wrong password" so emails cannot be probed
  if (!u || !(anyPassword || (await verifyPassword(String(password), u.password_hash)))) return fail("That email or password is not right", 401);
  await q(`update portal.users set last_login_at = now() where id = $1`, [u.id]);
  await startSession(u.id);
  return json({ ok: true });
}
