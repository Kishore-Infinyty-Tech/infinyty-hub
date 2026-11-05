"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useToast } from "./ui";

/**
 * Drag-and-drop photo picker. Uploads to the private bucket and reports the saved URL, which
 * goes straight into portal.posts.image_url. Dev B drops this into the HR moderation form.
 */
export function ImageUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="group relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- served from our own private-bucket proxy */}
        <img src={value} alt="Post photo" className="aspect-[16/8] w-full object-cover" />
        <button type="button" onClick={() => onChange(null)} aria-label="Remove photo" className="absolute right-3 top-3 rounded-full bg-slate-900/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
      className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${over ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white/60 hover:border-indigo-400 hover:bg-indigo-50/60"}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-md">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}</span>
      <span className="text-sm font-bold text-slate-800">{busy ? "Uploading…" : "Drop a photo here or click to choose"}</span>
      <span className="text-xs text-slate-500">JPG, PNG, WebP or GIF, up to 8 MB</span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
}
