"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { ArrowUpRight, Check, Clock, Lock, ShieldAlert } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { appIcon, hue, hueRgb, HUE_RGB } from "@/lib/icons";
import type { AppItem } from "@/lib/types";
import { Button, Field, Modal, Textarea, useToast } from "./ui";

export function useApps() {
  const { user, version, refresh } = useSession();
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const load = useCallback(() => {
    if (!user) return;
    api<{ apps: AppItem[] }>(`/api/apps?userId=${user.id}`).then((r) => setApps(r.apps)).catch(() => setApps([]));
  }, [user]);
  useEffect(load, [load, version]);
  return { apps, reload: () => { load(); refresh(); } };
}

export function AppIconTile({ app, size = 56, locked }: { app: AppItem; size?: number; locked?: boolean }) {
  const Icon = appIcon(app.icon);
  return (
    <span
      className={`app-icon shrink-0 bg-gradient-to-br ${hue(app.hue).tile} ${locked ? "is-locked" : ""}`}
      style={{ width: size, height: size, borderRadius: size * 0.34, "--h": hueRgb(app.hue) } as CSSProperties}
    >
      <Icon className="relative z-[1] drop-shadow-[0_2px_3px_rgb(0_0_0/0.25)]" style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.9} />
    </span>
  );
}

export function AppTile({ app, onOpen }: { app: AppItem; onOpen: (a: AppItem) => void }) {
  const locked = !app.accessible;
  // locked apps get a neutral slate ring instead of their brand colour, so hover never promises access
  const rgb = locked ? HUE_RGB.slate : hueRgb(app.hue);
  const follow = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <button onClick={() => onOpen(app)} onMouseMove={follow} style={{ "--h": rgb } as CSSProperties} className="app-tile group flex h-full flex-col items-start gap-4 p-5 text-left">
      <div className="flex w-full items-start justify-between">
        <AppIconTile app={app} size={52} locked={locked} />
        {app.kind === "live" && !locked ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live</span>
        ) : locked ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
            {app.request_status === "pending" ? <><Clock className="h-3 w-3" />Requested</> : <><Lock className="h-3 w-3" />Restricted</>}
          </span>
        ) : (
          <span className="tile-go"><ArrowUpRight className="h-4 w-4" /></span>
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-base font-bold leading-snug tracking-tight ${locked ? "text-slate-600" : "text-slate-900"}`}>{app.name}</p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{app.tagline}</p>
      </div>
      <div className="mt-auto flex h-5 w-full items-center justify-between pt-1">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400"><span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${rgb})` }} />{app.category}{app.featured && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">CORE</span>}</span>
        {locked && app.request_status !== "pending" && <span className="text-[11px] font-bold text-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">Request access →</span>}
      </div>
    </button>
  );
}

/** The "Access Required" state for an app the person's role does not include. */
export function AccessModal({ app, onClose, onSent }: { app: AppItem | null; onClose: () => void; onSent: () => void }) {
  const { user } = useSession();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setReason(""), [app]);
  if (!app || !user) return null;
  const pending = app.request_status === "pending";

  const send = async () => {
    setBusy(true);
    try {
      await api(`/api/apps/${app.id}/request`, { method: "POST", json: { userId: user.id, reason } });
      toast(`Access request for ${app.name} sent to HR`);
      onSent();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send request", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Access required"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Not now</Button>
          {!pending && <Button onClick={send} loading={busy}><ShieldAlert className="h-4 w-4" />Request access</Button>}
        </>
      }
    >
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-cyan-glow/10 p-4 ring-1 ring-indigo-100">
        <div className="relative"><AppIconTile app={app} size={60} locked /><span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-white shadow-glow ring-2 ring-white"><Lock className="h-3.5 w-3.5" /></span></div>
        <div className="min-w-0"><p className="font-bold text-slate-900">{app.name}</p><p className="text-sm text-slate-500">{app.tagline}</p></div>
      </div>
      {pending ? (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200"><Clock className="mt-0.5 h-4 w-4 shrink-0" />Your request is with HR. You will get a notification once it is reviewed.</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-slate-600">Your current role does not include <b>{app.name}</b>. Tell HR why you need it and they will review your request.</p>
          <Field label="Why do you need access? (optional)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I am covering vendor payments while Priya is on leave" /></Field>
        </>
      )}
    </Modal>
  );
}

/** Click behaviour shared by the launcher page and the home page: open if allowed, otherwise ask. */
export function useAppOpener() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<AppItem | null>(null);
  const open = (a: AppItem) => (a.accessible ? router.push(`/apps/${a.id}`) : setBlocked(a));
  return { open, blocked, close: () => setBlocked(null) };
}

export function CheckBadge() {
  return <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>;
}
