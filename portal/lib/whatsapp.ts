import type { PostCategory } from "./types";

/** One inbound WhatsApp story as shown in the webhook inspector. Built from portal.posts so every server instance sees the same list. */
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
