"use client";

import { useEffect, useRef, useState } from "react";
import { Award, Clock, Flame, Heart, Megaphone, MessageCircle, MoreHorizontal, PartyPopper, Pencil, Pin, Send, Sparkles, ThumbsUp, Trash2, TrendingUp, XCircle } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { CATEGORY, timeAgo } from "@/lib/format";
import type { Post, PostComment } from "@/lib/types";
import { Avatar } from "./fx/effects";
import { Gallery } from "./Gallery";
import { Badge, Button, Modal, useToast } from "./ui";

const REACTIONS = [
  { kind: "like", label: "Like", Icon: ThumbsUp, active: "text-indigo-600", bubble: "bg-indigo-500" },
  { kind: "celebrate", label: "Celebrate", Icon: PartyPopper, active: "text-amber-500", bubble: "bg-amber-400" },
  { kind: "love", label: "Love", Icon: Heart, active: "text-rose-500", bubble: "bg-rose-500" },
] as const;

/** Category cover for company stories that have no photo. */
function Cover({ category }: { category: Post["category"] }) {
  const Icon = category === "award" ? Award : category === "announcement" ? Megaphone : category === "client_win" ? TrendingUp : Sparkles;
  return (
    <div className={`relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-gradient-to-br ${CATEGORY[category].ring} text-white`}>
      <div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <span className="absolute -left-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
      <Icon className="absolute -bottom-8 -right-6 h-52 w-52 rotate-[-12deg] opacity-[0.14]" strokeWidth={1.2} />
      <span className="relative grid h-20 w-20 place-items-center rounded-[1.6rem] bg-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_20px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-white/40 backdrop-blur-md"><Icon className="h-9 w-9 drop-shadow" strokeWidth={1.8} /></span>
    </div>
  );
}

function Comments({ postId, onChanged }: { postId: number; onChanged: () => void }) {
  const { user } = useSession();
  const toast = useToast();
  const [items, setItems] = useState<PostComment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const load = () => api<{ comments: PostComment[] }>(`/api/posts/${postId}/comments`).then((r) => setItems(r.comments)).catch(() => setItems([]));
  useEffect(() => { load(); box.current?.focus(); }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api(`/api/posts/${postId}/comments`, { method: "POST", json: { body: text } });
      setText(""); await load(); onChanged();
    } catch (e) { toast(e instanceof Error ? e.message : "Could not comment", "error"); } finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    await api(`/api/posts/${postId}/comments/${id}`, { method: "DELETE" }).catch(() => undefined);
    await load(); onChanged();
  };

  return (
    <div className="animate-fade-up space-y-3 border-t border-slate-200/60 bg-slate-50/60 px-5 py-4">
      {items === null ? <div className="shimmer h-10 rounded-xl" /> : items.map((c) => (
        <div key={c.id} className="group/c flex gap-3">
          <Avatar name={c.user_name} src={c.user_avatar} size={32} />
          <div className="min-w-0 rounded-2xl rounded-tl-md bg-white px-3.5 py-2 ring-1 ring-slate-200/70">
            <p className="text-xs font-bold text-slate-900">{c.user_name} <span className="font-medium text-slate-400">· {timeAgo(c.created_at)}</span></p>
            <p className="text-sm text-slate-700">{c.body}</p>
          </div>
          {c.can_delete && <button onClick={() => remove(c.id)} aria-label="Delete comment" className="self-center rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover/c:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      ))}
      <div className="flex items-center gap-3">
        {user && <Avatar name={user.name} src={user.avatar_url} size={32} />}
        <input ref={box} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm ring-1 ring-inset ring-slate-300/90 transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_0_5px_rgb(47_115_245/0.12)]" />
        <Button size="sm" onClick={send} loading={busy} disabled={!text.trim()} aria-label="Send comment"><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

/** "⋯" menu with Edit and Delete, shown only to people who may do those things. */
function OwnerMenu({ post, onEdit, onDelete }: { post: Post; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-post-menu]") && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!post.can_edit && !post.can_delete) return null;
  return (
    <div className="relative" data-post-menu>
      <button onClick={() => setOpen((o) => !o)} aria-label="Post options" aria-expanded={open} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"><MoreHorizontal className="h-5 w-5" /></button>
      {open && (
        <div className="glass-strong animate-scale-in absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-2xl p-1.5">
          {post.can_edit && <button onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><Pencil className="h-4 w-4" />Edit post</button>}
          {post.can_delete && <button onClick={() => { setOpen(false); onDelete(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" />Delete post</button>}
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, onChanged, onEdit, rank }: { post: Post; onChanged: () => void; onEdit: (p: Post) => void; rank?: number }) {
  const { user } = useSession();
  const toast = useToast();
  const [showComments, setShowComments] = useState(false);
  const [more, setMore] = useState(false);
  const [pop, setPop] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cat = CATEGORY[post.category];
  const live = post.status === "published";
  const mine = REACTIONS.find((r) => r.kind === post.my_reaction);
  const top = REACTIONS.filter((r) => post.reactions[r.kind]).sort((a, b) => post.reactions[b.kind] - post.reactions[a.kind]).slice(0, 3);
  const long = post.body.length > 300;
  const images = post.images.length ? post.images : post.image_url ? [post.image_url] : [];
  const chip = post.category !== "update" && (
    <span className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-lg backdrop-blur"><span className={`h-2 w-2 rounded-full ${cat.dot}`} />{cat.label}</span>
  );

  const react = async (kind: string) => {
    if (!user || !live) return;
    setPop(true); setTimeout(() => setPop(false), 450);
    await api(`/api/posts/${post.id}/react`, { method: "POST", json: { kind } }).catch(() => undefined);
    onChanged();
  };
  const remove = async () => {
    setDeleting(true);
    try { await api(`/api/posts/${post.id}`, { method: "DELETE" }); toast("Post deleted"); onChanged(); setConfirm(false); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not delete", "error"); } finally { setDeleting(false); }
  };

  return (
    <article className="glass hover-lift overflow-hidden rounded-3xl">
      {rank && (
        <div className={`flex items-center gap-2 px-5 py-2 text-xs font-bold ${rank === 1 ? "bg-gradient-to-r from-amber-100 via-orange-50 to-transparent text-amber-800" : "bg-gradient-to-r from-slate-100 to-transparent text-slate-600"}`}>
          <Flame className={`h-4 w-4 ${rank === 1 ? "text-orange-500" : "text-slate-400"}`} />#{rank} trending · {post.trend_score} points from {post.reaction_total} reactions and {post.comment_count} comments
        </div>
      )}
      {post.category === "announcement" && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#091845] via-[#0e2a6b] to-[#12398f] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-300"><Megaphone className="h-4 w-4" />Official announcement{post.pinned ? " · pinned" : ""}</div>
      )}
      {post.status === "pending" && (
        <div className="flex items-center gap-2.5 bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200/70"><Clock className="h-4 w-4 shrink-0" />Waiting for {post.approver_name ?? "approval"}. Only you can see this until it is approved.</div>
      )}
      {post.status === "rejected" && (
        <div className="flex items-start gap-2.5 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200/70"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Not approved{post.reviewer_name ? ` by ${post.reviewer_name}` : ""}{post.review_note ? `: “${post.review_note}”` : ""}. Edit it and send it again, or delete it.</span></div>
      )}

      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
        <Avatar name={post.author_name ?? "Infinyty"} src={post.author_avatar} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{post.author_name ?? "Company"}{post.author_title ? <span className="font-medium text-slate-400"> · {post.author_title}</span> : null}</p>
          <p className="text-xs text-slate-500">{timeAgo(post.published_at)}{post.updated_at ? " · edited" : ""}{post.source === "whatsapp" ? " · via WhatsApp" : ""}</p>
        </div>
        {post.pinned && <Badge className="bg-amber-50 text-amber-700 ring-amber-200"><Pin className="h-3 w-3" />Pinned</Badge>}
        {images.length === 0 && post.category !== "update" && <Badge className={cat.badge}><span className={`h-1.5 w-1.5 rounded-full ${cat.dot}`} />{cat.label}</Badge>}
        <OwnerMenu post={post} onEdit={() => onEdit(post)} onDelete={() => setConfirm(true)} />
      </header>

      <div className="px-5 pb-4">
        {post.title && <h3 className="text-lg font-bold leading-snug text-slate-900">{post.title}</h3>}
        <p className={`whitespace-pre-line leading-relaxed ${post.title ? "mt-1.5 text-sm text-slate-600" : "text-[15px] text-slate-700"} ${long && !more ? "line-clamp-4" : ""}`}>{post.body}</p>
        {long && <button onClick={() => setMore((m) => !m)} className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">{more ? "Show less" : "See more"}</button>}
        {post.tagged.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Major contributors</span>
            {post.tagged.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100"><Avatar name={t.name} src={t.avatar_url} size={22} />{t.name}</span>
            ))}
          </div>
        )}
      </div>

      {images.length > 0 ? (
        <Gallery images={images} alt={post.title ?? post.body.slice(0, 40)} overlay={chip || undefined} />
      ) : post.source !== "member" ? (
        <div className="relative"><Cover category={post.category} />{chip}</div>
      ) : null}

      {live && (
        <>
          <div className="flex items-center justify-between px-5 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              {top.length > 0 && <span className="flex -space-x-1.5">{top.map((r) => <span key={r.kind} className={`grid h-5 w-5 place-items-center rounded-full text-white ring-2 ring-white ${r.bubble}`}><r.Icon className="h-2.5 w-2.5" /></span>)}</span>}
              {post.reaction_total > 0 ? `${post.reaction_total} reactions` : "Be the first to react"}
            </span>
            <button onClick={() => setShowComments((s) => !s)} className="font-medium hover:text-indigo-600">{post.comment_count} comment{post.comment_count === 1 ? "" : "s"}</button>
          </div>
          <div className="mt-2 flex items-center gap-1 border-t border-slate-200/60 px-3 py-1.5">
            <div className="group/react relative">
              <button onClick={() => react(mine?.kind ?? "like")} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-indigo-50 ${mine ? mine.active : "text-slate-600"}`}>
                {mine ? <mine.Icon className={`h-[18px] w-[18px] ${pop ? "animate-scale-in" : ""}`} fill="currentColor" fillOpacity={0.15} /> : <ThumbsUp className="h-[18px] w-[18px]" />}
                {mine ? mine.label : "React"}
              </button>
              <div className="glass-strong pointer-events-none absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full p-1.5 opacity-0 transition-all duration-200 group-hover/react:pointer-events-auto group-hover/react:-translate-y-1 group-hover/react:opacity-100">
                {REACTIONS.map((r) => (
                  <button key={r.kind} onClick={() => react(r.kind)} aria-label={r.label} title={r.label} className={`grid h-9 w-9 place-items-center rounded-full text-white transition-transform hover:scale-125 ${r.bubble}`}><r.Icon className="h-[18px] w-[18px]" /></button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><MessageCircle className="h-[18px] w-[18px]" />Comment</button>
          </div>
          {showComments && <Comments postId={post.id} onChanged={onChanged} />}
        </>
      )}

      <Modal open={confirm} title="Delete this post?" onClose={() => setConfirm(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Keep it</Button><Button variant="danger" onClick={remove} loading={deleting}><Trash2 className="h-4 w-4" />Delete</Button></>}>
        <p className="text-sm leading-relaxed text-slate-600">This removes the post, its photos, reactions and comments for everyone. It cannot be undone.</p>
      </Modal>
    </article>
  );
}
