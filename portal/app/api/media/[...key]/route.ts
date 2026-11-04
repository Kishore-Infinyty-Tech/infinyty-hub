import { readImage } from "@/lib/storage";

/** Streams a photo out of the private bucket. Only keys under posts/ and profiles/ are served. */
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[...key]">) {
  const { key } = await ctx.params;
  const path = key.join("/");
  if (!(path.startsWith("posts/") || path.startsWith("profiles/")) || path.includes("..")) return new Response("Not found", { status: 404 });
  try {
    const obj = await readImage(path);
    return new Response(obj.Body?.transformToWebStream(), {
      headers: { "Content-Type": obj.ContentType ?? "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
