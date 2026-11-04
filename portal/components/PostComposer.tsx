"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock, ImagePlus, Loader2, Megaphone, X } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { CATEGORY, ROLE_LABEL } from "@/lib/format";
import { compressImage, fmtBytes } from "@/lib/compress";
import type { Post, PostCategory } from "@/lib/types";
import { Avatar } from "./fx/effects";
import { Button, Modal, useToast } from "./ui";

const MAX_IMAGES = 10;
const MAX_CHARS = 3000;

interface Item { key: string; preview: string; url?: string; error?: string; before?: number; after?: number }
let counter = 0;
const newKey = () => `img-${Date.now()}-${counter++}`;

/** Shrinks the photo in the browser, uploads it, and reports the size before and after. */
async function uploadFile(file: File): Promise<{ url: string; before: number; after: number }> {
  const small = await compressImage(file);
  const form = new FormData();
  form.set("file", small);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return { url: data.url as string, before: file.size, after: (data.bytes_after as number) ?? small.size };
}

/** The "Add post" popup. Also used to edit a post (pass `post`). */
export function PostComposer({ post, defaultCategory, onClose, onSaved }: { post?: Post; defaultCategory?: PostCategory; onClose: () => void; onSaved: (pending: boolean) => void }) {
  const { user, users } = useSession();
  const toast = useToast();
  const [text, setText] = useState(post?.body ?? "");
  const [category, setCategory] = useState<PostCategory>(post?.category ?? defaultCategory ?? "update");
  const [items, setItems] = useState<Item[]>((post?.images ?? []).map((u) => ({ key: newKey(), preview: u, url: u })));
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const direct = user?.role !== "employee";
  const manager = users.find((u) => u.id === user?.manager_id);
  // announcements are the Founder only, and an announcement stays an announcement
  const isAnnouncement = category === "announcement";
  const types: PostCategory[] = isAnnouncement ? ["announcement"] : ["update", "client_win", "award", "office_update"];

  const grow = () => { const el = area.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 320)}px`; } };
  useEffect(grow, [text]);
  // free the in-browser previews when the popup closes
  useEffect(() => () => items.forEach((i) => i.preview.startsWith("blob:") && URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const room = MAX_IMAGES - items.length;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (Array.from(list).length > room) toast(`Only ${MAX_IMAGES} photos fit in one post`, "error");
    const fresh = picked.map((f) => ({ file: f, item: { key: newKey(), preview: URL.createObjectURL(f) } as Item }));
    setItems((cur) => [...cur, ...fresh.map((x) => x.item)]);
    fresh.forEach(({ file, item }) =>
      uploadFile(file)
        .then((r) => setItems((cur) => cur.map((i) => (i.key === item.key ? { ...i, url: r.url, before: r.before, after: r.after } : i))))
        .catch((e) => setItems((cur) => cur.map((i) => (i.key === item.key ? { ...i, error: e instanceof Error ? e.message : "Upload failed" } : i)))),
    );
  };

  const uploading = items.some((i) => !i.url && !i.error);
  const failed = items.some((i) => i.error);
  const ready = (text.trim().length > 0 || items.some((i) => i.url)) && !uploading && text.length <= MAX_CHARS;

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const payload = { body: text, category, images: items.filter((i) => i.url).map((i) => i.url) };
      const r = post
        ? await api<{ pending: boolean }>(`/api/posts/${post.id}`, { method: "PATCH", json: payload })
        : await api<{ pending: boolean }>("/api/posts", { method: "POST", json: payload });
      toast(r.pending ? `Sent to ${manager?.name ?? "your manager"} for approval` : post ? "Post updated" : "Posted to the company feed");
      onSaved(r.pending);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post");
    } finally { setBusy(false); }
  };

  return (
    <Modal open wide title={post ? (isAnnouncement ? "Edit announcement" : "Edit post") : isAnnouncement ? "New announcement" : "Create post"} onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!ready}>{post ? "Save changes" : isAnnouncement ? "Announce to everyone" : direct ? "Post" : "Send for approval"}</Button>
        </>
      }>
      <div className="flex items-center gap-3">
        {user && <Avatar name={user.name} src={user.avatar_url} size={44} />}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user ? ROLE_LABEL[user.role] : ""} · {isAnnouncement ? "official announcement · everyone is notified" : "visible to the whole company"}</p>
        </div>
      </div>

      {!direct && (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          Your post is reviewed by <b>{manager?.name ?? "your manager"}</b> before it appears in the feed. You will get a notification when it is approved.
        </p>
      )}
      {error && <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

      <textarea
        ref={area}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
        maxLength={MAX_CHARS + 200}
        placeholder={`What would you like to share, ${user?.name.split(" ")[0] ?? ""}?`}
        className="block max-h-80 min-h-[96px] w-full resize-none rounded-2xl border-0 bg-transparent px-1 py-1 text-[17px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />

      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button key={t} type="button" onClick={() => setCategory(t)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-all ${category === t ? "bg-indigo-600 text-white ring-indigo-600 shadow-glow" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}>
            {t === "announcement" ? <Megaphone className="h-3 w-3" /> : <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY[t].dot}`} />}{CATEGORY[t].label}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className={`grid gap-2 ${items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {items.map((it, idx) => (
            <div key={it.key} className={`group relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 ${items.length === 1 ? "aspect-[16/9]" : "aspect-square"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview or private-bucket photo */}
              <img src={it.preview} alt="" className={`h-full w-full object-cover transition-opacity ${it.url ? "opacity-100" : "opacity-50"}`} />
              {!it.url && !it.error && <span className="absolute inset-0 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></span>}
              {it.error && <span className="absolute inset-0 grid place-items-center bg-rose-950/60 p-2 text-center text-xs font-semibold text-white">{it.error}</span>}
              {idx === 0 && items.length > 1 && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">Cover</span>}
              {it.before && it.after && it.before > it.after ? <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">{fmtBytes(it.before)} → {fmtBytes(it.after)}</span> : null}
              <button type="button" onClick={() => setItems((cur) => cur.filter((x) => x.key !== it.key))} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-slate-900/75 p-1.5 text-white opacity-90 transition-all hover:scale-110 hover:bg-rose-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={items.length >= MAX_IMAGES}
        onClick={() => file.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
        className={`flex w-full items-center gap-4 rounded-2xl border-2 border-dashed px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${over ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white/60 hover:border-indigo-400 hover:bg-indigo-50/60"}`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-md"><ImagePlus className="h-5 w-5" /></span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-800">{items.length ? "Add more photos" : "Add photos"}</span>
          <span className="block text-xs text-slate-500">Drag and drop or click. Up to {MAX_IMAGES} photos ({items.length}/{MAX_IMAGES}). They are compressed automatically.</span>
        </span>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </button>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{uploading ? "Uploading photos…" : failed ? "Remove the photo that failed, or try it again" : ""}</span>
        <span className={text.length > MAX_CHARS ? "font-bold text-rose-600" : ""}>{text.length}/{MAX_CHARS}</span>
      </div>
    </Modal>
  );
}
