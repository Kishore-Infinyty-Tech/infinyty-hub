"use client";

import { useState } from "react";
import { LogoOnDark } from "./Logo";
import { Sparkles } from "./fx/Sparkles";

/**
 * The default cover everyone starts with: company navy, soft glows, twinkling stars and the Infinyty logo.
 * It is replaced when the person uploads their own cover photo.
 */
export function DefaultCover({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-navy-gradient absolute inset-0 overflow-hidden ${className}`}>
      <div className="dot-grid absolute inset-0 opacity-[0.12]" />
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-glow/25 blur-[90px]" />
      <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-gold-500/20 blur-[90px]" />
      <Sparkles />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 90px)" }} />
      {/* the company logo, large and centred to the right so the profile photo and name never cover it */}
      <div className="absolute inset-y-0 right-6 flex items-center sm:right-12">
        <div className="rounded-3xl bg-white/[0.07] px-5 py-4 ring-1 ring-white/15 backdrop-blur-sm sm:px-8 sm:py-6">
          <span className="hidden sm:block"><LogoOnDark height={56} /></span>
          <span className="sm:hidden"><LogoOnDark height={34} /></span>
        </div>
      </div>
    </div>
  );
}

/** A person's cover: their own photo, or the default company-logo cover. Fills its (relative) parent. */
export function ProfileCover({ src }: { src?: string | null }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- cover photo from the private-bucket proxy */}
        <img src={src} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
      </>
    );
  }
  return <DefaultCover />;
}
