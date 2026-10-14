import "server-only";
import { getSmsConfig } from "./integrations";

/**
 * SMS gönderimi.
 * Ayarlar admin → Entegrasyonlar'dan (yoksa .env'den) okunur.
 * - netgsm: Netgsm REST v2. Uç "otp" (varsayılan) OTP servisini, "sms" normal SMS'i kullanır.
 * - log:    SMS gönderilmez, kod sunucu loguna yazılır (yalnızca geliştirme ve kurulum testi için).
 */
export class SmsError extends Error {}

const NETGSM_ERRORS: Record<string, string> = {
  "20": "Mesaj metni hatalı ya da çok uzun",
  "30": "Netgsm kullanıcı adı/şifre hatalı veya API erişimi yok (API alt kullanıcısı ve IP izni kontrol edin)",
  "40": "Mesaj başlığı (gönderici adı) tanımlı değil",
  "41": "Mesaj başlığı geçersiz",
  "50": "Numara kontrolü başarısız",
  "51": "Numara kontrolü başarısız",
  "52": "Numara kontrolü başarısız",
  "60": "OTP SMS paketi/kredisi yok",
  "70": "Hatalı parametre",
  "80": "Gönderim sınırı aşıldı",
  "85": "Aynı numaraya çok sık gönderim",
  "100": "Netgsm sistem hatası",
  "101": "Netgsm sistem hatası",
};

export async function sendSms(phone: string, message: string): Promise<void> {
  const cfg = await getSmsConfig();
  if (cfg.provider === "netgsm") return sendNetgsm(phone, message, cfg);
  console.log(`[sms:log] ${phone} -> ${message}`);
}

async function sendNetgsm(phone: string, message: string, cfg: Awaited<ReturnType<typeof getSmsConfig>>) {
  const { usercode: user, password: pass, msgheader: header } = cfg;
  if (!user || !pass || !header) throw new SmsError("Netgsm ayarları eksik (kullanıcı kodu, şifre, mesaj başlığı)");

  const otp = cfg.endpoint === "otp";
  const url = `https://api.netgsm.com.tr/sms/rest/v2/${otp ? "otp" : "send"}`;
  const body = otp
    ? { msgheader: header, msg: message, no: phone }
    : { msgheader: header, encoding: "TR", messages: [{ msg: message, no: phone }] };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new SmsError(`Netgsm'e ulaşılamadı: ${(e as Error).message}`);
  }
  const data = (await res.json().catch(() => null)) as { code?: string; description?: string } | null;
  if (data?.code !== "00") {
    const code = data?.code ?? `HTTP ${res.status}`;
    throw new SmsError(`Netgsm hatası ${code}: ${NETGSM_ERRORS[code] ?? data?.description ?? "bilinmeyen hata"}`);
  }
}
