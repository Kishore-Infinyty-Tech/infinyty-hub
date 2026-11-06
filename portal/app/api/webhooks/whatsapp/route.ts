import { fail, json, q } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MODERATORS } from "@/lib/posts";
import type { WhatsAppLogEntry } from "@/lib/whatsapp";
import type { PostCategory } from "@/lib/types";

const STATUS_MAP = { pending: "staged", published: "published", rejected: "rejected" } as const;

/** A signed-in HR Admin or Founder (the demo simulator), or the real WhatsApp provider sending WHATSAPP_WEBHOOK_SECRET. */
async function allowed(req: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (secret) {
    const sent = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (sent === secret) return true;
  }
  const me = await currentUser();
  return !!me && MODERATORS.includes(me.role);
}

export async function GET() {
  const me = await currentUser();
  if (!me) return fail("Sign in first", 401);
  if (!MODERATORS.includes(me.role)) return fail("HR Admins and Founders only", 403);
  // Read from the database, not server memory: serverless instances do not share memory.
  const rows = await q<{
    id: number; body: string; category: PostCategory; images: string[] | null; image_url: string | null;
    author_name: string | null; status: keyof typeof STATUS_MAP; created_at: string;
  }>(
    `select id, body, category, images, image_url, author_name, status, created_at
       from portal.posts where source = 'whatsapp' order by created_at desc limit 50`,
  );
  const logs: WhatsAppLogEntry[] = rows.map((r) => ({
    id: `wa_post_${r.id}`,
    timestamp: new Date(r.created_at).toISOString(),
    group_name: "WhatsApp group",
    sender_name: r.author_name ?? "Unknown",
    text: r.body,
    images: r.images?.length ? r.images : r.image_url ? [r.image_url] : [],
    category: r.category,
    post_id: r.id,
    status: STATUS_MAP[r.status] ?? "staged",
  }));
  return json({ logs });
}

export async function POST(req: Request) {
  if (!(await allowed(req))) return fail("Not allowed", 401);
  const payload = await req.json().catch(() => ({}));

  // Support both standard MilestoneOS/Whapi/Twilio payloads and quick simulation
  const rawText: string =
    payload.text ??
    payload.raw_text ??
    payload.body ??
    payload.messages?.[0]?.text?.body ??
    payload.message?.text ??
    "";

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return fail("Message text is required", 400);
  }

  const groupName: string =
    payload.group_name ??
    payload.source?.group_name ??
    payload.chat_name ??
    "#sales-all-stars";

  const senderName: string =
    payload.sender_name ??
    payload.source?.sender_name ??
    payload.sender?.name ??
    payload.profile?.name ??
    "Rohan Gupta (VP Sales)";

  const senderPhone: string =
    payload.sender_phone ??
    payload.source?.sender_phone ??
    payload.from ??
    "+91-98765-43210";

  // Media resolution
  let images: string[] = [];
  if (Array.isArray(payload.images)) {
    images = payload.images.map(String);
  } else if (typeof payload.image_url === "string" && payload.image_url) {
    images = [payload.image_url];
  } else if (typeof payload.media_url === "string" && payload.media_url) {
    images = [payload.media_url];
  } else if (typeof payload.content?.media_url === "string") {
    images = [payload.content.media_url];
  }

  // Fallback to a default demo image if none provided
  if (images.length === 0) {
    images = ["/api/media/posts/seed/02-acme-deal.webp"];
  }

  // Category inference
  let category: PostCategory =
    payload.category ??
    payload.content?.category?.toLowerCase() ??
    "client_win";

  const validCats: PostCategory[] = ["client_win", "office_update", "award", "announcement", "update"];
  if (!validCats.includes(category)) {
    category = "client_win";
  }

  // Draft headline/title if provided or generate from first sentence
  const title: string | null =
    payload.title ??
    payload.content?.headline ??
    payload.headline ??
    null;

  const authorDisplay = `${senderName}`;
  const taggedUserIds: number[] = Array.isArray(payload.tagged_user_ids) ? payload.tagged_user_ids : [];

  // Insert into portal.posts with source='whatsapp' and status='pending'
  const [row] = await q<{ id: number }>(
    `insert into portal.posts(
       title, body, category, image_url, images, author_name, source, status,
       tagged_user_ids, send_to_performance, published_at, created_at
     ) values($1, $2, $3, $4, $5, $6, 'whatsapp', 'pending', $7, false, now(), now())
     returning id`,
    [title, rawText.trim(), category, images[0] ?? null, images, authorDisplay, taggedUserIds],
  );

  // Notify HR admins and founders
  await q(
    `insert into portal.notifications(user_id, title, body, href)
     select id, 'New WhatsApp story waiting for review',
            $1, '/hr'
     from portal.users where role in ('hr_admin', 'founder')`,
    [`From ${senderName} in ${groupName}: "${rawText.slice(0, 70)}..."`],
  );

  // Echo the stored story back to the caller
  const logEntry: WhatsAppLogEntry = {
    id: `wa_evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    group_name: groupName,
    sender_name: senderName,
    sender_phone: senderPhone,
    text: rawText.trim(),
    images,
    category,
    post_id: row.id,
    status: "staged",
    raw_payload: payload,
  };

  return json(
    {
      ok: true,
      post_id: row.id,
      message: "Story staged in HR moderation queue",
      log: logEntry,
    },
    201,
  );
}

