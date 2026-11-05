import { json } from "@/lib/db";
import { currentUser, demoMode } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  return json({ user, demo: demoMode() });
}
