"use client";

import { useSession } from "@/lib/session";
import { DevBSlot } from "@/components/DevBSlot";
import { Card, Empty } from "@/components/ui";

export default function HrPage() {
  const { role } = useSession();
  if (role !== "hr_admin" && role !== "founder") return <Card><Empty title="HR Admins and the Founder only" hint="Sign in as an HR Admin or the Founder to moderate incoming stories." /></Card>;
  return <DevBSlot title="HR moderation queue" subtitle="Review WhatsApp stories, edit, categorise, tag contributors and publish." contract={["portal.posts (status = pending)", "portal.achievements", "portal.notifications"]} />;
}
