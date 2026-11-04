import type { PostCategory, Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = { employee: "Employee", manager: "Manager", hr_admin: "HR Admin", founder: "Founder" };

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Tailwind classes have to be written out in full, so every colour pair lives here. */
export const CATEGORY: Record<PostCategory, { label: string; badge: string; dot: string; ring: string }> = {
  client_win: { label: "Client Win", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", ring: "from-emerald-500 to-teal-400" },
  office_update: { label: "Office Update", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500", ring: "from-sky-500 to-cyan-400" },
  award: { label: "Award & Felicitation", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500", ring: "from-amber-500 to-yellow-300" },
  update: { label: "Post", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400", ring: "from-slate-600 to-indigo-400" },
  announcement: { label: "Announcement", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500", ring: "from-indigo-600 to-cyan-glow" },
};
