"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Building2, Camera, CircleDashed, ImagePlus, KeyRound, LayoutGrid, Loader2, LogOut, Mail, MessageCircle, Newspaper, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { ROLE_LABEL, timeAgo } from "@/lib/format";
import { compressImage, fmtBytes } from "@/lib/compress";
import { appIcon, hue } from "@/lib/icons";
import { ProfileCover } from "@/components/ProfileCover";
import { Avatar, CountUp } from "@/components/fx/effects";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Skeleton, useToast } from "@/components/ui";

interface Extra {
  manager: { id: number; name: string; title: string; avatar_url: string | null } | null;
  reports: { id: number; name: string; title: string; avatar_url: string | null }[];
  counts: { verified: number; pending: number; tagged_posts: number; comments: number; last_login_at: string | null };
  apps: { id: string; name: string; icon: string; hue: string }[];
  total_apps: number;
}

export default function ProfilePage() {
  const { user, reload, logout } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [extra, setExtra] = useState<Extra | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  const [photoBusy, setPhotoBusy] = useState<"avatar" | "cover" | null>(null);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarMenu) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-avatar-menu]") && setAvatarMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarMenu]);

  useEffect(() => { api<Extra>("/api/profile").then(setExtra).catch(() => undefined); }, [user?.id]);
  useEffect(() => { if (user) { setName(user.name); setPhone(user.phone ?? ""); } }, [user]);

  if (!user) return null;

  async function saveDetails() {
    setSaving(true);
    setDetailsError("");
    try {
      await api("/api/auth/profile", { method: "PATCH", json: { name, phone } });
      await reload();
      toast("Profile updated");
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  /** Upload a new profile photo or cover photo. The server crops it to fit and compresses it. */
  async function uploadPhoto(kind: "avatar" | "cover", file: File | undefined) {
    if (!file) return;
    setPhotoBusy(kind);
    try {
      const small = await compressImage(file, kind === "avatar" ? 1024 : 2000);
      const form = new FormData();
      form.set("file", small);
      form.set("kind", kind);
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      await reload();
      const saved = data.bytes_after && file.size > data.bytes_after ? ` (compressed ${fmtBytes(file.size)} → ${fmtBytes(data.bytes_after)})` : "";
      toast((kind === "avatar" ? "Profile photo updated" : "Cover photo updated") + saved);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function removePhoto(kind: "avatar" | "cover") {
    setPhotoBusy(kind);
    try {
      await api(`/api/profile/photo?kind=${kind}`, { method: "DELETE" });
      await reload();
      toast(kind === "avatar" ? "Profile photo removed" : "Cover reset to the Infinyty default");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function changePassword() {
    if (next !== again) return setPwError("The two new passwords do not match");
    setPwBusy(true);
    setPwError("");
    try {
      await api("/api/auth/password", { method: "POST", json: { current, next } });
      toast("Password changed");
      setCurrent(""); setNext(""); setAgain("");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setPwBusy(false);
    }
  }

  const c = extra?.counts;
  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" subtitle="Your details, access and password" />

      <section className="glass-strong animate-fade-up overflow-hidden rounded-[1.75rem]" style={{ animationDelay: "0.05s" }}>
        <div className="group/cover relative h-40 sm:h-52">
          <ProfileCover src={user.cover_url} />
          <div className="absolute right-4 top-4 flex gap-2 sm:right-5 sm:top-5">
            <button onClick={() => coverInput.current?.click()} disabled={photoBusy === "cover"} className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white disabled:opacity-60">
              {photoBusy === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-indigo-600" />}{user.cover_url ? "Change cover" : "Add cover photo"}
            </button>
            {user.cover_url && (
              <button onClick={() => removePhoto("cover")} disabled={photoBusy === "cover"} aria-label="Reset cover to default" title="Reset to the Infinyty cover" className="grid h-8 w-8 place-items-center self-center rounded-xl bg-white/90 text-slate-600 shadow-lg backdrop-blur transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
          <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { uploadPhoto("cover", e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-6 pb-6 sm:px-8">
          <div className="-mt-10 flex items-start gap-5">
            <div className="relative" data-avatar-menu>
              <Avatar name={user.name} src={user.avatar_url} size={96} ring className="!rounded-3xl text-3xl shadow-xl ring-4" />
              {photoBusy === "avatar" && <span className="absolute inset-0 grid place-items-center rounded-3xl bg-slate-950/45"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>}
              <button onClick={() => setAvatarMenu((o) => !o)} aria-label="Change profile photo" aria-expanded={avatarMenu} className="absolute -bottom-1.5 -right-1.5 grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white shadow-glow ring-4 ring-white transition-transform hover:scale-110"><Camera className="h-4 w-4" /></button>
              {avatarMenu && (
                <div className="glass-strong animate-scale-in absolute left-0 top-[calc(100%+0.5rem)] z-30 w-52 overflow-hidden rounded-2xl p-1.5">
                  <button onClick={() => { setAvatarMenu(false); avatarInput.current?.click(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><ImagePlus className="h-4 w-4" />{user.avatar_url ? "Upload a new photo" : "Upload a photo"}</button>
                  {user.avatar_url && <button onClick={() => { setAvatarMenu(false); removePhoto("avatar"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" />Remove photo</button>}
                </div>
              )}
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { uploadPhoto("avatar", e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <div className="pt-12">
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.title}{user.department ? ` · ${user.department}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200"><ShieldCheck className="h-3.5 w-3.5" />{ROLE_LABEL[user.role]}</Badge>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{user.email}</span>
              </div>
            </div>
          </div>
          <div className="pt-12"><Button variant="danger" onClick={() => logout().then(() => router.replace("/"))}><LogOut className="h-4 w-4" /> Sign out</Button></div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-slate-200/60 bg-slate-50/50 px-6 py-5 sm:grid-cols-4 sm:px-8">
          {[
            { icon: BadgeCheck, label: "Verified milestones", value: c?.verified, tone: "from-emerald-600 to-teal-300" },
            { icon: CircleDashed, label: "Awaiting approval", value: c?.pending, tone: "from-amber-500 to-yellow-300" },
            { icon: Newspaper, label: "Tagged in stories", value: c?.tagged_posts, tone: "from-indigo-600 to-cyan-glow" },
            { icon: MessageCircle, label: "Comments", value: c?.comments, tone: "from-violet-600 to-fuchsia-400" },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3.5 ring-1 ring-slate-200/60">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${x.tone} text-white shadow-md`}><x.icon className="h-5 w-5" /></span>
              <div>
                <dd className="font-display text-xl font-bold text-slate-900">{x.value == null ? "—" : <CountUp value={x.value} />}</dd>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{x.label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-indigo-500" /> Your details</span>}>
          <div className="space-y-4">
            {detailsError && <ErrorNote message={detailsError} />}
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 00000 00000" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" hint="Your email is your login."><Input value={user.email} disabled /></Field>
              <Field label="Department" hint="Managed by HR."><Input value={user.department ?? ""} disabled /></Field>
            </div>
            <div className="flex justify-end"><Button onClick={saveDetails} loading={saving} disabled={name.trim().length < 2}>Save changes</Button></div>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-500" /> Password</span>}>
          <div className="space-y-4">
            {pwError && <ErrorNote message={pwError} />}
            <Field label="Current password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" hint="At least 8 characters"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Repeat new password"><Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">{c?.last_login_at ? `Last sign-in ${timeAgo(c.last_login_at)}` : ""}</p>
              <Button onClick={changePassword} loading={pwBusy} disabled={!current || !next}>Change password</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-indigo-500" /> Your access</span>} actions={extra && <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">{extra.apps.length} of {extra.total_apps} apps</Badge>}>
          {!extra ? <Skeleton className="h-24" /> : (
            <ul className="flex flex-wrap gap-2">
              {extra.apps.map((a) => { const I = appIcon(a.icon); return (
                <li key={a.id} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <span className={`grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br text-white ${hue(a.hue).tile}`}><I className="h-3 w-3" /></span>{a.name}
                </li>
              ); })}
            </ul>
          )}
        </Card>

        <Card title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-500" /> Your team</span>}>
          {!extra ? <Skeleton className="h-24" /> : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Reports to</p>
                {extra.manager ? (
                  <div className="flex items-center gap-3"><Avatar name={extra.manager.name} src={extra.manager.avatar_url} size={36} /><div><p className="text-sm font-bold text-slate-900">{extra.manager.name}</p><p className="text-xs text-slate-500">{extra.manager.title}</p></div></div>
                ) : <p className="text-sm text-slate-500">No manager on record.</p>}
              </div>
              {extra.reports.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Users className="h-3.5 w-3.5" />Direct reports ({extra.reports.length})</p>
                  <ul className="grid gap-2 sm:grid-cols-2">{extra.reports.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/60"><Avatar name={r.name} src={r.avatar_url} size={30} /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{r.name}</p><p className="truncate text-[11px] text-slate-500">{r.title}</p></div></li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
