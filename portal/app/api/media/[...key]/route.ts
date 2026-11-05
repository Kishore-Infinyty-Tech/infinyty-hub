import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readImage } from "@/lib/storage";

/** Streams a photo out of the private bucket or fallback local seed-images folder. */
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[...key]">) {
  const { key } = await ctx.params;
  const path = Array.isArray(key) ? key.join("/") : String(key ?? "");
  if (!(path.startsWith("posts/") || path.startsWith("profiles/")) || path.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  // Fallback for demo seed-images on local disk so all demo images work immediately without B2 credentials
  if (path.startsWith("posts/seed/")) {
    const filename = path.replace("posts/seed/", "");
    const localSeedPath = join(process.cwd(), "seed-images", filename);
    if (existsSync(localSeedPath)) {
      try {
        const fileBuffer = readFileSync(localSeedPath);
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": filename.endsWith(".webp") ? "image/webp" : "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // Fall back to B2 if reading file fails
      }
    }
  }

  try {
    const obj = await readImage(path);
    return new Response(obj.Body?.transformToWebStream(), {
      headers: {
        "Content-Type": obj.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
