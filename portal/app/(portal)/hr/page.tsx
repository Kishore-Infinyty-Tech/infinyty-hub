"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, useSession } from "@/lib/session";
import { CATEGORY, fmtDate, timeAgo } from "@/lib/format";
import type { Post, PostCategory } from "@/lib/types";
import { Avatar } from "@/components/fx/effects";
import {
  WhatsAppSimulatorButton,
  WhatsAppSimulatorModal,
} from "@/components/WhatsAppSimulator";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";

interface StagingResponse {
  posts: Post[];
  publishedHistory: Post[];
  stats: {
    pending_count: number;
    published_count: number;
    achievements_routed: number;
  };
}

const CATEGORIES: { id: PostCategory; label: string; icon: typeof Trophy }[] = [
  { id: "client_win", label: "Client Win", icon: Trophy },
  { id: "office_update", label: "Office Update", icon: Globe },
  { id: "award", label: "Govt Award / Felicitation", icon: Flame },
  { id: "announcement", label: "Announcement", icon: Sparkles },
  { id: "update", label: "General Update", icon: MessageSquare },
];

const PRESET_PHOTOS = [
  { url: "/api/media/posts/seed/02-acme-deal.webp", label: "Deal Signing / Client Win" },
  { url: "/api/media/posts/seed/03-hyderabad-office.webp", label: "Office / Workspace" },
  { url: "/api/media/posts/seed/04-state-award.webp", label: "State IT Award / Govt" },
  { url: "/api/media/posts/seed/05-prototype-loop.webp", label: "Software / Tech Release" },
  { url: "/api/media/posts/seed/01-welcome.webp", label: "Town Hall / Meeting" },
];

export default function HrPage() {
  const { user, users, role, refresh } = useSession();
  const toast = useToast();

  const [tab, setTab] = useState<"pending" | "published" | "stream">("pending");
  const [data, setData] = useState<StagingResponse | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Form states per post ID for inline editing
  const [edits, setEdits] = useState<
    Record<
      number,
      {
        title: string;
        body: string;
        category: PostCategory;
        images: string[];
        taggedIds: number[];
        sendToPerformance: boolean;
        milestoneTitle: string;
        milestoneImpact: string;
      }
    >
  >({});

  const [rejecting, setRejecting] = useState<Post | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    api<StagingResponse>("/api/hr/staging")
      .then((res) => {
        setData(res);
        // Initialize form states for new pending posts
        const nextEdits: typeof edits = {};
        for (const p of res.posts) {
          nextEdits[p.id] = {
            title: p.title || (p.body.length > 50 ? `${p.body.slice(0, 50)}…` : p.body),
            body: p.body,
            category: p.category,
            images: p.images && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : ["/api/media/posts/seed/02-acme-deal.webp"],
            taggedIds: p.tagged.map((t) => t.id),
            sendToPerformance: p.category === "client_win" || p.category === "award",
            milestoneTitle: p.title || (p.body.length > 40 ? p.body.slice(0, 40) : p.body),
            milestoneImpact: p.body.slice(0, 180),
          };
        }
        setEdits((prev) => ({ ...nextEdits, ...prev }));
      })
      .catch(() => setData({ posts: [], publishedHistory: [], stats: { pending_count: 0, published_count: 0, achievements_routed: 0 } }));
  }, []);

  useEffect(load, [load]);

  if (role !== "hr_admin" && role !== "founder") {
    return (
      <Card>
        <Empty
          title="HR Admins and the Founder only"
          hint="Sign in as an HR Admin (e.g. Kishore Reddy R) or the Founder (Aditi Vad) to access the Content Moderation Desk."
        />
      </Card>
    );
  }

  const updateEdit = (postId: number, patch: Partial<(typeof edits)[number]>) => {
    setEdits((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {
          title: "",
          body: "",
          category: "client_win",
          images: [],
          taggedIds: [],
          sendToPerformance: true,
          milestoneTitle: "",
          milestoneImpact: "",
        }),
        ...patch,
      },
    }));
  };

  const toggleTag = (postId: number, userId: number) => {
    const cur = edits[postId]?.taggedIds ?? [];
    const next = cur.includes(userId) ? cur.filter((id) => id !== userId) : [...cur, userId];
    updateEdit(postId, { taggedIds: next });
  };

  const handlePublish = async (post: Post) => {
    const e = edits[post.id];
    if (!e) return;

    setBusy(post.id);
    try {
      await api(`/api/hr/staging/${post.id}`, {
        method: "POST",
        json: {
          action: "publish",
          title: e.title,
          body: e.body,
          category: e.category,
          images: e.images,
          tagged_user_ids: e.taggedIds,
          send_to_performance: e.sendToPerformance,
          milestone_title: e.milestoneTitle,
          milestone_impact: e.milestoneImpact,
        },
      });

      toast(`Story published to the company feed!${e.sendToPerformance && e.taggedIds.length > 0 ? " Milestone routed to direct manager." : ""}`);
      load();
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await api(`/api/hr/staging/${rejecting.id}`, {
        method: "POST",
        json: {
          action: "reject",
          reason: rejectReason,
        },
      });
      toast("Story dismissed/archived");
      setRejecting(null);
      setRejectReason("");
      load();
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to archive", "error");
    } finally {
      setBusy(null);
    }
  };

  const posts = data?.posts ?? [];
  const publishedHistory = data?.publishedHistory ?? [];
  const stats = data?.stats ?? { pending_count: 0, published_count: 0, achievements_routed: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Moderation Desk"
        subtitle="Review incoming stories from internal WhatsApp groups, enrich content, tag major contributors, and route to performance reviews."
        actions={
          <div className="flex items-center gap-2">
            <WhatsAppSimulatorButton />
          </div>
        }
      />

      {/* Stats KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass hover-lift relative overflow-hidden rounded-3xl p-5">
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-200 opacity-20 blur-xl" />
          <p className="text-xs font-semibold text-slate-500">Awaiting HR Review</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">{stats.pending_count}</p>
            <span className="text-xs font-medium text-amber-600">from WhatsApp</span>
          </div>
        </div>

        <div className="glass hover-lift relative overflow-hidden rounded-3xl p-5">
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-300 opacity-20 blur-xl" />
          <p className="text-xs font-semibold text-slate-500">Broadcast to Portal Feed</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">{stats.published_count}</p>
            <span className="text-xs font-medium text-emerald-600">verified wins</span>
          </div>
        </div>

        <div className="glass hover-lift relative overflow-hidden rounded-3xl p-5">
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 opacity-20 blur-xl" />
          <p className="text-xs font-semibold text-slate-500">Sent to Performance Trackers</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">{stats.achievements_routed}</p>
            <span className="text-xs font-medium text-indigo-600">manager milestones</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl pb-2">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            {
              id: "pending",
              label: "Pending Review",
              count: stats.pending_count,
              icon: <ShieldCheck className="h-4 w-4 text-amber-500" />,
            },
            {
              id: "published",
              label: "Published History",
              count: publishedHistory.length,
              icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            },
            {
              id: "stream",
              label: "WhatsApp Webhook Stream",
              icon: <Radio className="h-4 w-4 text-cyan-500" />,
            },
          ]}
        />
      </div>

      {/* Tab 1: Pending Moderation */}
      {tab === "pending" && (
        <div className="space-y-6">
          {!data ? (
            <div className="space-y-4">
              <Skeleton className="h-72 rounded-3xl" />
              <Skeleton className="h-72 rounded-3xl" />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <Empty
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                title="Your moderation desk is all caught up"
                hint="When someone announces an achievement in a company WhatsApp group, it automatically appears here for you to verify, tag contributors, and publish."
                action={
                  <Button onClick={() => setSimulatorOpen(true)}>
                    <Zap className="h-4 w-4" /> Simulate an Incoming WhatsApp Story
                  </Button>
                }
              />
            </Card>
          ) : (
            posts.map((post) => {
              const e = edits[post.id] || {
                title: post.title || post.body.slice(0, 50),
                body: post.body,
                category: post.category,
                images: post.images && post.images.length ? post.images : ["/api/media/posts/seed/02-acme-deal.webp"],
                taggedIds: post.tagged.map((t) => t.id),
                sendToPerformance: true,
                milestoneTitle: post.title || post.body.slice(0, 40),
                milestoneImpact: post.body.slice(0, 180),
              };

              const taggedUsers = users.filter((u) => e.taggedIds.includes(u.id));

              return (
                <article
                  key={post.id}
                  className="animate-fade-up glass overflow-hidden rounded-3xl ring-1 ring-slate-200/80 transition-shadow hover:shadow-card"
                >
                  {/* WhatsApp Ingestion Meta Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-transparent px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-emerald-950">
                          Captured from WhatsApp Group:{" "}
                          <span className="font-mono text-emerald-700">
                            {post.author_name?.includes("#") ? post.author_name : `#sales-all-stars`}
                          </span>
                        </p>
                        <p className="text-[11px] text-emerald-700/80">
                          Sender: {post.author_name} · Ingested {timeAgo(post.published_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-50 text-amber-800 ring-amber-200">
                      Pending HR Review
                    </Badge>
                  </div>

                  <div className="p-6">
                    {/* Raw Captured Message Box */}
                    <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Raw WhatsApp Message Received
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        &ldquo;{post.body}&rdquo;
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                      {/* Left Column: Editable Post Fields */}
                      <div className="space-y-4">
                        <Field
                          label="Official Headline / Title"
                          hint="This will appear as the bold header on the company portal wall."
                        >
                          <Input
                            value={e.title}
                            onChange={(ev) => updateEdit(post.id, { title: ev.target.value })}
                            placeholder="e.g. Alex Johnson & Neha Iyer close $500k Acme Corp deal"
                          />
                        </Field>

                        <Field
                          label="Announcement Body (Edited for Portal)"
                          hint="Polish the message for company-wide broadcast."
                        >
                          <Textarea
                            rows={4}
                            value={e.body}
                            onChange={(ev) => updateEdit(post.id, { body: ev.target.value })}
                          />
                        </Field>

                        <div>
                          <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
                            Story Category
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => {
                              const active = e.category === cat.id;
                              const Icon = cat.icon;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => updateEdit(post.id, { category: cat.id })}
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                                    active
                                      ? "bg-indigo-600 text-white shadow-glow"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {cat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tag Major Contributors */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-900">
                              <Users className="h-4 w-4 text-indigo-600" />
                              Tag Major Contributors ({taggedUsers.length} selected)
                            </label>
                            <span className="text-[11px] text-slate-400">
                              Select employees who drove this milestone
                            </span>
                          </div>

                          {/* Selected Tags Chips */}
                          {taggedUsers.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                              {taggedUsers.map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-xs font-bold text-indigo-900 ring-1 ring-slate-200 shadow-sm"
                                >
                                  <Avatar name={u.name} src={u.avatar_url} size={20} />
                                  {u.name}
                                  <button
                                    type="button"
                                    onClick={() => toggleTag(post.id, u.id)}
                                    className="ml-0.5 rounded-full text-slate-400 hover:text-rose-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Employee Selector Grid */}
                          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5">
                            {users.map((u) => {
                              const checked = e.taggedIds.includes(u.id);
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => toggleTag(post.id, u.id)}
                                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                                    checked
                                      ? "bg-indigo-50 font-bold text-indigo-900"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <Avatar name={u.name} src={u.avatar_url} size={24} />
                                  <div className="min-w-0 flex-1">
                                    <span className="truncate block">{u.name}</span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {u.title} · {u.department}
                                    </span>
                                  </div>
                                  {checked && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Send to Performance Review Toggle */}
                        <div className="rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-cyan-glow/5 p-4">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={e.sendToPerformance}
                              onChange={(ev) =>
                                updateEdit(post.id, { sendToPerformance: ev.target.checked })
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-950">
                                <Trophy className="h-4 w-4 text-gold-500" />
                                Send to Performance Review Tracker
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                Automatically dispatches an approval task to each tagged contributor&apos;s direct manager. Once verified by the manager, it locks into their Performance Profile as a KPI milestone.
                              </p>
                            </div>
                          </label>

                          {e.sendToPerformance && (
                            <div className="mt-4 space-y-3 border-t border-indigo-100 pt-3">
                              <Field label="Milestone Title (for Review Ledger)">
                                <Input
                                  value={e.milestoneTitle}
                                  onChange={(ev) =>
                                    updateEdit(post.id, { milestoneTitle: ev.target.value })
                                  }
                                  placeholder="e.g. Closed $500k Acme Corp Annual Contract"
                                />
                              </Field>

                              <Field label="Business Impact / KPI Remarks">
                                <Input
                                  value={e.milestoneImpact}
                                  onChange={(ev) =>
                                    updateEdit(post.id, { milestoneImpact: ev.target.value })
                                  }
                                  placeholder="e.g. Largest single deal of Q4; 3-year recurring revenue locked in."
                                />
                              </Field>

                              {/* Manager Routing Preview */}
                              {taggedUsers.length > 0 && (
                                <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                                    Automated Manager Approval Routing:
                                  </p>
                                  <ul className="mt-1.5 space-y-1">
                                    {taggedUsers.map((u) => {
                                      const mgr = users.find((m) => m.id === u.manager_id);
                                      return (
                                        <li
                                          key={u.id}
                                          className="flex items-center justify-between text-xs text-slate-600"
                                        >
                                          <span className="font-semibold text-slate-800">{u.name}</span>
                                          <span className="flex items-center gap-1 text-[11px] text-indigo-700">
                                            routes to:{" "}
                                            <strong>{mgr ? mgr.name : "Direct Manager"}</strong>
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Media Preview & Actions */}
                      <div className="flex flex-col justify-between space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
                            Attached Photo Asset
                          </label>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {e.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={e.images[0]}
                                alt="Post photo"
                                className="h-44 w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-44 place-items-center text-xs text-slate-400">
                                <ImageIcon className="h-8 w-8 text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* Quick Photo Switcher */}
                          <div className="mt-2">
                            <Select
                              value={e.images[0] ?? ""}
                              onChange={(ev) => updateEdit(post.id, { images: [ev.target.value] })}
                              aria-label="Select photo"
                            >
                              {PRESET_PHOTOS.map((p) => (
                                <option key={p.url} value={p.url}>
                                  {p.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        {/* Moderation CTAs */}
                        <div className="space-y-2 border-t border-slate-200/80 pt-4">
                          <Button
                            className="w-full justify-center bg-brand-gradient text-white shadow-glow"
                            loading={busy === post.id}
                            onClick={() => handlePublish(post)}
                          >
                            <Send className="h-4 w-4" />
                            Approve & Publish to Hub
                          </Button>

                          <Button
                            variant="secondary"
                            className="w-full justify-center text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            disabled={busy === post.id}
                            onClick={() => {
                              setRejecting(post);
                              setRejectReason("");
                            }}
                          >
                            <X className="h-4 w-4" />
                            Reject / Archive
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Published History */}
      {tab === "published" && (
        <Card title="Recently Published WhatsApp Stories" padded={false}>
          {publishedHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No stories published from WhatsApp yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {publishedHistory.map((p) => (
                <div key={p.id} className="flex items-start gap-4 p-5 hover:bg-slate-50/70">
                  {p.images && p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0]}
                      alt="Story"
                      className="h-20 w-32 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={CATEGORY[p.category].badge}>{CATEGORY[p.category].label}</Badge>
                      <span className="text-xs text-slate-400">
                        Published {fmtDate(p.published_at)}
                      </span>
                      {p.reviewer_name && (
                        <span className="text-xs text-indigo-600">· Reviewed by {p.reviewer_name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-900">{p.title || p.body.slice(0, 60)}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{p.body}</p>

                    {p.tagged && p.tagged.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <Users className="h-3 w-3 text-indigo-500" />
                        <span>Tagged: {p.tagged.map((t) => t.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <Link href="/home">
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" /> View on Feed
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Live Webhook Stream */}
      {tab === "stream" && (
        <Card title="Live WhatsApp Gateway Ingestion Stream">
          <p className="mb-4 text-xs text-slate-500">
            Real-time webhook listener receiving JSON events from WhatsApp Multi-Device Gateway / Meta Cloud API at{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-bold text-indigo-700">
              POST /api/webhooks/whatsapp
            </code>
          </p>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setSimulatorOpen(true)}>
              <Zap className="h-3.5 w-3.5" /> Dispatch Test Webhook
            </Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-400">
            <p className="text-slate-400">{"// Ingestion listener status: ACTIVE (listening on port 3100)"}</p>
            <p className="text-slate-400">{"// Webhook URI: https://hub.infinyty.internal/api/webhooks/whatsapp"}</p>
            <p className="mt-2 text-cyan-300">
              Ready to receive WhatsApp group messages. Use the simulator button above to trigger live payloads during the demonstration!
            </p>
          </div>
        </Card>
      )}

      {/* Reject Modal */}
      <Modal
        open={!!rejecting}
        title="Archive / Reject WhatsApp Story"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy === rejecting?.id}
              onClick={handleReject}
            >
              Archive Story
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This post will be archived and will not appear on the company wall.
        </p>
        <Field label="Archive Reason (Optional)">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Duplicate announcement, internal test"
          />
        </Field>
      </Modal>

      {/* Simulator Modal */}
      <WhatsAppSimulatorModal
        open={simulatorOpen}
        onClose={() => {
          setSimulatorOpen(false);
          load();
        }}
      />
    </div>
  );
}
