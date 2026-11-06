"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Check, ChevronRight, ClipboardCheck, Home, LayoutGrid, LogOut, Menu, Search, ShieldCheck, Sparkles, TrendingUp, UserRound, Users, X } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { ROLE_LABEL, timeAgo } from "@/lib/format";
import { appIcon, hue } from "@/lib/icons";
import type { AppItem, Notification, Role } from "@/lib/types";
import { Logo } from "./Logo";
import { Avatar, BrandLoader } from "./fx/effects";

const NAV: { href: string; label: string; icon: typeof Home; roles?: Role[] }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/apps", label: "App Launcher", icon: LayoutGrid },
  { href: "/apps/performance", label: "Performance", icon: TrendingUp },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck, roles: ["manager", "hr_admin", "founder"] },
  { href: "/hr", label: "HR Moderation", icon: ShieldCheck, roles: ["hr_admin", "founder"] },
  { href: "/people", label: "People", icon: Users, roles: ["manager", "hr_admin", "founder"] },
];

const ROLES: Role[] = ["founder", "hr_admin", "manager", "employee"];

/** Segmented "Current view" switch: picks a representative person for the role. */
function RoleSwitcher() {
  const { users, user, switchTo, demo } = useSession();
  if (!demo) return null;
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Viewing as</span>
      <div className="flex gap-0.5 rounded-xl bg-slate-100/90 p-0.5 ring-1 ring-slate-200/80">
        {ROLES.map((r) => {
          const active = user?.role === r;
          return (
            <button
              key={r}
              onClick={() => { const pick = users.find((u) => u.role === r); if (pick && !active) switchTo(pick.id); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${active ? "bg-brand-gradient text-white shadow-glow" : "text-slate-500 hover:text-indigo-700"}`}
            >
              {ROLE_LABEL[r]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Notifications() {
  const { user, version } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const load = useCallback(() => {
    if (!user) return;
    api<{ notifications: Notification[] }>(`/api/notifications?userId=${user.id}`).then((r) => setItems(r.notifications)).catch(() => undefined);
  }, [user]);
  useEffect(load, [load, version]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-notif]") && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" data-notif>
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unread && user) api("/api/notifications", { method: "POST", json: { userId: user.id } }).then(() => setTimeout(load, 1500)).catch(() => undefined); }}
        aria-label={`${unread} unread notifications`}
        className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 animate-pulse-glow place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="glass-strong animate-scale-in absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl">
          <p className="border-b border-slate-200/70 px-4 py-3 text-sm font-bold text-slate-900">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href && n.href !== "/" ? n.href : "/home"} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-indigo-50/70">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-slate-200" : "bg-indigo-500"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{n.title}</span>
                      {n.body && <span className="block text-xs text-slate-500">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { users, user, switchTo, demo, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-user-menu]") && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!user) return null;
  return (
    <div className="relative" data-user-menu>
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="rounded-xl p-0.5 transition-transform hover:scale-105"><Avatar name={user.name} src={user.avatar_url} size={36} /></button>
      {open && (
        <div className="glass-strong animate-scale-in absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl p-1.5">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={user.name} src={user.avatar_url} size={40} />
            <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{user.name}</p><p className="truncate text-xs font-medium text-indigo-600">{ROLE_LABEL[user.role]}{user.title && user.title.toLowerCase() !== ROLE_LABEL[user.role].toLowerCase() ? ` · ${user.title}` : ""}</p></div>
          </div>
          <div className="my-1 h-px bg-slate-200/70" />
          <Link href="/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><UserRound className="h-4 w-4" /> Profile & password</Link>
          {demo && (
            <>
              <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Demo: switch person</p>
              <ul className="max-h-52 overflow-y-auto">
                {users.map((u) => (
                  <li key={u.id}>
                    <button onClick={() => { void switchTo(u.id); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-indigo-50">
                      <Avatar name={u.name} src={u.avatar_url} size={26} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{u.name}</span><span className="block text-[11px] text-slate-500">{ROLE_LABEL[u.role]}</span></span>
                      {u.id === user.id && <Check className="h-4 w-4 text-indigo-600" />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="my-1 h-px bg-slate-200/70" />
          <button onClick={() => logout().then(() => router.replace("/"))} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Ctrl+K: jump to a page or open any app. */
function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useSession();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!open || !user) return;
    setText("");
    api<{ apps: AppItem[] }>(`/api/apps?userId=${user.id}`).then((r) => setApps(r.apps)).catch(() => undefined);
  }, [open, user]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  const needle = text.trim().toLowerCase();
  const results = useMemo(() => {
    const pages = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role))).map((n) => ({ key: n.href, label: n.label, hint: "Page", href: n.href, Icon: n.icon, tone: "from-indigo-600 to-cyan-glow" }));
    const list = apps.map((a) => ({ key: a.id, label: a.name, hint: a.accessible ? a.category : `${a.category} · Request access`, href: `/apps/${a.id}`, Icon: appIcon(a.icon), tone: hue(a.hue).tile }));
    return [...pages, ...list].filter((r) => !needle || `${r.label} ${r.hint}`.toLowerCase().includes(needle)).slice(0, 9);
  }, [apps, needle, user]);
  if (!open) return null;
  return (
    <div className="animate-fade-in fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/45 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-strong animate-scale-in w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4">
          <Search className="h-5 w-5 text-indigo-500" />
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { router.push(results[0].href); onClose(); } }} placeholder="Search apps and pages…" className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">Nothing matches “{text}”.</li>}
          {results.map((r) => (
            <li key={r.key}>
              <button onClick={() => { router.push(r.href); onClose(); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${r.tone} text-white shadow-md`}><r.Icon className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{r.label}</span><span className="block text-xs text-slate-500">{r.hint}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, loading, version } = useSession();
  const [waiting, setWaiting] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  // how many posts wait for this person to review (managers, HR and the Founder)
  useEffect(() => {
    if (!user || user.role === "employee") { setWaiting(0); return; }
    api<{ posts: unknown[] }>("/api/posts/pending").then((r) => setWaiting(r.posts.length)).catch(() => setWaiting(0));
  }, [user, version, pathname]);
  // signed out (or session expired): back to the sign-in page
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="aurora" />
        <BrandLoader size={96} />
      </div>
    );
  }

  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const isActive = (href: string) => (href === "/apps" ? pathname === "/apps" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-6 pb-4 pt-6"><Link href="/home" aria-label="Home"><Logo height={34} priority /></Link></div>
      <p className="shrink-0 px-6 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Infinyty Hub</p>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${active ? "bg-brand-gradient text-white shadow-glow" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
              <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
              {label}
              {href === "/approvals" && waiting > 0 && <span className={`ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}>{waiting}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 shrink-0 rounded-2xl bg-navy-gradient p-4 text-white [@media(max-height:760px)]:hidden">
        <Sparkles className="h-5 w-5 text-gold-300" />
        <p className="mt-2 text-sm font-bold">Share a win</p>
        <p className="mt-0.5 text-xs leading-relaxed text-indigo-100/90">Post achievements to the company WhatsApp group. HR publishes them here.</p>
      </div>
      <Link href="/profile" className={`group m-3 mt-0 flex shrink-0 items-center gap-3 rounded-2xl p-3 ring-1 transition-all ${pathname.startsWith("/profile") ? "bg-brand-gradient text-white shadow-glow ring-transparent" : "bg-gradient-to-br from-indigo-50 to-white ring-indigo-100/80 hover:shadow-md hover:ring-indigo-300"}`}>
        <Avatar name={user.name} src={user.avatar_url} size={40} ring />
        <div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${pathname.startsWith("/profile") ? "text-white" : "text-slate-900"}`}>{user.name}</p><p className={`text-xs font-medium ${pathname.startsWith("/profile") ? "text-indigo-100" : "text-indigo-600"}`}>{ROLE_LABEL[user.role]} · Profile</p></div>
        <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${pathname.startsWith("/profile") ? "text-white" : "text-slate-400"}`} />
      </Link>
    </div>
  );

  return (
    <>
      <div className="aurora" />
      <div className="min-h-screen min-w-0 md:pl-72">
        <aside className="glass-strong fixed bottom-4 left-4 top-4 z-30 hidden w-64 overflow-hidden rounded-3xl md:block">{sidebar}</aside>
        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <aside className="glass-strong animate-slide-in absolute inset-y-3 left-3 w-72 overflow-hidden rounded-3xl">{sidebar}</aside>
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="glass-strong flex w-full max-w-7xl items-center gap-3 rounded-2xl px-3 py-2 sm:mx-auto">
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-900/5 md:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            <button onClick={() => setPaletteOpen(true)} aria-label="Search apps and pages" className="group relative min-w-0 flex-1 rounded-2xl bg-gradient-to-r from-slate-200 via-indigo-200 to-cyan-glow/50 p-px text-left shadow-sm transition-all duration-300 hover:from-indigo-500 hover:via-cyan-glow hover:to-gold-400 sm:max-w-md">
              <span className="flex items-center gap-3 rounded-[15px] bg-white py-2 pl-2 pr-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-md transition-transform duration-300 group-hover:scale-110"><Search className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">Search apps and pages</span>
                <span className="hidden items-center gap-1 sm:flex"><kbd className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">Ctrl</kbd><kbd className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">K</kbd></span>
              </span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <RoleSwitcher />
              <span className="mx-1 hidden h-6 w-px bg-slate-200 lg:block" />
              <Notifications />
              <UserMenu />
            </div>
          </div>
        </header>
        <main key={pathname} className="page-enter mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">{children}</main>
      </div>
      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
