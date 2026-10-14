/**
 * T.C. kimlik numarası algoritma kontrolü. Numaranın biçimce geçerli olduğunu gösterir;
 * kişiye ait olduğunu kanıtlamaz (bunun için NVİ KPS sorgusu gerekir).
 */
export function isValidTckn(input: string): boolean {
  if (!/^[1-9]\d{10}$/.test(input)) return false;
  const d = input.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/** "12345678950" → "123******50" */
export function maskTckn(tckn: string): string {
  return tckn.length === 11 ? `${tckn.slice(0, 3)}******${tckn.slice(9)}` : "***";
}
