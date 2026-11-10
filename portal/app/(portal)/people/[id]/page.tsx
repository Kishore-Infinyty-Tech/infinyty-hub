"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Network, ShieldCheck, Trophy, Users } from "lucide-react";
import { api } from "@/lib/session";
import { CATEGORY, ROLE_LABEL } from "@/lib/format";
import type { OrgNode } from "@/lib/email";
import type { PostCategory } from "@/lib/types";
import { ProfileCover } from "@/components/ProfileCover";
import { Avatar } from "@/components/fx/effects";
import { Badge, Card, Empty, Skeleton } from "@/components/ui";

type Flat = Omit<OrgNode, "reports">;
interface Profile {
  person: Flat & { email: string; cover_url: string | null; manager_id: number | null };
  above: Flat[];
  tree: OrgNode;
  team_size: number;
  direct_reports: number;
  achievements: { id: number; title: string; category: PostCategory; impact: string | null; achieved_on: string }[];
  is_me: boolean;
}

const ROLE_TONE: Record<string, string> = {
  founder: "bg-amber-50 text-amber-700 ring-amber-200",
  hr_admin: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  manager: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  employee: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** One box in the chart. Click it to open that person's profile. */
function OrgBox({ n, current, small }: { n: Flat; current?: boolean; small?: boolean }) {
  const inner = (
    <>
      <Avatar name={n.name} src={n.avatar_url} size={small ? 34 : 44} />
      <div className="min-w-0">
        <p className={`truncate font-bold ${current ? "text-white" : "text-slate-900"} ${small ? "text-xs" : "text-sm"}`}>{n.name}</p>
        <p className={`truncate ${current ? "text-indigo-100" : "text-slate-500"} ${small ? "text-[11px]" : "text-xs"}`}>{n.title ?? ROLE_LABEL[n.role]}</p>
      </div>
      <span className={`ml-auto hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset sm:inline ${current ? "bg-white/15 text-white ring-white/30" : ROLE_TONE[n.role]}`}>{ROLE_LABEL[n.role]}</span>
    </>
  );
  const base = "flex w-full max-w-md items-center gap-3 rounded-2xl p-2.5 pr-3 text-left transition-all";
  if (current) return <div aria-current="page" className={`${base} bg-brand-gradient shadow-glow ring-2 ring-white`}>{inner}</div>;
  return <Link href={`/people/${n.id}`} className={`${base} bg-white ring-1 ring-slate-200/80 hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300`}>{inner}</Link>;
}

/** Everyone who reports (directly or further down) to this person, as an indented tree. */
function Branch({ nodes }: { nodes: OrgNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="ml-5 space-y-3 border-l-2 border-slate-200 pl-6 pt-3">
      {nodes.map((n) => (
        <li key={n.id} className="relative before:absolute before:-left-6 before:top-6 before:h-0.5 before:w-6 before:bg-slate-200">
          <OrgBox n={n} />
          <Branch nodes={n.reports} />
        </li>
      ))}
    </ul>
  );
}

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Profile>(`/api/people/${id}`)
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load this profile"); });
    return () => { live = false; };
  }, [id]);

  if (error) return <Empty title="Profile not found" hint={error} action={<Link href="/people" className="text-sm font-semibold text-indigo-600">Back to People</Link>} />;
  if (!data) return <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const { person: p, above, tree } = data;
  return (
    <div className="space-y-6">
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"><ArrowLeft className="h-4 w-4" />People</Link>

      <section className="glass-strong animate-fade-up overflow-hidden rounded-[1.75rem]">
        <div className="relative h-36 sm:h-48"><ProfileCover src={p.cover_url} /></div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-6 pb-6 sm:px-8">
          <div className="-mt-10 flex items-start gap-5">
            <Avatar name={p.name} src={p.avatar_url} size={96} ring className="!rounded-3xl text-3xl shadow-xl ring-4" />
            <div className="pt-12">
              <h1 className="text-2xl font-bold text-slate-900">{p.name}</h1>
              <p className="text-sm text-slate-500">{p.title}{p.department ? ` · ${p.department}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Badge className={ROLE_TONE[p.role]}><ShieldCheck className="h-3.5 w-3.5" />{ROLE_LABEL[p.role]}</Badge>
                <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Mail className="h-4 w-4" />{p.email}</a>
              </div>
            </div>
          </div>
          {data.is_me && <div className="pt-12"><Link href="/profile" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow ring-1 ring-slate-200 transition-all hover:-translate-y-0.5">Edit my profile</Link></div>}
        </div>
        <dl className="grid grid-cols-3 gap-3 border-t border-slate-200/60 bg-slate-50/50 px-6 py-5 sm:px-8">
          {[
            { label: "Direct reports", value: data.direct_reports, Icon: Users },
            { label: "People in their team", value: data.team_size, Icon: Network },
            { label: "Verified milestones", value: data.achievements.length, Icon: Trophy },
          ].map(({ label, value, Icon }) => (
            <div key={label}><dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-900">{value}</dd></div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title={<span className="flex items-center gap-2"><Network className="h-4 w-4 text-indigo-500" /> Organisation chart</span>}>
          <div>
            {above.map((a, i) => (
              <div key={a.id} className="flex flex-col items-start" style={{ marginLeft: i * 20 }}>
                <OrgBox n={a} small />
                <span className="ml-6 h-4 w-0.5 bg-slate-200" aria-hidden />
              </div>
            ))}
            <div style={{ marginLeft: above.length * 20 }}>
              <OrgBox n={tree} current />
              {tree.reports.length === 0
                ? <p className="ml-5 mt-3 border-l-2 border-slate-200 pl-6 text-sm text-slate-500">No one reports to {p.name.split(" ")[0]} yet.</p>
                : <Branch nodes={tree.reports} />}
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-400">Click anyone in the chart to open their profile.</p>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-indigo-500" /> Recent verified milestones</span>}>
          {data.achievements.length === 0 ? <p className="text-sm text-slate-500">No verified milestones yet.</p> : (
            <ul className="space-y-3">
              {data.achievements.map((a) => (
                <li key={a.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/60">
                  <p className="text-sm font-bold text-slate-900">{a.title}</p>
                  {a.impact && <p className="mt-0.5 text-xs text-slate-500">{a.impact}</p>}
                  <p className="mt-1.5 text-[11px] font-semibold text-indigo-600">{CATEGORY[a.category]?.label ?? "Milestone"}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><Building2 className="h-3.5 w-3.5" />{p.department ?? "Infinyty"}</p>
        </Card>
      </div>
    </div>
  );
}
