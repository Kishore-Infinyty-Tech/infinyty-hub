"use client";

import { Trophy } from "lucide-react";
import { useSession } from "@/lib/session";
import { PostApprovals } from "@/components/PostApprovals";
import { Card, Empty, PageHeader } from "@/components/ui";

export default function ApprovalsPage() {
  const { role } = useSession();
  if (role === "employee") return <Card><Empty title="Managers and HR only" hint="Sign in as a manager, HR Admin or the Founder to review posts and milestones." /></Card>;
  return (
    <>
      <PageHeader title="Approvals" subtitle="Review what your team wants to share, and approve performance milestones." />
      <div className="space-y-6">
        <PostApprovals />
        {/* Dev B's screen: HR-flagged achievements waiting for the manager (portal.achievements, status = pending). */}
        <Card title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-gold-500" />Performance milestones</span>}>
          <Empty icon={<Trophy className="h-7 w-7" />} title="Built by the workflow track" hint="Milestones HR flags for the performance record will be approved here. It reads portal.achievements where status is pending." />
        </Card>
      </div>
    </>
  );
}
