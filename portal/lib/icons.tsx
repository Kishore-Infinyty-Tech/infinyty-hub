import {
  BookOpenCheck, Banknote, CalendarCheck, ChartNoAxesCombined, Coins, DoorOpen, Fingerprint, Gauge, GraduationCap,
  Handshake, Laptop, LifeBuoy, Plane, ReceiptText, UserSearch, WalletCards, LayoutGrid, type LucideIcon,
} from "lucide-react";

export const APP_ICONS: Record<string, LucideIcon> = {
  Gauge, CalendarCheck, ReceiptText, WalletCards, Handshake, Fingerprint, Banknote, Coins, UserSearch, LifeBuoy,
  Laptop, DoorOpen, Plane, GraduationCap, ChartNoAxesCombined, BookOpenCheck,
};
export const appIcon = (name: string): LucideIcon => APP_ICONS[name] ?? LayoutGrid;

/** One entry per colour family: the icon tile gradient, a soft glow for hover, and a tint for chips. */
export const HUE: Record<string, { tile: string; glow: string; soft: string; text: string }> = {
  violet: { tile: "from-violet-600 to-fuchsia-400", glow: "shadow-[0_18px_40px_-14px_rgb(124_58_237/0.7)]", soft: "bg-violet-50", text: "text-violet-700" },
  emerald: { tile: "from-emerald-600 to-teal-300", glow: "shadow-[0_18px_40px_-14px_rgb(5_150_105/0.7)]", soft: "bg-emerald-50", text: "text-emerald-700" },
  amber: { tile: "from-amber-500 to-yellow-300", glow: "shadow-[0_18px_40px_-14px_rgb(217_119_6/0.7)]", soft: "bg-amber-50", text: "text-amber-700" },
  rose: { tile: "from-rose-600 to-orange-400", glow: "shadow-[0_18px_40px_-14px_rgb(225_29_72/0.7)]", soft: "bg-rose-50", text: "text-rose-700" },
  blue: { tile: "from-indigo-700 to-cyan-glow", glow: "shadow-[0_18px_40px_-14px_rgb(21_88_224/0.8)]", soft: "bg-indigo-50", text: "text-indigo-700" },
  teal: { tile: "from-teal-600 to-emerald-300", glow: "shadow-[0_18px_40px_-14px_rgb(13_148_136/0.7)]", soft: "bg-teal-50", text: "text-teal-700" },
  green: { tile: "from-green-600 to-lime-300", glow: "shadow-[0_18px_40px_-14px_rgb(22_163_74/0.7)]", soft: "bg-green-50", text: "text-green-700" },
  orange: { tile: "from-orange-500 to-amber-300", glow: "shadow-[0_18px_40px_-14px_rgb(234_88_12/0.7)]", soft: "bg-orange-50", text: "text-orange-700" },
  indigo: { tile: "from-indigo-600 to-violet-400", glow: "shadow-[0_18px_40px_-14px_rgb(67_56_202/0.7)]", soft: "bg-indigo-50", text: "text-indigo-700" },
  cyan: { tile: "from-cyan-600 to-sky-300", glow: "shadow-[0_18px_40px_-14px_rgb(8_145_178/0.7)]", soft: "bg-cyan-50", text: "text-cyan-700" },
  slate: { tile: "from-slate-700 to-slate-400", glow: "shadow-[0_18px_40px_-14px_rgb(51_65_85/0.7)]", soft: "bg-slate-100", text: "text-slate-700" },
  pink: { tile: "from-pink-600 to-rose-300", glow: "shadow-[0_18px_40px_-14px_rgb(219_39_119/0.7)]", soft: "bg-pink-50", text: "text-pink-700" },
  sky: { tile: "from-sky-600 to-blue-300", glow: "shadow-[0_18px_40px_-14px_rgb(2_132_199/0.7)]", soft: "bg-sky-50", text: "text-sky-700" },
  fuchsia: { tile: "from-fuchsia-600 to-pink-400", glow: "shadow-[0_18px_40px_-14px_rgb(192_38_211/0.7)]", soft: "bg-fuchsia-50", text: "text-fuchsia-700" },
  lime: { tile: "from-lime-600 to-emerald-300", glow: "shadow-[0_18px_40px_-14px_rgb(101_163_13/0.7)]", soft: "bg-lime-50", text: "text-lime-700" },
  stone: { tile: "from-stone-600 to-amber-200", glow: "shadow-[0_18px_40px_-14px_rgb(87_83_78/0.7)]", soft: "bg-stone-100", text: "text-stone-700" },
};
export const hue = (h: string) => HUE[h] ?? HUE.blue;

/** Raw "r g b" per colour family, so CSS can build rings, spotlights and shadows from one variable (--h). */
export const HUE_RGB: Record<string, string> = {
  violet: "124 58 237", emerald: "5 150 105", amber: "217 119 6", rose: "225 29 72", blue: "21 88 224", teal: "13 148 136",
  green: "22 163 74", orange: "234 88 12", indigo: "67 56 202", cyan: "8 145 178", slate: "51 65 85", pink: "219 39 119",
  sky: "2 132 199", fuchsia: "192 38 211", lime: "101 163 13", stone: "87 83 78",
};
export const hueRgb = (h: string) => HUE_RGB[h] ?? HUE_RGB.blue;
