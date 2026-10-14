export function Stars({ value, className = "text-sm" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex tracking-tight ${className}`} aria-label={`5 üzerinden ${value.toFixed(1)}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "text-amber-400" : "text-ink-200"}>★</span>
      ))}
    </span>
  );
}

export function RatingInline({ rating }: { rating?: { avg: number; count: number } }) {
  if (!rating || rating.count === 0) return <span className="text-xs text-ink-400">Henüz değerlendirme yok</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-500">
      <Stars value={rating.avg} className="text-xs" />
      <strong className="text-ink-700">{rating.avg.toFixed(1)}</strong> ({rating.count})
    </span>
  );
}
