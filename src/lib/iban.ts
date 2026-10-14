/** Türk IBAN'ını normalleştirir ve mod-97 kontrolüyle doğrular. Geçersizse null döner. */
export function normalizeTrIban(input: string): string | null {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1 ? iban : null;
}

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
