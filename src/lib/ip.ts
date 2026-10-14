/**
 * İstemci IP'si. Üretimde nginx X-Real-IP başlığını gerçek bağlantı adresiyle ezer,
 * bu yüzden istemcinin gönderdiği sahte değerler kullanılmaz. Edge ve Node'da çalışır.
 */
export function clientIp(h: Headers): string {
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "yerel";
}

/** Oturum IP'ye bağlı mı? (SESSION_BIND_IP="false" ile kapatılabilir) */
export function bindSessionToIp() {
  return process.env.SESSION_BIND_IP !== "false";
}

/** Sitenin dışarıdan görünen adresi (ödeme dönüş URL'leri için). SITE_URL tanımlıysa o kullanılır. */
export function siteOrigin(h: Headers): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
