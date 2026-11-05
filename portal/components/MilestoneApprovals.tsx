"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Link2,
  MessageSquareQuote,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { api, useSession } from "@/lib/session";
import { fmtDate } from "@/lib/format";
import type { PendingMilestone } from "@/app/api/approvals/milestones/route";
import { Avatar } from "./fx/effects";
import { Badge, Button, Card, Empty, Field, Modal, Skeleton, Textarea, useToast } from "./ui";

export function MilestoneApprovals() {
  const { user, refresh, role } = useSession();
  const toast = useToast();
  const [milestones, setMilestones] = useState<PendingMilestone[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState<PendingMilestone | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(() => {
    api<{ milestones: PendingMilestone[] }>("/api/approvals/milestones")
      .then((r) => setMilestones(r.milestones))
      .catch(() => setMilestones([]));
  }, []);

  useEffect(load, [load]);

  const setComment = (id: number, val: string) => {
    setComments((prev) => ({ ...prev, [id]: val }));
  };

  const decide = async (m: PendingMilestone, action: "approve" | "reject", customComment?: string) => {
    setBusy(m.id);
    const comment = customComment ?? comments[m.id] ?? "";
    try {
      await api(`/api/approvals/milestones/${m.id}`, {
        method: "POST",
        json: { action, comment },
      });

      if (action === "approve") {
        toast(`Verified milestone for ${m.employee_name}! Credited to Performance Tracker.`);
      } else {
        toast(`Milestone rejected for ${m.employee_name}.`, "error");
      }

      setRejecting(null);
      setRejectNote("");
      load();
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to record approval decision", "error");
    } finally {
      setBusy(null);
    }
  };

  const isGlobalModerator = role === "hr_admin" || role === "founder";

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-gold-500" />
          <span>Performance Milestones (Awaiting Manager Verification)</span>
        </span>
      }
      actions={
        milestones && milestones.length > 0 ? (
          <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
            {milestones.length} waiting for KPI credit
          </Badge>
        ) : undefined
      }
    >
      {milestones === null ? (
        <Skeleton className="h-44" />
      ) : milestones.length === 0 ? (
        <Empty
          icon={<CheckCircle2 className="h-7 w-7 text-emerald-500" />}
          title="All performance milestones reviewed"
          hint={
            role === "manager"
              ? "When HR tags your team members in significant company announcements and checks 'Send to Performance Review', they appear here for your verification."
              : "No pending performance milestones in the review queue."
          }
        />
      ) : (
        <ul className="space-y-6">
          {milestones.map((m) => {
            const currentComment =
              comments[m.id] ??
              "Outstanding contribution. Verified and added as a key KPI achievement for review cycle.";

            return (
              <li
                key={m.id}
                className="animate-fade-up overflow-hidden rounded-2xl bg-white/80 ring-1 ring-slate-200/80 transition-shadow hover:shadow-card"
              >
                {/* Employee Info Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.employee_name} src={m.employee_avatar} size={42} ring />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {m.employee_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.employee_title} · {m.employee_department}
                        {isGlobalModerator && m.manager_name ? (
                          <span className="font-semibold text-indigo-600">
                            {" "}
                            (Reports to: {m.manager_name})
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                      <Target className="h-3 w-3" />
                      {m.category}
                    </Badge>
                    <span className="text-xs text-slate-400">{fmtDate(m.achieved_on)}</span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Milestone Details */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900">{m.title}</h3>
                    {m.impact && (
                      <p className="text-sm leading-relaxed text-slate-600">
                        <span className="font-semibold text-slate-700">Business Impact: </span>
                        {m.impact}
                      </p>
                    )}
                  </div>

                  {/* Attached News Post Reference */}
                  {m.post_id && (
                    <div className="mt-4 rounded-xl border border-slate-200/70 bg-gradient-to-r from-indigo-50/50 via-slate-50/50 to-transparent p-3.5">
                      <div className="flex items-start gap-3">
                        {m.post_images && m.post_images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.post_images[0]}
                            alt="Story media"
                            className="h-16 w-24 shrink-0 rounded-lg object-cover shadow-sm"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                            <Link2 className="h-3.5 w-3.5" />
                            Linked Company Story (HR Approved)
                          </p>
                          <p className="mt-0.5 truncate text-sm font-bold text-slate-800">
                            {m.post_title ?? m.post_body?.slice(0, 50)}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {m.post_body}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manager Evaluative Remarks */}
                  <div className="mt-4">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <MessageSquareQuote className="h-3.5 w-3.5 text-indigo-500" />
                      Manager KPI Evaluative Note (Appears on Employee&apos;s Review Ledger):
                    </label>
                    <input
                      value={comments[m.id] ?? ""}
                      onChange={(e) => setComment(m.id, e.target.value)}
                      placeholder="e.g. Outstanding client conversion. Primary contributor to Q4 ARR targets."
                      className="w-full rounded-xl border-0 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 ring-1 ring-inset ring-slate-200 transition-shadow focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === m.id}
                    onClick={() => {
                      setRejecting(m);
                      setRejectNote("");
                    }}
                  >
                    <X className="h-3.5 w-3.5 text-slate-500" />
                    Decline Milestone
                  </Button>

                  <Button
                    size="sm"
                    loading={busy === m.id}
                    onClick={() => decide(m, "approve")}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-500 hover:to-teal-500"
                  >
                    <Award className="h-3.5 w-3.5" />
                    Verify & Credit KPI
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Decline Milestone Dialog */}
      <Modal
        open={!!rejecting}
        title="Decline Performance Milestone"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy === rejecting?.id}
              onClick={() => rejecting && decide(rejecting, "reject", rejectNote)}
            >
              Decline Milestone
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Decline adding this achievement to{" "}
          <strong className="text-slate-900">{rejecting?.employee_name}</strong>
          &apos;s verified performance record.
        </p>
        <Field label="Reason (shown to the employee)">
          <Textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Needs higher individual attribution or separate project milestone credit."
          />
        </Field>
      </Modal>
    </Card>
  );
}

