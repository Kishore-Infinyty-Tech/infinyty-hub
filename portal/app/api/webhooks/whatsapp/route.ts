import { fail, json, q } from "@/lib/db";
import type { PostCategory } from "@/lib/types";

export interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  group_name: string;
  sender_name: string;
  sender_phone?: string;
  text: string;
  images: string[];
  category: PostCategory;
  post_id: number;
  status: "staged" | "published" | "rejected";
  raw_payload?: unknown;
}

// In-memory ring buffer for the live demo webhook stream inspector (stores up to 50 recent events)
const g = globalThis as unknown as { __whatsappLogs?: WhatsAppLogEntry[] };
const logs = (g.__whatsappLogs ??= []);

export function recordLog(entry: WhatsAppLogEntry) {
  logs.unshift(entry);
  if (logs.length > 50) logs.pop();
}

export function updateLogStatus(postId: number, status: "published" | "rejected") {
  const item = logs.find((l) => l.post_id === postId);
  if (item) item.status = status;
}

export async function GET() {
  return json({ logs });
}

export async function POST(req: Request) {
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

  // Log to in-memory stream for live inspection
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
  recordLog(logEntry);

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

