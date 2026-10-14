export const TIMEZONE = "Europe/Istanbul";

/** Verilen anın İstanbul saatine göre takvim tarihi (YYYY-MM-DD). */
export function istanbulDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 0 = Pazar ... 3 = Çarşamba (İstanbul saatine göre). */
export function istanbulWeekday(d: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export function isWednesday(d: Date = new Date()): boolean {
  return istanbulWeekday(d) === 3;
}

/** Bugün dahil, bir sonraki çarşambanın tarihi (YYYY-MM-DD). */
export function nextWednesday(d: Date = new Date()): string {
  const diff = (3 - istanbulWeekday(d) + 7) % 7;
  return istanbulDate(new Date(d.getTime() + diff * 24 * 60 * 60 * 1000));
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d;
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TIMEZONE, dateStyle: "long" }).format(date);
}
