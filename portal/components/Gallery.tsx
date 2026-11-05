"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

function Tile({ src, alt, onOpen, more, className = "" }: { src: string; alt: string; onOpen: () => void; more?: number; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" onClick={onOpen} aria-label="View photo" className={`group relative block h-full w-full overflow-hidden bg-slate-100 ${className}`}>
      {!loaded && !failed && <span className="shimmer absolute inset-0" />}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- photos are served from our own private-bucket proxy
        <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`h-full w-full object-cover transition-all duration-[900ms] group-hover:scale-[1.05] ${loaded ? "opacity-100" : "opacity-0"}`} />
      )}
      {more ? <span className="absolute inset-0 grid place-items-center bg-slate-950/55 text-3xl font-bold text-white backdrop-blur-[2px]">+{more}</span> : null}
    </button>
  );
}

/** Full screen viewer: arrows, keyboard, swipe-friendly thumbnails. */
export function Lightbox({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const go = useCallback((d: number) => setI((x) => (x + d + images.length) % images.length), [images.length]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [go, onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[300] flex flex-col bg-slate-950/92 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/15">{i + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 p-2 ring-1 ring-white/15 transition-colors hover:bg-white/20"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size photo from the private-bucket proxy */}
        <img key={images[i]} src={images[i]} alt="" className="animate-scale-in max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white ring-1 ring-white/20 backdrop-blur transition-all hover:scale-110 hover:bg-white/25 sm:left-6"><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white ring-1 ring-white/20 backdrop-blur transition-all hover:scale-110 hover:bg-white/25 sm:right-6"><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
          {images.map((src, k) => (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnail from the private-bucket proxy
            <button key={src} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${k === i ? "ring-white" : "opacity-55 ring-transparent hover:opacity-100"}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Photos for a post, laid out like a social feed: 1 wide, 2 side by side, 3 with a big one, 4 or more in a grid with "+N". */
export function Gallery({ images, alt, overlay }: { images: string[]; alt: string; overlay?: React.ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;
  if (n === 0) return null;
  const shown = images.slice(0, 4);
  const extra = n > 4 ? n - 4 : 0;
  const grid =
    n === 1 ? "aspect-[16/9]"
    : n === 2 ? "aspect-[16/9] grid grid-cols-2 gap-1"
    : n === 3 ? "aspect-[16/9] grid grid-cols-2 grid-rows-2 gap-1"
    : "aspect-[16/9] grid grid-cols-2 grid-rows-2 gap-1";
  return (
    <div className="relative">
      <div className={grid}>
        {shown.map((src, k) => (
          <div key={src} className={n === 3 && k === 0 ? "row-span-2" : ""}>
            <Tile src={src} alt={`${alt} (${k + 1})`} onOpen={() => setOpen(k)} more={extra && k === 3 ? extra : undefined} />
          </div>
        ))}
      </div>
      {overlay}
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
