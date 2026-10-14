/**
 * Basit bellek içi deneme sınırlayıcı (tek sunucu kurulumu için yeterli).
 * Birden fazla sunucuda Redis gibi paylaşımlı bir depo kullanılmalı.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function isLimited(key: string, max: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  return !!b && b.resetAt > now && b.count >= max;
}

export function hit(key: string, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count++;
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
}

export function reset(key: string) {
  buckets.delete(key);
}

export function minutesLeft(key: string, now = Date.now()) {
  const b = buckets.get(key);
  return b ? Math.max(1, Math.ceil((b.resetAt - now) / 60000)) : 0;
}
