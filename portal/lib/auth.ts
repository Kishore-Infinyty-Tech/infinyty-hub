import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { q } from "./db";
import type { User } from "./types";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export const COOKIE = "portal_session";
const MAX_AGE_S = 60 * 60 * 12; // a working day

/** Passwords are stored as "salt:hash" (scrypt). */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = await scrypt(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const secret = () => process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

/** Cookie value: "<userId>.<expiresAtMs>.<hmac>". Tamper-proof, and expires on its own. */
export async function startSession(userId: number) {
  const exp = Date.now() + MAX_AGE_S * 1000;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

const USER_COLS = `id, name, email, role, title, department, manager_id, phone, avatar_url, cover_url`;

/** The signed-in person, or null. Use this in every route that needs to know who is asking. */
export async function currentUser(): Promise<(User & { phone: string | null }) | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, mac] = raw.split(".");
  const payload = `${id}.${exp}`;
  const good = mac && sign(payload).length === mac.length && timingSafeEqual(Buffer.from(sign(payload)), Buffer.from(mac));
  if (!good || Number(exp) < Date.now()) return null;
  const [u] = await q<User & { phone: string | null }>(`select ${USER_COLS} from portal.users where id = $1`, [Number(id)]);
  return u ?? null;
}

export const demoMode = () => process.env.DEMO_MODE === "1";
