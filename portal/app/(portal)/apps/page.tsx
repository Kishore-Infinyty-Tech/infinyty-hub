"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSession } from "@/lib/session";
import { AccessModal, AppTile, useAppOpener, useApps } from "@/components/Launcher";
import { Empty, Input, PageHeader, Skeleton, Tabs } from "@/components/ui";

export default function AppsPage() {
  const { apps, reload } = useApps();
  const { user } = useSession();
  const { open, blocked, close } = useAppOpener();
  const [cat, setCat] = useState("core");
  const [text, setText] = useState("");

  // Core first, then each category, and the full list last
  const categories = useMemo(() => ["core", ...Array.from(new Set((apps ?? []).map((a) => a.category))), "all"], [apps]);
  const shown = useMemo(() => {
    const n = text.trim().toLowerCase();
    return (apps ?? []).filter((a) => (n || cat === "all" || (cat === "core" ? a.featured : a.category === cat)) && (!n || `${a.name} ${a.tagline} ${a.category}`.toLowerCase().includes(n)));
  }, [apps, cat, text]);
  const mine = (apps ?? []).filter((a) => a.accessible).length;

  return (
    <>
      <PageHeader
        title="App launcher"
        subtitle={apps ? `${apps.length} tools · you have access to ${mine} as ${user?.name.split(" ")[0]}` : "Loading tools…"}
        actions={
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find an app…" className="pl-10" />
          </div>
        }
      />
      <div className="glass mb-6 rounded-2xl pb-3">
        <Tabs value={cat} onChange={setCat} tabs={categories.map((c) => ({ id: c, label: c === "all" ? "All apps" : c === "core" ? "Core" : c, count: (apps ?? []).filter((a) => (c === "all" ? true : c === "core" ? a.featured : a.category === c)).length }))} />
      </div>

      {!apps ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
      ) : shown.length === 0 ? (
        <Empty title="No app matches" hint="Try a different word or category." />
      ) : (
        <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((a) => <AppTile key={a.id} app={a} onOpen={open} />)}
        </div>
      )}
      <AccessModal app={blocked} onClose={close} onSent={reload} />
    </>
  );
}
