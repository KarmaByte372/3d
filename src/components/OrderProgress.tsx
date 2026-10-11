import { IconCheck, IconNozzle, IconTruck } from "./Icons";

const STEPS = [
  { key: "IN_PROGRESS", label: "Basılıyor", Icon: IconNozzle },
  { key: "SHIPPED", label: "Kargoda", Icon: IconTruck },
  { key: "COMPLETED", label: "Teslim edildi", Icon: IconCheck },
];

/** Siparişin aşamalarını, katman katman dolan bir ilerleme çubuğu olarak gösterir. */
export function OrderProgress({ status }: { status: string }) {
  if (status === "CANCELLED") return null;
  const current = STEPS.findIndex((s) => s.key === status);
  const pct = current <= 0 ? 18 : current === 1 ? 62 : 100;
  return (
    <div className="mt-5">
      <div className="relative h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="bg-layers absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-filament-orange via-filament-pink to-filament-cyan transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-2 grid grid-cols-3 text-xs">
        {STEPS.map(({ key, label, Icon }, i) => {
          const done = i <= current;
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 ${i === 1 ? "justify-center" : i === 2 ? "justify-end" : ""} ${
                done ? "font-semibold text-ink-800" : "text-ink-400"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${done ? "text-brand-600" : ""}`} />
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
