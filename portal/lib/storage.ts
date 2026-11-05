import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

// Backblaze B2 through its S3-compatible API. The bucket is private: photos are only ever
// read back through /api/media, so nothing is exposed outside the portal.
const g = globalThis as unknown as { __b2?: S3Client };
const client = () =>
  (g.__b2 ??= new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: { accessKeyId: process.env.B2_KEY_ID ?? "", secretAccessKey: process.env.B2_APPLICATION_KEY ?? "" },
  }));

const BUCKET = () => process.env.B2_BUCKET ?? "";
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_SIDE = 1800;

async function put(key: string, data: Buffer, type: string) {
  await client().send(new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: data, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }));
  return { url: `/api/media/${key}`, size: data.length };
}

function check(body: Buffer, contentType: string) {
  if (!IMAGE_TYPES[contentType]) throw new Error("Only JPG, PNG, WebP or GIF images are allowed");
  if (body.length > MAX_IMAGE_BYTES) throw new Error("Image is larger than 12 MB");
}

/**
 * Stores a post photo and returns the URL to save with the post.
 * Photos are resized (longest side 1800px), rotated by their camera orientation and saved as WebP, which
 * typically turns a 4 MB phone photo into 150 to 300 KB. Animated GIFs are kept as they are.
 * Dev B's WhatsApp ingestion calls this directly with the downloaded media.
 */
export async function saveImage(body: Buffer, contentType: string): Promise<string> {
  return (await saveImageSized(body, contentType)).url;
}

/** Same as saveImage, and also says how many bytes were stored after compression. */
export async function saveImageSized(body: Buffer, contentType: string): Promise<{ url: string; size: number }> {
  check(body, contentType);
  let data = body, type = contentType;
  if (contentType !== "image/gif") {
    try {
      data = await sharp(body).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      type = "image/webp";
    } catch {
      throw new Error("That file is not a readable image");
    }
  }
  const d = new Date();
  return put(`posts/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${IMAGE_TYPES[type]}`, data, type);
}

/** Profile photo (square, 512px) or cover photo (wide, 1600 x 520). Both are centre-cropped to size and saved as WebP. */
export async function saveProfilePhoto(userId: number, kind: "avatar" | "cover", body: Buffer, contentType: string): Promise<{ url: string; size: number }> {
  check(body, contentType);
  const [w, h] = kind === "avatar" ? [512, 512] : [1600, 520];
  let data: Buffer;
  try {
    data = await sharp(body).rotate().resize({ width: w, height: h, fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new Error("That file is not a readable image");
  }
  return put(`profiles/${userId}/${kind}-${randomUUID()}.webp`, data, "image/webp");
}

export async function readImage(key: string) {
  return client().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
}

/** Best effort: remove a photo that is no longer used. Seed photos are never deleted. */
export async function deleteImage(url: string) {
  const key = url.replace(/^\/api\/media\//, "");
  if (!(key.startsWith("posts/") || key.startsWith("profiles/")) || key.startsWith("posts/seed/")) return;
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key })).catch(() => undefined);
}

