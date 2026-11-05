// The API contract shared with Dev B. Field names here are what the JSON looks like on the wire.

export type Role = "employee" | "manager" | "hr_admin" | "founder";
export type PostCategory = "client_win" | "office_update" | "award" | "announcement" | "update";
export type PostStatus = "pending" | "published" | "rejected";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  department: string | null;
  manager_id: number | null;
  /** Profile photo and cover photo. null means the default (initials, company-logo cover). */
  avatar_url?: string | null;
  cover_url?: string | null;
}

export interface AppItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  icon: string;
  hue: string;
  kind: "live" | "demo";
  url: string | null;
  featured: boolean;
  /** Computed for the current user from app_permissions. */
  accessible: boolean;
  /** An access request already sent by this user, if any. */
  request_status: "pending" | "approved" | "rejected" | null;
}

export interface Post {
  id: number;
  title: string | null;
  body: string;
  category: PostCategory;
  /** First photo (kept for older screens). Use `images` for all of them. */
  image_url: string | null;
  images: string[];
  author_id: number | null;
  author_name: string | null;
  author_title: string | null;
  author_avatar: string | null;
  source: string;
  status: PostStatus;
  pinned: boolean;
  published_at: string;
  updated_at: string | null;
  /** Why a post was not approved. */
  review_note: string | null;
  reviewer_name: string | null;
  /** Who has to approve this post (the author's manager). */
  approver_name: string | null;
  tagged: Pick<User, "id" | "name" | "title" | "avatar_url">[];
  send_to_performance: boolean;
  reactions: Record<string, number>;
  reaction_total: number;
  my_reaction: string | null;
  comment_count: number;
  /** reactions + 2 x comments: what the Trending tab sorts by. */
  trend_score: number;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PostComment {
  id: number;
  can_delete: boolean;
  body: string;
  created_at: string;
  user_id: number;
  user_name: string;
  user_title: string | null;
  user_avatar: string | null;
}

export interface Achievement {
  id: number;
  user_id: number;
  post_id: number | null;
  title: string;
  category: string;
  impact: string | null;
  status: "pending" | "approved" | "rejected";
  manager_comment: string | null;
  achieved_on: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}
