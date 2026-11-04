import { fail, json } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { saveImageSized } from "@/lib/storage";

/** multipart/form-data with a `file` field. Any signed-in person can upload a photo for their own post. */
export async function POST(req: Request) {
  if (!(await currentUser())) return fail("Sign in first", 401);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return fail("file is required");
  try {
    const saved = await saveImageSized(Buffer.from(await file.arrayBuffer()), file.type);
    return json({ url: saved.url, bytes_after: saved.size });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Upload failed", 400);
  }
}
