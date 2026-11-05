"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  Flame,
  MessageSquare,
  Radio,
  Send,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { api, useSession } from "@/lib/session";
import type { PostCategory } from "@/lib/types";
import type { WhatsAppLogEntry } from "@/app/api/webhooks/whatsapp/route";
import { Badge, Button, Field, Input, Modal, Select, Textarea, useToast } from "./ui";

interface Preset {
  id: string;
  badge: string;
  icon: typeof Trophy;
  group_name: string;
  sender_name: string;
  sender_phone: string;
  category: PostCategory;
  headline: string;
  text: string;
  image_url: string;
  tagged_names: string[];
}

const PRESETS: Preset[] = [
  {
    id: "acme-deal",
    badge: "Enterprise Deal ($500k)",
    icon: Trophy,
    group_name: "#sales-all-stars",
    sender_name: "Rohan Gupta (VP Sales)",
    sender_phone: "+91-98765-43210",
    category: "client_win",
    headline: "Alex Johnson & Neha Iyer close $500k Acme Corp deal",
    text: "Team!! Huge milestone today — Alex Johnson and Neha Iyer just officially closed the $500k Acme Corp annual contract after 6 months of negotiations! 3-year enterprise analytics deal locked in! 🚀🎉",
    image_url: "/api/media/posts/seed/02-acme-deal.webp",
    tagged_names: ["Alex Johnson", "Neha Iyer"],
  },
  {
    id: "hyderabad-office",
    badge: "Office Expansion",
    icon: Building2,
    group_name: "#city-expansion",
    sender_name: "Karan Mehra (Head of Infra)",
    sender_phone: "+91-98400-11223",
    category: "office_update",
    headline: "New Hyderabad Innovation Hub Opens 1 Week Early",
    text: "Our new 12,000 sq ft Hyderabad innovation hub is officially live! Delivered 1 week ahead of schedule by Sana Qureshi and the operations team. 80 workstations & demo lab ready! 🏢✨",
    image_url: "/api/media/posts/seed/03-hyderabad-office.webp",
    tagged_names: ["Sana Qureshi"],
  },
  {
    id: "state-award",
    badge: "Govt Felicitation",
    icon: Flame,
    group_name: "#leadership",
    sender_name: "Aditi Vad (Founder)",
    sender_phone: "+91-98100-99887",
    category: "award",
    headline: "Infinyty Honoured at State Digital Excellence Awards",
    text: "Proud to announce Infinyty was felicitated by the State IT Department for excellence in citizen-facing analytics! Outstanding technical leadership by Vikram Rao and Arjun Nair across 14 districts! 🏛️🥇",
    image_url: "/api/media/posts/seed/04-state-award.webp",
    tagged_names: ["Vikram Rao", "Arjun Nair"],
  },
  {
    id: "crm-prototype",
    badge: "Rapid Engineering",
    icon: Code2,
    group_name: "#engineering-releases",
    sender_name: "Rhea Kapoor (Eng Manager)",
    sender_phone: "+91-99800-44556",
    category: "client_win",
    headline: "Kishore Reddy ships CRM feedback loop in 9 days",
    text: "Kishore Reddy shipped the prototype-and-feedback loop in record time (9 days flat)! Sales is already demoing it live with prospective enterprise clients. ⚡💻",
    image_url: "/api/media/posts/seed/05-prototype-loop.webp",
    tagged_names: ["Kishore Reddy R"],
  },
];

export function WhatsAppSimulatorButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Simulate WhatsApp Achievement"
        className={`group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_4px_16px_-4px_rgba(16,185,129,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_24px_-4px_rgba(6,182,212,0.6)] active:scale-[0.98] ${
          className ?? ""
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-200 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <Zap className="h-3.5 w-3.5 fill-white text-white" />
        <span className="tracking-wide">Simulate WhatsApp</span>
      </button>

      <WhatsAppSimulatorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function WhatsAppSimulatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { users, switchTo, role, refresh } = useSession();

  const [tab, setTab] = useState<"presets" | "custom" | "stream">("presets");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<WhatsAppLogEntry[]>([]);

  // Custom form state
  const [customGroup, setCustomGroup] = useState("#sales-all-stars");
  const [customSender, setCustomSender] = useState("Rohan Gupta (VP Sales)");
  const [customPhone, setCustomPhone] = useState("+91-98765-43210");
  const [customCategory, setCustomCategory] = useState<PostCategory>("client_win");
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState("/api/media/posts/seed/02-acme-deal.webp");

  const loadLogs = () => {
    api<{ logs: WhatsAppLogEntry[] }>("/api/webhooks/whatsapp")
      .then((r) => setLogs(r.logs))
      .catch(() => undefined);
  };

  useEffect(() => {
    if (open) loadLogs();
  }, [open, tab]);

  const dispatch = async (payload: Record<string, unknown>, successTitle: string) => {
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; post_id: number }>("/api/webhooks/whatsapp", {
        method: "POST",
        json: payload,
      });

      toast(successTitle);
      refresh();
      loadLogs();

      // Offer quick jump to HR review
      if (role !== "hr_admin" && role !== "founder") {
        const hrUser = users.find((u) => u.role === "hr_admin") ?? users.find((u) => u.role === "founder");
        if (hrUser) {
          await switchTo(hrUser.id);
        }
      }
      onClose();
      router.push("/hr");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to simulate message", "error");
    } finally {
      setBusy(false);
    }
  };

  const firePreset = async (p: Preset) => {
    const taggedIds = users
      .filter((u) => p.tagged_names.some((name) => u.name.toLowerCase().includes(name.toLowerCase())))
      .map((u) => u.id);

    await dispatch(
      {
        group_name: p.group_name,
        sender_name: p.sender_name,
        sender_phone: p.sender_phone,
        category: p.category,
        title: p.headline,
        text: p.text,
        image_url: p.image_url,
        tagged_user_ids: taggedIds,
      },
      `Captured from ${p.group_name}! Staged for HR Moderation.`,
    );
  };

  const fireCustom = async () => {
    if (!customText.trim()) return;
    await dispatch(
      {
        group_name: customGroup,
        sender_name: customSender,
        sender_phone: customPhone,
        category: customCategory,
        text: customText,
        image_url: customImage,
      },
      `Captured custom message from ${customGroup}! Staged for HR Moderation.`,
    );
  };

  return (
    <Modal
      open={open}
      wide
      title="⚡ WhatsApp Ingestion Pipeline Simulator"
      onClose={onClose}
    >
      <div className="-mt-1 mb-4 flex items-center justify-between border-b border-slate-200/70 pb-3">
        <p className="text-xs text-slate-500">
          Simulate incoming messages captured from internal WhatsApp announcement groups.
        </p>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setTab("presets")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              tab === "presets" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1-Click Presets
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              tab === "custom" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Custom Message
          </button>
          <button
            onClick={() => setTab("stream")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              tab === "stream" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Radio className="h-3 w-3 text-emerald-500" />
            Live Webhook Stream ({logs.length})
          </button>
        </div>
      </div>

      {tab === "presets" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        <Icon className="h-3 w-3" />
                        {p.badge}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{p.group_name}</span>
                    </div>

                    <p className="mt-2.5 text-sm font-bold text-slate-900">{p.headline}</p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                      &ldquo;{p.text}&rdquo;
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-medium text-slate-700">{p.sender_name}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-indigo-500" />
                        {p.tagged_names.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      className="w-full justify-between"
                      loading={busy}
                      onClick={() => firePreset(p)}
                    >
                      <span>⚡ Ingest This Win</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Demo Walkthrough Tip:</span> Clicking any preset triggers an inbound webhook, places the story in the <code className="rounded bg-slate-200 px-1 py-0.5 text-indigo-700">Pending HR Moderation</code> staging queue, and switches your session to HR Admin to moderate and route it!
          </div>
        </div>
      )}

      {tab === "custom" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp Group Name">
              <Input
                value={customGroup}
                onChange={(e) => setCustomGroup(e.target.value)}
                placeholder="#sales-all-stars"
              />
            </Field>

            <Field label="Category Suggestion">
              <Select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as PostCategory)}
              >
                <option value="client_win">Client Win</option>
                <option value="office_update">Office Update</option>
                <option value="award">Award / Recognition</option>
                <option value="announcement">Announcement</option>
                <option value="update">General Update</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sender Name">
              <Input
                value={customSender}
                onChange={(e) => setCustomSender(e.target.value)}
                placeholder="Rohan Gupta (VP Sales)"
              />
            </Field>
            <Field label="Sender Phone">
              <Input
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+91-98765-43210"
              />
            </Field>
          </div>

          <Field label="Message Text (What was sent on WhatsApp)">
            <Textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Big congratulations to Alex and team on closing Acme Corp! Phenomenal effort!"
            />
          </Field>

          <Field label="Attached Photo Asset">
            <Select
              value={customImage}
              onChange={(e) => setCustomImage(e.target.value)}
            >
              <option value="/api/media/posts/seed/02-acme-deal.webp">Acme Corp Deal Signing (Client Win)</option>
              <option value="/api/media/posts/seed/03-hyderabad-office.webp">Hyderabad Office Workspace (Office)</option>
              <option value="/api/media/posts/seed/04-state-award.webp">State Digital Excellence Award (Felicitation)</option>
              <option value="/api/media/posts/seed/05-prototype-loop.webp">CRM Prototype Feedback Loop (Product)</option>
              <option value="/api/media/posts/seed/01-welcome.webp">Leadership Town Hall (General)</option>
            </Select>
          </Field>

          <div className="flex justify-end pt-2">
            <Button onClick={fireCustom} loading={busy} disabled={!customText.trim()}>
              <Send className="h-4 w-4" /> Send to WhatsApp Ingestion Webhook
            </Button>
          </div>
        </div>
      )}

      {tab === "stream" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Real-time inspection of inbound webhook payloads received at <code className="rounded bg-slate-100 px-1 py-0.5 text-indigo-700">/api/webhooks/whatsapp</code>
          </p>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No webhook events recorded yet. Click one of the 1-Click Presets above to simulate an incoming event!
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-3 font-mono text-xs transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-slate-900">POST /api/webhooks/whatsapp</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">201 Created</span>
                    </span>
                    <span className="text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Group: </span>
                      <span className="font-semibold text-indigo-700">{l.group_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Sender: </span>
                      <span className="font-semibold text-slate-700">{l.sender_name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Payload: </span>
                      <span className="text-slate-800">&ldquo;{l.text}&rdquo;</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Staging Status: </span>
                      <Badge className={l.status === "published" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}>
                        {l.status === "published" ? "Approved & Live" : "Pending HR Review"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

