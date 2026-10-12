/** "0532 123 45 67", "+90 532…", "532…" → "5321234567". Türk cep numarası değilse null. */
export function normalizeTrMobile(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}

/** "5321234567" → "0532 123 45 67" */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return "—";
  return /^5\d{9}$/.test(p) ? `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}` : p;
}

/** "5321234567" → "0532 *** ** 67" (ekranda kısmi gösterim) */
export function maskPhone(p: string): string {
  return /^5\d{9}$/.test(p) ? `0${p.slice(0, 3)} *** ** ${p.slice(8)}` : p;
}
