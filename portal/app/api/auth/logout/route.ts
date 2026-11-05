import { json } from "@/lib/db";
import { endSession } from "@/lib/auth";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
