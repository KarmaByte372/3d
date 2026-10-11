"use client";

import { useState } from "react";
import { IconUpload } from "./Icons";

/** Sürükle-bırak destekli model dosyası alanı; gerçek <input type="file"> ile çalışır. */
export function FileDrop({ name, accept }: { name: string; accept: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={() => setOver(true)}
      onDragLeave={() => setOver(false)}
      onDrop={() => setOver(false)}
      className={`bg-plate-light relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
        over ? "border-brand-500 bg-brand-50" : file ? "border-emerald-400 bg-emerald-50/50" : "border-ink-200 hover:border-brand-400"
      }`}
    >
      <input
        type="file"
        id={name}
        name={name}
        aria-label="Model dosyası"
        accept={accept}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-900 text-filament-orange shadow-glow">
        <IconUpload className="h-6 w-6" />
      </span>
      {file ? (
        <>
          <span className="font-semibold text-ink-800">{file.name}</span>
          <span className="font-mono text-xs text-ink-400">{(file.size / 1024 / 1024).toFixed(2)} MB · değiştirmek için tıkla</span>
        </>
      ) : (
        <>
          <span className="font-semibold text-ink-800">Model dosyanı sürükle ya da seç</span>
          <span className="font-mono text-xs text-ink-400">{accept.replaceAll(",", " · ")} · en fazla 50 MB</span>
        </>
      )}
    </label>
  );
}
