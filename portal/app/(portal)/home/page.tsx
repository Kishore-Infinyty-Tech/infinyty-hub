"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, CalendarDays, Clock, Flame, Heart, ImagePlus, LayoutGrid, Lock, Megaphone, Newspaper, Plus, Trophy, TrendingUp } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { greeting, ROLE_LABEL } from "@/lib/format";
import { hueRgb } from "@/lib/icons";
import type { AppItem, Post, PostCategory } from "@/lib/types";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { AccessModal, AppIconTile, useAppOpener, useApps } from "@/components/Launcher";
import { Avatar, CountUp } from "@/components/fx/effects";
import { Sparkles } from "@/components/fx/Sparkles";
import { Button, Card, Empty, Skeleton, Tabs } from "@/components/ui";

type Filter = "all" | PostCategory;

const TAB_LABEL: Record<PostCategory, string> = { update: "Posts", client_win: "Client wins", award: "Awards", office_update: "Offices", announcement: "Notices" };

function Hero({ name, role, stories, reactions, tools }: { name: string; role: string; stories: number; reactions: number; tools: number }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const stats = [
    { icon: Newspaper, label: "Stories", value: stories, tone: "from-indigo-400 to-cyan-glow" },
    { icon: Heart, label: "Reactions", value: reactions, tone: "from-rose-400 to-orange-300" },
    { icon: LayoutGrid, label: "Tools for you", value: tools, tone: "from-gold-400 to-gold-300" },
  ];
  return (
    <section className="bg-navy-gradient animate-fade-up relative overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-40px_rgb(14_42_107/0.85)]">
      <div className="dot-grid absolute inset-0 opacity-[0.12]" />
      <Sparkles />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 90px)" }} />
      <div className="relative grid items-center gap-8 p-7 sm:p-9 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-100 ring-1 ring-white/20 backdrop-blur">
            <CalendarDays className="h-3.5 w-3.5 text-gold-300" />{today}<span className="text-white/40">·</span>{role}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl xl:text-[2.7rem]">
            {greeting()}, <span className="bg-gradient-to-r from-cyan-glow via-indigo-200 to-gold-300 bg-clip-text text-transparent">{name.split(" ")[0]}.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-indigo-100/85">Here is what the company has been celebrating, and every tool you use, in one place.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/apps" className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-900 shadow-xl transition-all hover:-translate-y-0.5">
              Open app launcher <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/apps/performance" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-all hover:bg-white/20">
              <TrendingUp className="h-4 w-4" /> My performance
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 xl:w-[390px]">
          {stats.map((s) => (
            <div key={s.label} className="group rounded-2xl bg-white/[0.09] p-4 ring-1 ring-white/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.14]">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${s.tone}`}><s.icon className="h-[18px] w-[18px]" /></span>
              <p className="font-display mt-3 text-2xl font-bold text-white"><CountUp value={s.value} /></p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200/80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickApps({ apps }: { apps: AppItem[] | null }) {
  const { open, blocked, close } = useAppOpener();
  const { refresh } = useSession();
  const featured = apps?.filter((a) => a.featured) ?? [];
  return (
    <Card title="Your apps" actions={<Link href="/apps" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">All apps <ArrowRight className="h-3.5 w-3.5" /></Link>} padded={false}>
      {!apps ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <ul className="p-2">
          {featured.map((a) => (
            <li key={a.id}>
              <button onClick={() => open(a)} style={{ "--h": hueRgb(a.accessible ? a.hue : "slate") } as CSSProperties} className="row-hover group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left">
                <span className="transition-transform duration-300 group-hover:scale-105"><AppIconTile app={a} size={42} locked={!a.accessible} /></span>
                <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-bold ${a.accessible ? "text-slate-900" : "text-slate-500"}`}>{a.name}</span><span className="block truncate text-xs text-slate-500">{a.accessible ? a.tagline : "Request access"}</span></span>
                {a.accessible ? <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" /> : <Lock className="h-4 w-4 text-slate-300" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <AccessModal app={blocked} onClose={close} onSent={refresh} />
    </Card>
  );
}

/** Who has been recognised most in the stories on the feed. */
function Spotlight({ posts }: { posts: Post[] }) {
  const top = useMemo(() => {
    const m = new Map<number, { id: number; name: string; title: string | null; avatar_url?: string | null; count: number }>();
    for (const p of posts) for (const t of p.tagged) { const e = m.get(t.id) ?? { ...t, count: 0 }; e.count++; m.set(t.id, e); }
    return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 4);
  }, [posts]);
  if (top.length === 0) return null;
  return (
    <Card title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-gold-500" />Spotlight</span>} padded={false}>
      <p className="px-5 pt-3 text-xs text-slate-500">People recognised in recent stories</p>
      <ul className="p-2">
        {top.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-amber-50/60">
            <span className="relative"><Avatar name={p.name} src={p.avatar_url} size={40} />{i === 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-gold-500 to-gold-300 text-white ring-2 ring-white"><Trophy className="h-2.5 w-2.5" /></span>}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.title}</span></span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">{p.count} {p.count === 1 ? "story" : "stories"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

type FeedTab = "latest" | "trending" | "announcements";

/** Founder only: the call to action on the Announcements tab. */
function AnnounceBar({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="animate-fade-up relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#091845] via-[#0e2a6b] to-[#12398f] p-4 shadow-lift sm:p-5">
      <div className="dot-grid absolute inset-0 opacity-[0.1]" />
      <span className="absolute -left-10 -top-16 h-44 w-44 rounded-full bg-gold-400/20 blur-3xl" />
      <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-300 text-white shadow-[0_14px_28px_-10px_rgb(244_169_10/0.7)]"><Megaphone className="h-6 w-6" /></span>
      <div className="relative min-w-0 flex-1"><p className="text-lg font-bold text-white">Make an announcement</p><p className="text-[13px] text-indigo-100/80">Everyone in the company is notified when you post.</p></div>
      <button onClick={onOpen} className="relative inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-900 shadow-xl transition-all hover:-translate-y-0.5"><Plus className="h-4 w-4" />New announcement</button>
    </section>
  );
}

/** The "share an update" bar that opens the post popup. Employees are told their post goes to their manager first. */
function ComposerBar({ onOpen }: { onOpen: () => void }) {
  const { user, users } = useSession();
  if (!user) return null;
  const manager = users.find((u) => u.id === user.manager_id);
  const review = user.role === "employee";
  return (
    <section className="glass animate-fade-up rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={user.name} src={user.avatar_url} size={46} />
        <button onClick={onOpen} className="min-w-0 flex-1 truncate rounded-full bg-slate-100/90 px-5 py-3 text-left text-[15px] text-slate-500 ring-1 ring-inset ring-slate-200 transition-all hover:bg-white hover:ring-indigo-300 hover:shadow-[0_0_0_5px_rgb(47_115_245/0.1)]">
          Share an update or a photo, {user.name.split(" ")[0]}…
        </button>
        <button onClick={onOpen} className="hidden items-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 sm:inline-flex"><Plus className="h-4 w-4" />Add post</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3">
        <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"><ImagePlus className="h-[18px] w-[18px] text-emerald-500" />Photos</button>
        <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-amber-50 hover:text-amber-700"><Trophy className="h-[18px] w-[18px] text-amber-500" />Share a win</button>
        {review && <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />Reviewed by {manager?.name ?? "your manager"} before it goes live</span>}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user, version, refresh } = useSession();
  const { apps } = useApps();
  const [latest, setLatest] = useState<Post[] | null>(null);
  const [trending, setTrending] = useState<Post[] | null>(null);
  const [announcements, setAnnouncements] = useState<Post[] | null>(null);
  const [tab, setTab] = useState<FeedTab>("latest");
  const [filter, setFilter] = useState<Filter>("all");
  const [composer, setComposer] = useState<{ post?: Post; category?: PostCategory } | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    api<{ posts: Post[] }>("/api/posts?sort=latest").then((r) => setLatest(r.posts)).catch(() => setLatest([]));
    api<{ posts: Post[] }>("/api/posts?sort=trending").then((r) => setTrending(r.posts)).catch(() => setTrending([]));
    api<{ posts: Post[] }>("/api/posts?sort=announcements").then((r) => setAnnouncements(r.posts)).catch(() => setAnnouncements([]));
  }, [user]);
  useEffect(load, [load, version]);
  // new posts from colleagues, HR and WhatsApp show up without a reload
  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);
  const changed = () => { load(); refresh(); };

  const source = tab === "latest" ? latest : tab === "trending" ? trending : announcements;
  const feed = useMemo(() => (source ?? []).filter((p) => filter === "all" || tab === "announcements" || p.category === filter), [source, filter, tab]);
  const published = useMemo(() => (latest ?? []).filter((p) => p.status === "published"), [latest]);
  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = {};
    for (const p of source ?? []) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [source]);

  if (!user) return null;
  return (
    <div className="space-y-6">
      <Hero
        name={user.name}
        role={ROLE_LABEL[user.role]}
        stories={published.length}
        reactions={published.reduce((n, p) => n + p.reaction_total, 0)}
        tools={(apps ?? []).filter((a) => a.accessible).length}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {tab === "announcements"
            ? user.role === "founder" && <AnnounceBar onOpen={() => setComposer({ category: "announcement" })} />
            : <ComposerBar onOpen={() => setComposer({})} />}

          <div className="glass rounded-2xl pb-3">
            <Tabs<FeedTab>
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "latest", label: "Latest", icon: <Clock className="h-4 w-4" /> },
                { id: "trending", label: "Trending", icon: <Flame className="h-4 w-4 text-orange-500" /> },
                { id: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4 text-amber-500" />, count: announcements?.length },
              ]}
            />
            {tab !== "announcements" && <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {(["all", "update", "client_win", "award", "office_update"] as Filter[]).map((k) => (
                <button key={k} onClick={() => setFilter(k)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset transition-all ${filter === k ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white/70 text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}>
                  {k === "all" ? "All" : TAB_LABEL[k]}{k !== "all" && counts[k] ? <span className={filter === k ? "text-white/80" : "text-slate-400"}>{counts[k]}</span> : null}
                </button>
              ))}
            </div>}
          </div>

          {source === null ? (
            <div className="space-y-5">{[0, 1].map((i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>
          ) : feed.length === 0 ? (
            <Card><Empty icon={tab === "trending" ? <Flame className="h-7 w-7" /> : tab === "announcements" ? <Megaphone className="h-7 w-7" /> : <Newspaper className="h-7 w-7" />} title={tab === "trending" ? "Nothing is trending yet" : tab === "announcements" ? "No announcements yet" : "Nothing here yet"} hint={tab === "trending" ? "Posts with the most reactions and comments in the last 30 days appear here." : tab === "announcements" ? "Official company announcements from the Founder appear here." : "Be the first to share something with the company."} action={tab === "announcements" ? (user.role === "founder" ? <Button onClick={() => setComposer({ category: "announcement" })}><Megaphone className="h-4 w-4" />New announcement</Button> : undefined) : <Button onClick={() => setComposer({})}><Plus className="h-4 w-4" />Add post</Button>} /></Card>
          ) : (
            <div className="stagger space-y-5">{feed.map((p, i) => <PostCard key={p.id} post={p} rank={tab === "trending" && filter === "all" ? i + 1 : undefined} onChanged={changed} onEdit={(post) => setComposer({ post })} />)}</div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:-mr-2 xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:py-1 xl:pb-4 xl:pr-2">
          <QuickApps apps={apps} />
          {published.length > 0 && <Spotlight posts={published} />}
        </aside>
      </div>

      {composer && <PostComposer post={composer.post} defaultCategory={composer.category} onClose={() => setComposer(null)} onSaved={changed} />}
    </div>
  );
}
