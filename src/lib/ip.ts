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
