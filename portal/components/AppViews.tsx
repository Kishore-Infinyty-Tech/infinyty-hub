"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, BadgeCheck, CircleDashed, ExternalLink, FlaskConical, Link2, Loader2, MessageSquareQuote, Power, RefreshCw, Target } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { fmtDate } from "@/lib/format";
import { hue } from "@/lib/icons";
import type { AppItem, Achievement } from "@/lib/types";
import { Avatar, CountUp } from "./fx/effects";
import { AppIconTile } from "./Launcher";
import { Badge, Button, Card, Empty, Select, Skeleton } from "./ui";

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? "http://localhost:3200";

function AppBar({ app, right }: { app: AppItem; right?: React.ReactNode }) {
  return (
    <div className="animate-fade-up mb-6 flex flex-wrap items-center gap-4">
      <AppIconTile app={app} size={52} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-slate-900">{app.name}</h1>
        <p className="text-sm text-slate-500">{app.tagline}</p>
      </div>
      {right}
    </div>
  );
}

/* ---------------------------- CRM: the real, running app ---------------------------- */
export function CrmView({ app }: { app: AppItem }) {
  const [state, setState] = useState<"checking" | "up" | "down">("checking");
  const [loaded, setLoaded] = useState(false);
  const probe = useCallback(() => {
    setState("checking");
    // no-cors: we only care whether anything answers, not what it says
    fetch(CRM_URL, { mode: "no-cors", cache: "no-store" }).then(() => setState("up")).catch(() => setState("down"));
  }, []);
  useEffect(probe, [probe]);

  return (
    <>
      <AppBar app={app} right={
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live app</Badge>
          <a href={CRM_URL} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5" />Open in new tab</Button></a>
        </div>
      } />
      {state === "down" ? (
        <Card>
          <Empty icon={<Power className="h-7 w-7" />} title="The CRM is not running yet" hint={`Start it with crm-website\\start.bat (website on ${CRM_URL}), then retry.`} action={<Button onClick={probe}><RefreshCw className="h-4 w-4" />Retry</Button>} />
        </Card>
      ) : (
        <div className="glass relative overflow-hidden rounded-3xl p-1.5">
          {(state === "checking" || !loaded) && <div className="shimmer absolute inset-1.5 grid place-items-center rounded-[20px]"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>}
          {state === "up" && <iframe title="Infinyty CRM" src={CRM_URL} onLoad={() => setLoaded(true)} className="relative block h-[calc(100vh-14rem)] min-h-[560px] w-full rounded-[20px] bg-white" />}
        </div>
      )}
    </>
  );
}

/* ---------------------------- Performance tracker (mock) ---------------------------- */
interface PerfData { user: { id: number; name: string; title: string; department: string; avatar_url: string | null; manager_name: string | null } | null; achievements: Achievement[] }

const STATUS = {
  approved: { label: "Verified", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: BadgeCheck, node: "from-emerald-500 to-teal-400" },
  pending: { label: "Awaiting manager", badge: "bg-amber-50 text-amber-700 ring-amber-200", Icon: CircleDashed, node: "from-amber-400 to-yellow-300" },
  rejected: { label: "Not added", badge: "bg-slate-100 text-slate-500 ring-slate-200", Icon: CircleDashed, node: "from-slate-400 to-slate-300" },
} as const;

export function PerformanceView({ app }: { app: AppItem }) {
  const { user, users, version } = useSession();
  const canPickPerson = user?.role !== "employee";
  const [personId, setPersonId] = useState<number | null>(null);
  const [data, setData] = useState<PerfData | null>(null);

  useEffect(() => { if (user) setPersonId(user.id); }, [user]);
  useEffect(() => {
    if (!personId) return;
    setData(null);
    api<PerfData>(`/api/performance/${personId}`).then(setData).catch(() => setData({ user: null, achievements: [] }));
  }, [personId, version]);

  const list = data?.achievements ?? [];
  const verified = list.filter((a) => a.status === "approved");
  const pending = list.filter((a) => a.status === "pending");
  const shown = canPickPerson ? list : list.filter((a) => a.status !== "rejected");
  const cats = Object.entries(verified.reduce<Record<string, number>>((m, a) => ({ ...m, [a.category]: (m[a.category] ?? 0) + 1 }), {}));

  return (
    <>
      <AppBar app={app} right={
        canPickPerson && (
          <div className="w-60"><Select value={personId ?? ""} onChange={(e) => setPersonId(Number(e.target.value))} aria-label="Employee">
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.id === user?.id ? " (you)" : ""}</option>)}
          </Select></div>
        )
      } />

      {!data ? (
        <div className="space-y-5"><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-[28rem] rounded-3xl" /></div>
      ) : !data.user ? (
        <Card><Empty title="Person not found" /></Card>
      ) : (
        <div className="space-y-6">
          {/* slim profile strip: who this is, at a glance */}
          <div className="bg-navy-gradient relative overflow-hidden rounded-3xl p-4 text-white shadow-lift sm:p-5">
            <div className="dot-grid absolute inset-0 opacity-25" />
            <span className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cyan-glow/25 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar name={data.user.name} src={data.user.avatar_url} size={56} ring />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold leading-tight">{data.user.name}</p>
                  <p className="truncate text-sm text-indigo-100">{data.user.title}</p>
                  <p className="truncate text-xs text-cyan-glow">{data.user.department}{data.user.manager_name ? ` · reports to ${data.user.manager_name}` : ""}</p>
                </div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="flex items-baseline gap-2 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15"><span className="text-2xl font-bold"><CountUp value={verified.length} /></span><span className="text-xs font-medium text-indigo-100">Verified</span></div>
                <div className="flex items-baseline gap-2 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15"><span className="text-2xl font-bold"><CountUp value={pending.length} /></span><span className="text-xs font-medium text-indigo-100">Awaiting approval</span></div>
              </div>
            </div>
          </div>

          {/* the timeline is the page */}
          <section className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-9">
            <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/30 to-cyan-glow/20 blur-3xl" />
            <div className="relative mb-8 flex flex-wrap items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"><Award className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Achievements timeline</h2>
                <p className="text-sm text-slate-500">Every verified milestone, in order. This is what feeds the review cycle.</p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200"><Target className="h-3 w-3" />Ready for review cycle</Badge>
            </div>
            {cats.length > 0 && (
              <div className="relative mb-8 flex flex-wrap gap-2">
                {cats.map(([c, n]) => <span key={c} className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{c} <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">{n}</span></span>)}
              </div>
            )}
            {shown.length === 0 ? (
              <Empty icon={<Award className="h-7 w-7" />} title="No milestones yet" hint="When HR tags this person on a story and their manager approves, it lands here." />
            ) : (
              <ol className="relative ml-5 space-y-8 border-l-[3px] border-indigo-100 pl-10 sm:ml-6 sm:pl-12">
                {shown.map((a) => {
                  const s = STATUS[a.status];
                  return (
                    <li key={a.id} className="animate-fade-up relative">
                      <span className={`absolute -left-[3.55rem] top-1 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-white shadow-lg ring-[6px] ring-white sm:-left-[4.05rem] ${s.node}`}><s.Icon className="h-6 w-6" /></span>
                      <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={s.badge}>{s.label}</Badge>
                          <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">{a.category}</Badge>
                          <span className="ml-auto text-sm font-semibold text-slate-400">{fmtDate(a.achieved_on)}</span>
                        </div>
                        <p className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{a.title}</p>
                        {a.impact && <p className="mt-1.5 text-base text-slate-600">{a.impact}</p>}
                        {a.manager_comment && <p className="mt-4 flex gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm italic text-slate-600"><MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{a.manager_comment}</p>}
                        {a.post_id && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><Link2 className="h-3.5 w-3.5" />Linked to a company news post</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
  );
}

/* ---------------------------- Other tools: polished demo previews ---------------------------- */
const PREVIEW: Record<string, { kpis: [string, string][]; head: string[]; rows: string[][] }> = {
  leave: { kpis: [["Annual leave left", "14 days"], ["Sick leave left", "6 days"], ["Pending requests", "2"], ["Team on leave today", "3"]], head: ["Type", "Dates", "Days", "Status"], rows: [["Annual leave", "12–14 Dec", "3", "Approved"], ["Sick leave", "02 Nov", "1", "Approved"], ["Annual leave", "26–27 Dec", "2", "Pending"]] },
  invoices: { kpis: [["Outstanding", "$182,400"], ["Paid this month", "$96,200"], ["Overdue", "$12,800"], ["Drafts", "5"]], head: ["Invoice", "Client", "Amount", "Status"], rows: [["INV-2041", "Acme Corp", "$48,000", "Sent"], ["INV-2040", "Northwind", "$22,500", "Paid"], ["INV-2039", "Globex", "$12,800", "Overdue"]] },
  payables: { kpis: [["Due this week", "$64,300"], ["Awaiting approval", "7 bills"], ["Paid this month", "$210,900"], ["Vendors", "86"]], head: ["Bill", "Vendor", "Amount", "Status"], rows: [["BILL-880", "CloudHost Ltd", "$18,200", "Approved"], ["BILL-879", "Office Supplies Co", "$2,140", "Pending"], ["BILL-878", "Legal Partners", "$9,000", "Paid"]] },
};
const GENERIC = { kpis: [["Open items", "12"], ["Completed this week", "34"], ["Needs attention", "3"], ["Active users", "128"]] as [string, string][], head: ["Item", "Owner", "Updated", "Status"], rows: [["Quarterly review", "People Ops", "Today", "In progress"], ["Policy refresh", "Admin", "Yesterday", "Done"], ["Vendor onboarding", "Finance", "2 days ago", "Pending"]] };

export function DemoView({ app }: { app: AppItem }) {
  const p = PREVIEW[app.id] ?? GENERIC;
  const h = hue(app.hue);
  return (
    <>
      <AppBar app={app} right={<Badge className="bg-amber-50 text-amber-700 ring-amber-200"><FlaskConical className="h-3 w-3" />Demo preview</Badge>} />
      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {p.kpis.map(([label, value]) => (
          <div key={label} className="glass hover-lift relative overflow-hidden rounded-3xl p-5">
            <span className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-25 blur-xl ${h.tile}`} />
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <Card title="Recent activity" className="mt-6" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200/60 text-xs uppercase tracking-wider text-slate-400">{p.head.map((c) => <th key={c} className="px-5 py-3 font-semibold">{c}</th>)}</tr></thead>
            <tbody>{p.rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40">{r.map((c, j) => <td key={j} className={`px-5 py-3.5 ${j === 0 ? "font-semibold text-slate-900" : "text-slate-600"}`}>{j === r.length - 1 ? <Badge className={`${h.soft} ${h.text} ring-transparent`}>{c}</Badge> : c}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-slate-400">Placeholder data for the demo. This screen is where the real {app.name} app plugs in.</p>
    </>
  );
}
