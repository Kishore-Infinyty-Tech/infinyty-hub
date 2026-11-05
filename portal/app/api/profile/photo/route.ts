import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { deleteImage, saveProfilePhoto } from "@/lib/storage";

const COLUMN = { avatar: "avatar_url", cover: "cover_url" } as const;
type Kind = keyof typeof COLUMN;
const kindOf = (v: unknown): Kind | null => (v === "avatar" || v === "cover" ? v : null);

/** Set your own profile photo or cover photo. multipart/form-data: `file` and `kind` (avatar | cover). */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = kindOf(form?.get("kind"));
  if (!(file instanceof File) || !kind) return fail("file and kind (avatar or cover) are required");
  try {
    const { url, size } = await saveProfilePhoto(me.id, kind, Buffer.from(await file.arrayBuffer()), file.type);
    const [old] = await q<{ url: string | null }>(`select ${COLUMN[kind]} as url from portal.users where id = $1`, [me.id]);
    await q(`update portal.users set ${COLUMN[kind]} = $2 where id = $1`, [me.id, url]);
    if (old?.url) await deleteImage(old.url);
    return json({ url, kind, bytes_after: size });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Upload failed", 400);
  }
}

/** Go back to the default: initials for the profile photo, the company-logo cover for the cover. */
export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  const kind = kindOf(new URL(req.url).searchParams.get("kind"));
  if (!kind) return fail("kind must be avatar or cover");
  const [old] = await q<{ url: string | null }>(`select ${COLUMN[kind]} as url from portal.users where id = $1`, [me.id]);
  await q(`update portal.users set ${COLUMN[kind]} = null where id = $1`, [me.id]);
  if (old?.url) await deleteImage(old.url);
  return json({ ok: true });
}
