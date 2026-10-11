/**
 * Dekoratif sahne: baskı tablası üzerinde katman katman yükselen bir parça ve
 * üzerinde gidip gelen nozul. Sadece CSS animasyonu; hareket azaltma tercihine uyar.
 */
export function PrintScene({ className = "" }: { className?: string }) {
  const layers = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div className={`relative aspect-square w-full max-w-[440px] ${className}`} aria-hidden="true">
      {/* Işıma */}
      <div className="absolute inset-[12%] rounded-full bg-gradient-to-tr from-filament-orange/30 via-filament-pink/20 to-filament-cyan/30 blur-3xl" />

      <svg viewBox="0 0 400 400" className="relative h-full w-full">
        <defs>
          <linearGradient id="ps-obj" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff6b2c" />
            <stop offset=".55" stopColor="#ff3d8b" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="ps-plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#252d3e" />
            <stop offset="1" stopColor="#161c2a" />
          </linearGradient>
          <clipPath id="ps-vase">
            <path d="M150 300c0 18 22 30 50 30s50-12 50-30c0-30-22-44-22-78 0-26 26-42 26-74 0-12-22-20-54-20s-54 8-54 20c0 32 26 48 26 74 0 34-22 48-22 78Z" />
          </clipPath>
          <pattern id="ps-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#ffffff" strokeOpacity=".07" />
          </pattern>
        </defs>

        {/* Baskı tablası (izometrik) */}
        <g transform="translate(200 300)">
          <path d="M0 -60 150 0 0 60 -150 0Z" fill="url(#ps-plate)" stroke="#3a4459" />
          <path d="M0 -60 150 0 0 60 -150 0Z" fill="url(#ps-grid)" />
          <path d="M-150 0 0 60V72L-150 12Z" fill="#0d121d" />
          <path d="M150 0 0 60V72L150 12Z" fill="#161c2a" />
        </g>

        {/* Basılan nesne: vazo silueti, katman çizgileriyle */}
        <g className="animate-print-build">
          <path d="M150 300c0 18 22 30 50 30s50-12 50-30c0-30-22-44-22-78 0-26 26-42 26-74 0-12-22-20-54-20s-54 8-54 20c0 32 26 48 26 74 0 34-22 48-22 78Z" fill="url(#ps-obj)" />
          {/* Katman çizgileri yalnızca nesnenin içinde görünür */}
          <g clipPath="url(#ps-vase)" stroke="#ffffff" strokeOpacity=".22" strokeWidth="1">
            {layers.map((i) => (
              <path key={i} d={`M140 ${318 - i * 8.6}h120`} />
            ))}
          </g>
          <ellipse cx="200" cy="128" rx="54" ry="12" fill="#22d3ee" fillOpacity=".55" />
        </g>

        {/* Portal ve nozul */}
        <g className="animate-nozzle-y">
          <rect x="60" y="92" width="280" height="6" rx="3" fill="#3a4459" />
          <g transform="translate(200 0)">
            <g className="animate-nozzle-x">
              <rect x="-22" y="70" width="44" height="30" rx="6" fill="#e9edf5" />
              <rect x="-22" y="70" width="44" height="7" rx="3" fill="#ff6b2c" />
              <path d="M-9 100h18l-6 14h-6Z" fill="#a9b3c7" />
              <circle cx="0" cy="117" r="3" fill="#ff8a4c">
                <animate attributeName="opacity" values="1;.3;1" dur=".6s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>
        </g>
      </svg>

      {/* Yüzen bilgi kartları */}
      <div className="absolute left-0 top-[14%] animate-float-slow rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-ink-200 backdrop-blur-md">
        <span className="text-filament-cyan">●</span> Katman 142 / 220
      </div>
      <div className="absolute bottom-[10%] right-0 animate-float-slow rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-ink-200 backdrop-blur-md [animation-delay:-3s]">
        PETG · 0.2 mm · 240°C
      </div>
    </div>
  );
}
