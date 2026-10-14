/**
 * İstemci IP'si. Üretimde nginx X-Real-IP başlığını gerçek bağlantı adresiyle ezer,
 * bu yüzden istemcinin gönderdiği sahte değerler kullanılmaz. Edge ve Node'da çalışır.
 */
export function clientIp(h: Headers): string {
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "yerel";
}

/** .env'de SESSION_BIND_IP="false" ise IP kontrolü admin ayarından bağımsız olarak kapalıdır. */
export function ipBindingForcedOff() {
  return process.env.SESSION_BIND_IP === "false";
}

/**
 * Oturumun IP kontrolü. strict: IP birebir aynı olmalı; subnet: aynı ağ bloğu yeterli
 * (IPv4 ilk iki bölüm /16, IPv6 ilk üç blok /48) — operatörlerin dönen IP havuzunda oturum düşmez,
 * ama Wi-Fi'dan mobil veriye geçişte (farklı operatör) yine düşer; off: kontrol yok.
 */
export type IpMode = "strict" | "subnet" | "off";

export function ipMatches(sessionIp: string, currentIp: string, mode: IpMode) {
  if (mode === "off" || ipBindingForcedOff()) return true;
  if (sessionIp === currentIp) return true;
  if (mode !== "subnet") return false;
  const v4 = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip);
  if (v4(sessionIp) && v4(currentIp)) return sessionIp.split(".").slice(0, 2).join(".") === currentIp.split(".").slice(0, 2).join(".");
  if (sessionIp.includes(":") && currentIp.includes(":")) {
    const head = (ip: string) => ip.toLowerCase().split(":").slice(0, 3).join(":");
    return head(sessionIp) === head(currentIp);
  }
  return false;
}

/** Sitenin dışarıdan görünen adresi (ödeme dönüş URL'leri için). SITE_URL tanımlıysa o kullanılır. */
export function siteOrigin(h: Headers): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
