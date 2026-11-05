"use client";

import { useSession } from "@/lib/session";
import { PostApprovals } from "@/components/PostApprovals";
import { MilestoneApprovals } from "@/components/MilestoneApprovals";
import { Card, Empty, PageHeader } from "@/components/ui";

export default function ApprovalsPage() {
  const { role } = useSession();
  if (role === "employee") {
    return (
      <Card>
        <Empty
          title="Managers and HR only"
          hint="Sign in as a manager, HR Admin or the Founder to review posts and milestones."
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Review what your team wants to share, and approve performance milestones."
      />
      <div className="space-y-6">
        {/* Performance milestones awaiting manager verification (Dev B track) */}
        <MilestoneApprovals />

        {/* Member-written posts waiting for publishing approval (Dev A track) */}
        <PostApprovals />
      </div>
    </>
  );
}
