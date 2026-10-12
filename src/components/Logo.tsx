import Link from "next/link";
import { getSettings } from "@/lib/settings";

/** İzometrik, katmanlı küp: filament renkleriyle basılmış bir parça. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a4c" />
          <stop offset="1" stopColor="#ff3d8b" />
        </linearGradient>
        <linearGradient id="lm-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3d8b" />
          <stop offset="1" stopColor="#b42a6a" />
        </linearGradient>
        <linearGradient id="lm-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e8fa6" />
        </linearGradient>
      </defs>
      <path d="M16 3 28 10 16 17 4 10Z" fill="url(#lm-top)" />
      <path d="M4 10 16 17V29L4 22Z" fill="url(#lm-front)" />
      <path d="M28 10 16 17V29L28 22Z" fill="url(#lm-side)" />
      {/* Katman çizgileri */}
      <g stroke="#fff" strokeOpacity=".35" strokeWidth=".7">
        <path d="M4 13.4 16 20.4 28 13.4" fill="none" />
        <path d="M4 16.8 16 23.8 28 16.8" fill="none" />
        <path d="M4 20.2 16 27.2 28 20.2" fill="none" />
      </g>
    </svg>
  );
}

/** Marka adı admin ayarlarından gelir; sondaki "3D" vb. ek filament renginde vurgulanır. */
export async function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  const { siteName } = await getSettings();
  const m = siteName.match(/^(.*?)(\d+[A-Za-z]*)$/);
  const [head, tail] = m && m[1] ? [m[1], m[2]] : [siteName, ""];
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <LogoMark className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[8deg]" />
      <span className={`font-display text-lg font-bold tracking-tight ${dark ? "text-white" : "text-ink-900"}`}>
        {head}
        {tail && <span className="text-filament">{tail}</span>}
      </span>
    </Link>
  );
}
