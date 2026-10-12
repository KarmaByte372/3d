"use client";

import { useState } from "react";

export function StarInput({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1 text-3xl" role="radiogroup" aria-label="Puan" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} yıldız`}
          onClick={() => setValue(n)}
          onMouseEnter={() => setHover(n)}
          className={`transition-transform hover:scale-110 ${n <= shown ? "text-amber-400" : "text-ink-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
