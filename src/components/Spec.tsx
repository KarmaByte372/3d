import { IconFile, IconPin } from "./Icons";
import { formatDate } from "@/lib/dates";
import { formatTL } from "@/lib/money";

/** Malzemeye göre filament rengi; kartlarda küçük "makara" göstergesi için. */
const MATERIAL_COLORS: Record<string, string> = {
  PLA: "from-filament-orange to-amber-400",
  PETG: "from-filament-cyan to-sky-500",
  ABS: "from-filament-pink to-rose-500",
  ASA: "from-violet-500 to-filament-pink",
  "TPU (esnek)": "from-filament-lime to-emerald-500",
  Naylon: "from-ink-300 to-ink-500",
  Reçine: "from-amber-300 to-filament-orange",
  "Karbon katkılı": "from-ink-600 to-ink-900",
};

export function MaterialDot({ material, className = "h-3 w-3" }: { material: string; className?: string }) {
  const g = MATERIAL_COLORS[material] ?? "from-filament-orange to-filament-pink";
  return <span className={`inline-block flex-none rounded-full bg-gradient-to-br ring-2 ring-white ${g} ${className}`} />;
}

/** Talebin baskı parametreleri: dilimleyici (slicer) ayar paneli görünümünde. */
export function SpecSheet({
  request,
}: {
  request: {
    id: string;
    description: string;
    technology: string | null;
    material: string;
    color: string | null;
    quantity: number;
    city: string;
    budget: number | null;
    deadline: Date | null;
    fileName: string | null;
  };
}) {
  const rows: [string, React.ReactNode][] = [
    ["Teknoloji", request.technology ?? "—"],
    ["Malzeme", <span key="m" className="inline-flex items-center gap-2"><MaterialDot material={request.material} />{request.material}</span>],
    ["Renk", request.color ?? "—"],
    ["Adet", `${request.quantity}×`],
    ["Bütçe", request.budget ? formatTL(request.budget) : "—"],
    ["Son tarih", formatDate(request.deadline)],
  ];
  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-plate relative bg-ink-900 px-5 py-4 text-white">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Baskı parametreleri</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-200">
          <IconPin className="h-4 w-4 text-filament-orange" /> {request.city}
        </p>
      </div>
      <div className="filament-line" />
      <dl className="divide-y divide-ink-100 font-mono text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <dt className="text-ink-400">{k}</dt>
            <dd className="text-right font-medium text-ink-800">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-ink-100 px-5 py-4">
        <p className="label">Açıklama</p>
        <p className="whitespace-pre-wrap text-sm text-ink-700">{request.description}</p>
      </div>
      {request.fileName && (
        <a
          href={`/api/files/${request.id}`}
          className="group flex items-center gap-3 border-t border-ink-100 bg-ink-50 px-5 py-3 text-sm transition hover:bg-brand-50"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-600 shadow-sm">
            <IconFile className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-ink-800">{request.fileName}</span>
            <span className="text-xs text-ink-400">Model dosyasını indir</span>
          </span>
        </a>
      )}
    </div>
  );
}
