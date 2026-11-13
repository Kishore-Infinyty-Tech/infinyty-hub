"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Code2,
  Flame,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Radio,
  Smile,
  Trophy,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { createPortal } from "react-dom";
import { api, useSession } from "@/lib/session";
import type { PostCategory } from "@/lib/types";
import type { WhatsAppLogEntry } from "@/lib/whatsapp";
import { Badge, Button, useToast } from "./ui";
import { Avatar } from "./fx/effects";

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

const CHAT_MESSAGES = [
  {
    sender: "Rohan Gupta",
    color: "#1f7acb",
    text: "New deal with Acme Corp closed.",
    time: "10:24 AM",
  },
  {
    sender: "Neha Iyer",
    color: "#d81b60",
    text: "Congrats 🎉",
    time: "10:25 AM",
    reaction: "👍 3",
  },
  {
    sender: "Aayush Mahendru",
    color: "#2e7d32",
    text: "Kudos to Nehash and team 🙌",
    time: "10:26 AM",
  },
  {
    sender: "Vikram Rao",
    color: "#e65100",
    text: "Nice work!",
    time: "10:26 AM",
  },
  {
    sender: "Sana Qureshi",
    color: "#00897b",
    text: "Congrats 🎉",
    time: "10:27 AM",
  },
  {
    sender: "Arjun Nair",
    color: "#5e35b1",
    text: "Congrats!",
    time: "10:27 AM",
    dateDividerAfter: "Today",
  },
  {
    sender: "Karan Mehra",
    color: "#0288d1",
    text: "Office opens in Hyderabad!",
    time: "11:12 AM",
  },
  {
    sender: "Aditi Vad",
    color: "#8e24aa",
    text: "Congrats! 🎉",
    time: "11:12 AM",
  },
  {
    sender: "Rhea Kapoor",
    color: "#43a047",
    text: "Which functions?",
    time: "11:13 AM",
  },
];

export function WhatsAppSimulatorButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Simulate WhatsApp Achievement"
        className={`group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_4px_16px_-4px_rgba(16,185,129,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_24px_-4px_rgba(5,150,105,0.6)] active:scale-[0.98] ${
          className ?? ""
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <MessageCircle className="h-3.5 w-3.5 fill-white text-white" />
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

  // 3 tabs: WhatsApp UI preview, 1-Click Presets, Live Webhook Stream
  const [tab, setTab] = useState<"chat_view" | "presets" | "stream">("chat_view");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<WhatsAppLogEntry[]>([]);

  const loadLogs = () => {
    api<{ logs: WhatsAppLogEntry[] }>("/api/webhooks/whatsapp")
      .then((r) => setLogs(r.logs))
      .catch(() => undefined);
  };

  useEffect(() => {
    if (open) loadLogs();
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const dispatch = async (payload: Record<string, unknown>, successTitle: string) => {
    setBusy(true);
    try {
      await api<{ ok: boolean; post_id: number }>("/api/webhooks/whatsapp", {
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:py-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="WhatsApp Ingestion Pipeline Simulator"
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-emerald-900/40 bg-[#efeae2] shadow-2xl ring-1 ring-black/10 transition-all"
        style={{
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 40px -10px rgba(0, 128, 105, 0.3)",
        }}
      >
        {/* WhatsApp App Header (Clean: Title only, no subtitle, close button) */}
        <header className="flex items-center justify-between bg-[#008069] px-4 py-3.5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
              <Users className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#008069] bg-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight sm:text-lg">
                Infinyty Announcements & Wins
              </h2>
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-all hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* WhatsApp Styled Tab Bar */}
        <div className="border-b border-[#075e54]/20 bg-[#075e54] px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
            <button
              onClick={() => setTab("chat_view")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                tab === "chat_view"
                  ? "bg-white text-[#008069] shadow-md"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Chat UI</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  tab === "chat_view"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                    : "bg-emerald-950/40 text-emerald-100 ring-1 ring-emerald-400/30"
                }`}
              >
                Live Look
              </span>
            </button>

            <button
              onClick={() => setTab("presets")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                tab === "presets"
                  ? "bg-white text-[#008069] shadow-md"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>1-Click Presets</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  tab === "presets"
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "bg-amber-950/40 text-amber-200 ring-1 ring-amber-400/30"
                }`}
              >
                4 Wins
              </span>
            </button>

            <button
              onClick={() => setTab("stream")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                tab === "stream"
                  ? "bg-white text-[#008069] shadow-md"
                  : "text-emerald-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-emerald-300" />
              <span>Live Webhook Stream</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  tab === "stream"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                    : "bg-emerald-950/40 text-emerald-100 ring-1 ring-emerald-400/30"
                }`}
              >
                {logs.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body with WhatsApp Doodle Wallpaper Styling */}
        <div
          className="max-h-[75vh] overflow-y-auto p-3 sm:p-5"
          style={{
            backgroundColor: "#efeae2",
            backgroundImage: `radial-gradient(#008069 0.4px, transparent 0.4px), radial-gradient(#d1d7db 0.4px, #efeae2 0.4px)`,
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 8px 8px",
          }}
        >
          {/* TAB 1: Pixel-Perfect Native WhatsApp Group Chat UI */}
          {tab === "chat_view" && (
            <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-emerald-900/15 bg-white shadow-xl">
              {/* Internal WhatsApp Chat Bar (matches real WhatsApp UI exactly) */}
              <div className="flex items-center justify-between bg-[#008069] px-3.5 py-2.5 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold sm:text-sm leading-tight">
                      Infinyty Announcements & Wins
                    </h3>
                    <p className="text-[10px] text-emerald-100/90 leading-tight">
                      24 members • <span className="text-emerald-300 font-medium">Online</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-emerald-100">
                  <Video className="h-4 w-4 cursor-pointer hover:text-white" />
                  <Phone className="h-4 w-4 cursor-pointer hover:text-white" />
                  <MoreVertical className="h-4 w-4 cursor-pointer hover:text-white" />
                </div>
              </div>

              {/* Chat Canvas with authentic WhatsApp doodle background & crisp bubbles */}
              <div
                className="space-y-2 p-3 sm:p-4 text-xs select-text overflow-y-auto max-h-[50vh]"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage: `radial-gradient(#008069 0.4px, transparent 0.4px), radial-gradient(#d1d7db 0.4px, #efeae2 0.4px)`,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              >
                {/* Top Date Chip */}
                <div className="flex justify-center pt-1 pb-2">
                  <span className="rounded-lg bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-black/5">
                    Yesterday
                  </span>
                </div>

                {CHAT_MESSAGES.map((msg, idx) => {
                  const userObj = users.find((u) =>
                    u.name.toLowerCase().includes(msg.sender.toLowerCase().split(" ")[0]),
                  );
                  return (
                    <div key={idx} className={msg.reaction ? "pb-2" : "space-y-2"}>
                      <div className="flex items-start gap-2">
                        <Avatar
                          name={msg.sender}
                          src={userObj?.avatar_url}
                          size={28}
                          className="!rounded-full shrink-0 shadow-sm mt-0.5"
                        />
                        <div className="relative flex flex-col items-start">
                          <div className="relative rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 shadow-[0_1px_1.5px_rgba(0,0,0,0.12)] border border-black/[0.03] max-w-[85%] sm:max-w-md">
                            <span
                              className="block text-[11px] font-bold"
                              style={{ color: msg.color }}
                            >
                              {msg.sender}
                            </span>
                            <div className="flex flex-wrap items-baseline justify-between gap-3">
                              <span className="text-xs text-slate-800 leading-snug">{msg.text}</span>
                              <span className="ml-auto text-[9px] font-medium text-slate-400 shrink-0">
                                {msg.time}
                              </span>
                            </div>
                          </div>

                          {msg.reaction && (
                            <div className="relative z-20 -mt-2.5 ml-2.5 inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-md">
                              <span>👍</span>
                              <span className="text-[10px] font-bold text-slate-500">3</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {msg.dateDividerAfter && (
                        <div className="flex justify-center my-3.5">
                          <span className="rounded-lg bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-black/5">
                            {msg.dateDividerAfter}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Animated Typing Indicator */}
                <div className="flex items-center gap-2 pt-1 pl-9">
                  <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-black/5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                  <span className="text-[11px] text-slate-500 italic">Rohan is typing...</span>
                </div>
              </div>

              {/* Authentic WhatsApp Message Input Bar */}
              <div className="flex items-center gap-2 border-t border-slate-200/80 bg-[#f0f2f5] px-3 py-2.5">
                <div className="flex flex-1 items-center gap-2.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-black/5">
                  <Smile className="h-5 w-5 text-slate-400 shrink-0 cursor-pointer hover:text-slate-600" />
                  <span className="text-xs text-slate-400 select-none">Type a message...</span>
                  <div className="ml-auto flex items-center gap-2 text-slate-400">
                    <Paperclip className="h-4 w-4 cursor-pointer hover:text-slate-600" />
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white shadow-md">
                  <Mic className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 1-Click Presets */}
          {tab === "presets" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {PRESETS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#008069]/60 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-[#008069] ring-1 ring-emerald-300">
                            <Icon className="h-3 w-3" />
                            {p.badge}
                          </span>
                          <span className="font-mono text-[11px] font-medium text-slate-400">{p.group_name}</span>
                        </div>

                        <p className="mt-2.5 text-sm font-bold text-slate-900 group-hover:text-[#008069] transition-colors">
                          {p.headline}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                          &ldquo;{p.text}&rdquo;
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{p.sender_name}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-[#008069]">
                            <Users className="h-3 w-3" />
                            {p.tagged_names.join(", ")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          disabled={busy}
                          onClick={() => firePreset(p)}
                          className="flex w-full items-center justify-between rounded-xl bg-[#008069] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#075e54] active:scale-[0.99] disabled:opacity-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 fill-white text-white" />
                            <span>Ingest This Win</span>
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Live Webhook Stream (Clean list, no top banner or refresh button) */}
          {tab === "stream" && (
            <div className="space-y-2.5">
              {logs.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-emerald-700/30 bg-white/80 p-8 text-center text-sm text-slate-500">
                  <p className="font-medium text-slate-700">No webhook events recorded yet.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Switch to the <strong>1-Click Presets</strong> tab to trigger and simulate an incoming WhatsApp event!
                  </p>
                </div>
              ) : (
                <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-2xl border border-emerald-900/10 bg-white p-3.5 font-mono text-xs shadow-sm transition-colors hover:border-[#008069]/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900">POST /api/webhooks/whatsapp</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-[#008069] ring-1 ring-emerald-200">
                            201 Created
                          </span>
                        </span>
                        <span className="text-slate-400 text-[11px]">{new Date(l.timestamp).toLocaleTimeString()}</span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-sans">
                        <div>
                          <span className="text-slate-400">Group: </span>
                          <span className="font-bold text-[#008069]">{l.group_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Sender: </span>
                          <span className="font-semibold text-slate-800">{l.sender_name}</span>
                        </div>
                        <div className="col-span-2 rounded-lg bg-slate-50 p-2 text-slate-700 italic border border-slate-100">
                          &ldquo;{l.text}&rdquo;
                        </div>
                        <div className="col-span-2 flex items-center justify-between pt-1">
                          <span className="text-slate-500 text-[11px]">Pipeline Status:</span>
                          <Badge
                            className={
                              l.status === "published"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
                                : "bg-amber-50 text-amber-700 ring-amber-300"
                            }
                          >
                            {l.status === "published" ? "✓ Approved & Live" : "⏳ Staged for HR Moderation"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Styled Modal Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200/80 bg-[#f0f2f5] px-4 py-3 text-xs text-slate-600 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#008069]" />
            <span className="font-medium text-slate-500">WhatsApp Enterprise Business API Simulation</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
