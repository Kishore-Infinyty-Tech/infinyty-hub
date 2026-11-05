"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AccessModal, useApps } from "@/components/Launcher";
import { CrmView, DemoView, PerformanceView } from "@/components/AppViews";
import { Card, Empty, Skeleton } from "@/components/ui";

export default function AppHostPage({ params }: PageProps<"/apps/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const { refresh } = useSession();
  const { apps } = useApps();

  if (!apps) return <Skeleton className="h-96 rounded-3xl" />;
  const app = apps.find((a) => a.id === id);
  if (!app) return <Card><Empty title="App not found" hint="This tool is not in the catalogue." /></Card>;

  // Everyone can see every app; this is where a restricted one turns into the request-access state.
  if (!app.accessible) return <AccessModal app={app} onClose={() => router.replace("/apps")} onSent={refresh} />;

  if (app.id === "crm") return <CrmView app={app} />;
  if (app.id === "performance") return <PerformanceView app={app} />;
  return <DemoView app={app} />;
}
