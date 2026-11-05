"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Award, BadgeCheck, BellRing, ClipboardCheck, LayoutGrid, Lock, Megaphone, MessageCircle, Newspaper, PartyPopper, ShieldCheck, Sparkles as SparkIcon, TrendingUp } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useIntro } from "@/components/fx/Intro";
import { CountUp, Reveal, Tilt } from "@/components/fx/effects";
import { HUE, appIcon } from "@/lib/icons";
import { useSession } from "@/lib/session";

const TOOLS: [string, string, string][] = [
  ["Performance", "Gauge", "violet"], ["Leave", "CalendarCheck", "emerald"], ["Invoices", "ReceiptText", "amber"], ["Payables", "WalletCards", "rose"],
  ["CRM", "Handshake", "blue"], ["Attendance", "Fingerprint", "teal"], ["Payroll", "Banknote", "green"], ["Expenses", "Coins", "orange"],
  ["Recruitment", "UserSearch", "indigo"], ["Helpdesk", "LifeBuoy", "cyan"], ["Learning", "GraduationCap", "fuchsia"], ["Analytics", "ChartNoAxesCombined", "lime"],
];

const FEATURES = [
  { icon: Newspaper, title: "Wins that never get lost", text: "Achievements shared in WhatsApp groups are reviewed by HR and published to one company feed that stays searchable.", tone: "from-indigo-600 to-cyan-glow" },
  { icon: LayoutGrid, title: "Every tool, one launcher", text: "Performance, Leave, Invoices, Payables, CRM and more. Everyone sees everything, and opens only what their role allows.", tone: "from-violet-600 to-fuchsia-400" },
  { icon: Award, title: "Credit where it is due", text: "Major contributors are tagged on a story. Their manager verifies it, and it lands in the Performance record for review time.", tone: "from-amber-500 to-yellow-300" },
  { icon: ShieldCheck, title: "Access that is always clear", text: "A restricted app shows a clean request-access screen instead of a dead end. HR is notified straight away.", tone: "from-emerald-600 to-teal-300" },
];

const FLOW = [
  { icon: MessageCircle, title: "Shared on WhatsApp", text: "A win is posted in a company group." },
  { icon: ClipboardCheck, title: "HR reviews", text: "Edit, categorise, tag contributors, publish." },
  { icon: PartyPopper, title: "Company celebrates", text: "Reactions and comments on the live feed." },
  { icon: BadgeCheck, title: "Manager verifies", text: "One click to approve for the record." },
  { icon: TrendingUp, title: "Performance record", text: "Ready, with evidence, at review time." },
];

function Showcase() {
  return (
    <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-300/40 via-cyan-glow/20 to-gold-300/30 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl" />
      <Tilt className="animate-float-slow" max={3}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static hero illustration; replace public/art/hero-illustration.webp to change it */}
        <img src="/art/hero-illustration.webp" alt="Reviewing company reports and charts at a laptop" className="h-auto w-full select-none drop-shadow-[0_30px_40px_rgb(14_42_107/0.18)]" draggable={false} />
      </Tilt>
      <Tilt className="absolute -left-12 bottom-[14%] hidden w-60 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 text-white"><BellRing className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">You were tagged</p><p className="text-xs text-slate-500">Acme Corp deal</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute -right-3 -top-5 hidden w-56 sm:block" max={8}>
        <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-3s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-300 text-white"><BadgeCheck className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Milestone verified</p><p className="text-xs text-slate-500">Added to Performance</p></div>
        </div>
      </Tilt>
      <Tilt className="absolute -bottom-10 right-2 hidden w-52 sm:block" max={8}>
        <div className="glass-strong animate-float-slow flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: "-5s" }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white"><Lock className="h-5 w-5" /></span>
          <div><p className="text-sm font-bold text-slate-900">Request access</p><p className="text-xs text-slate-500">Payables Management</p></div>
        </div>
      </Tilt>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const intro = useIntro();
  const { user } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enter = () => (user ? router.push("/home") : intro.play("/login"));
  const label = user ? "Open the hub" : "Sign in";

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="aurora" />
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
        <div className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-6 ${scrolled ? "glass mx-3 sm:mx-auto" : ""}`}>
          <Logo height={34} priority />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#flow" className="transition-colors hover:text-indigo-600">How it flows</a>
            <a href="#features" className="transition-colors hover:text-indigo-600">Features</a>
            <a href="#tools" className="transition-colors hover:text-indigo-600">Your tools</a>
          </nav>
          <button onClick={enter} className="group inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-8px_rgb(21_88_224/0.75)] active:translate-y-0">
            {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-28 sm:px-8 lg:min-h-[92vh] lg:grid-cols-[0.95fr_1.05fr] lg:pb-10 lg:pt-24">
        <div className="relative z-10">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 backdrop-blur" style={{ animationDelay: "0.1s" }}>
            <SparkIcon className="h-3.5 w-3.5 text-gold-500" /> Infinyty internal hub
          </div>
          <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-[3.4rem]" style={{ animationDelay: "0.2s" }}>
            Every win celebrated. Every tool <span className="text-gradient">one click away.</span>
          </h1>
          <p className="animate-fade-up mt-5 max-w-lg text-[15px] leading-relaxed text-slate-600" style={{ animationDelay: "0.35s" }}>
            Company news, announcements and all your work apps in a single, secure home. Achievements shared on WhatsApp are published for everyone and credited to the people behind them.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.5s" }}>
            <button onClick={enter} className="group inline-flex items-center gap-2.5 rounded-xl bg-navy-gradient py-2.5 pl-5 pr-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-12px_rgb(14_42_107/0.7)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_-10px_rgb(21_88_224/0.7)]">
              {user ? "Open the hub" : "Sign in to the hub"}
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 transition-transform group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
            </button>
            <a href="#flow" className="rounded-xl bg-white/60 px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300/70 backdrop-blur transition-all hover:bg-white hover:ring-indigo-300">See how it works</a>
          </div>
          <dl className="animate-fade-up mt-10 grid max-w-sm grid-cols-3 gap-6 border-t border-slate-200/70 pt-6" style={{ animationDelay: "0.65s" }}>
            {[[16, "tools in one place"], [3, "roles, one system"], [1, "company feed"]].map(([n, l]) => (
              <div key={l}><dt className="font-display text-2xl font-bold text-slate-900"><CountUp value={n as number} /></dt><dd className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">{l}</dd></div>
            ))}
          </dl>
        </div>
        <Showcase />
      </section>

      <section id="flow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">How it flows</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">From a WhatsApp message to a verified milestone.</h2>
          <p className="mt-4 text-slate-600">Five clear steps, each with an owner, so recognition is never forgotten at review time.</p>
        </Reveal>
        <Reveal className="relative mt-14" delay={150}>
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-slate-200 via-indigo-300 to-gold-300 md:block" />
          <ol className="relative grid gap-6 sm:grid-cols-2 md:grid-cols-5">
            {FLOW.map((f, i) => (
              <li key={f.title} className="flex flex-col items-center text-center">
                <span className="z-10 grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"><f.icon className="h-5 w-5" /></span>
                <span className="mt-1 text-[11px] font-bold text-indigo-400">0{i + 1}</span>
                <span className="mt-1 text-sm font-bold text-slate-900">{f.title}</span>
                <span className="mt-1 max-w-[11rem] text-xs leading-relaxed text-slate-500">{f.text}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Everything in one place</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Built for how your company actually works.</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <Tilt className="h-full rounded-3xl" max={5}>
                <div className="glass hover-lift flex h-full gap-5 rounded-3xl p-7">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-lg`}><f.icon className="h-6 w-6" /></span>
                  <div><h3 className="text-lg font-bold text-slate-900">{f.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p></div>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Your tools</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">All your apps, beautifully organised.</h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {TOOLS.map(([name, icon, h], i) => { const I = appIcon(icon); return (
            <Reveal key={name} delay={i * 50}>
              <div className="glass hover-lift flex flex-col items-center gap-3 rounded-3xl p-5 text-center">
                <span className={`grid h-14 w-14 place-items-center rounded-[1.1rem] bg-gradient-to-br text-white ${HUE[h].tile} ${HUE[h].glow}`}><I className="h-6 w-6" /></span>
                <span className="text-sm font-bold text-slate-800">{name}</span>
              </div>
            </Reveal>
          ); })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-6 sm:px-8">
        <Reveal>
          <div className="bg-navy-gradient relative overflow-hidden rounded-[2rem] px-8 py-16 text-center shadow-[0_40px_90px_-30px_rgb(14_42_107/0.8)] sm:px-16">
            <div className="dot-grid absolute inset-0 opacity-20" />
            <div className="absolute -right-24 -top-24 h-80 w-80 animate-blob rounded-full bg-cyan-glow/30 blur-3xl" />
            <div className="absolute -bottom-28 -left-16 h-80 w-80 animate-blob rounded-full bg-gold-500/25 blur-3xl" style={{ animationDelay: "-8s" }} />
            <Megaphone className="relative mx-auto h-9 w-9 text-gold-300" />
            <h2 className="relative mx-auto mt-5 max-w-2xl text-3xl font-bold text-white sm:text-4xl">Your team&apos;s story is waiting inside.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-indigo-100/90">Catch up on the latest wins and open the tools you use every day.</p>
            <button onClick={enter} className="group relative mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-900 shadow-2xl transition-all hover:-translate-y-1">
              {label} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 px-5 py-8 text-sm text-slate-500 sm:px-8">
        <Logo height={26} />
        <p>Internal tool. Authorised team members only.</p>
      </footer>
    </div>
  );
}
