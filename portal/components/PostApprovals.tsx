"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, MessageSquareText, X } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { CATEGORY, timeAgo } from "@/lib/format";
import type { Post } from "@/lib/types";
import { Avatar } from "./fx/effects";
import { Gallery } from "./Gallery";
import { Badge, Button, Card, Empty, Field, Modal, Skeleton, Textarea, useToast } from "./ui";

/** Posts written by employees that are waiting for a decision. A manager sees their team's, HR and the Founder see everyone's. */
export function PostApprovals() {
  const { refresh, role } = useSession();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [rejecting, setRejecting] = useState<Post | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    api<{ posts: Post[] }>("/api/posts/pending").then((r) => setPosts(r.posts)).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  const decide = async (post: Post, action: "approve" | "reject") => {
    setBusy(post.id);
    try {
      await api(`/api/posts/${post.id}/review`, { method: "POST", json: { action, note } });
      toast(action === "approve" ? `Approved. ${post.author_name} can see it live now` : "Sent back to the author");
      setRejecting(null); setNote("");
      load(); refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Could not save", "error"); } finally { setBusy(null); }
  };

  return (
    <Card title="Posts waiting for review" actions={posts && posts.length > 0 ? <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{posts.length} waiting</Badge> : undefined}>
      {posts === null ? <Skeleton className="h-40" /> : posts.length === 0 ? (
        <Empty icon={<CheckCircle2 className="h-7 w-7" />} title="You are all caught up" hint={role === "manager" ? "When someone on your team writes a post, it appears here for you to approve." : "Employee posts waiting for approval appear here."} />
      ) : (
        <ul className="space-y-5">
          {posts.map((p) => (
            <li key={p.id} className="animate-fade-up overflow-hidden rounded-2xl bg-white/70 ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3 px-4 pt-4">
                <Avatar name={p.author_name ?? "?"} src={p.author_avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{p.author_name}</p>
                  <p className="text-xs text-slate-500">{p.author_title} · sent {timeAgo(p.published_at)}{p.updated_at ? " · edited" : ""}</p>
                </div>
                {p.category !== "update" && <Badge className={CATEGORY[p.category].badge}>{CATEGORY[p.category].label}</Badge>}
              </div>
              <p className="whitespace-pre-line px-4 py-3 text-[15px] leading-relaxed text-slate-700">{p.body || <span className="italic text-slate-400">Photos only</span>}</p>
              {p.images.length > 0 && <Gallery images={p.images} alt="Post photo" />}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200/60 bg-slate-50/60 px-4 py-3">
                <Button variant="secondary" onClick={() => { setRejecting(p); setNote(""); }} disabled={busy === p.id}><X className="h-4 w-4" />Reject</Button>
                <Button onClick={() => decide(p, "approve")} loading={busy === p.id}><Check className="h-4 w-4" />Approve and publish</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!rejecting} title="Send this post back?" onClose={() => setRejecting(null)}
        footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" onClick={() => rejecting && decide(rejecting, "reject")} loading={busy === rejecting?.id}>Reject post</Button></>}>
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{rejecting?.author_name} will be notified and can edit the post and send it again.</p>
        <Field label="Reason (optional, shown to the author)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add a photo of the event" maxLength={300} /></Field>
      </Modal>
    </Card>
  );
}
