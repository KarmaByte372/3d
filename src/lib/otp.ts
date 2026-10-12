import "server-only";
import crypto from "node:crypto";
import { prisma } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { sendSms, SmsError } from "./sms";

export type OtpPurpose = "VERIFY" | "RESET";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_PER_PHONE_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 20;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, purpose: string, code: string) {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(`${phone}|${purpose}|${code}`).digest("hex");
}

/** Türkçe karakterleri ASCII'ye çevirir; OTP SMS'leri GSM 7-bit gönderilir. */
function ascii(s: string) {
  const map: Record<string, string> = { ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I", ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U" };
  return s.replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c]);
}

/** Saniye cinsinden yeniden gönderime kalan süre (0 = gönderilebilir). */
export async function resendWait(phone: string, purpose: OtpPurpose, now = new Date()) {
  const last = await prisma.phoneCode.findFirst({ where: { phone, purpose }, orderBy: { createdAt: "desc" } });
  if (!last) return 0;
  return Math.max(0, Math.ceil((last.createdAt.getTime() + RESEND_COOLDOWN_MS - now.getTime()) / 1000));
}

/** Yeni kod üretir, SMS ile gönderir. Önceki kullanılmamış kodlar geçersiz olur. */
export async function issueCode(opts: { phone: string; purpose: OtpPurpose; userId?: string; ip: string }) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600_000);

  const wait = await resendWait(opts.phone, opts.purpose, now);
  if (wait > 0) throw new AppError(`Yeni kod için ${wait} saniye bekleyin.`);
  const [perPhone, perIp] = await Promise.all([
    prisma.phoneCode.count({ where: { phone: opts.phone, createdAt: { gte: hourAgo } } }),
    prisma.phoneCode.count({ where: { ip: opts.ip, createdAt: { gte: hourAgo } } }),
  ]);
  if (perPhone >= MAX_PER_PHONE_PER_HOUR || perIp >= MAX_PER_IP_PER_HOUR) {
    throw new AppError("Çok fazla kod istendi. Lütfen bir saat sonra tekrar deneyin.");
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.phoneCode.updateMany({
    where: { phone: opts.phone, purpose: opts.purpose, consumedAt: null },
    data: { consumedAt: now },
  });
  const row = await prisma.phoneCode.create({
    data: {
      phone: opts.phone,
      purpose: opts.purpose,
      userId: opts.userId ?? null,
      codeHash: hashCode(opts.phone, opts.purpose, code),
      ip: opts.ip,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });

  const { siteName } = await getSettings();
  const text =
    opts.purpose === "RESET"
      ? `${siteName} sifre sifirlama kodunuz: ${code}. 5 dakika gecerlidir. Bu kodu kimseyle paylasmayin.`
      : `${siteName} dogrulama kodunuz: ${code}. 5 dakika gecerlidir. Bu kodu kimseyle paylasmayin.`;
  try {
    await sendSms(opts.phone, ascii(text));
  } catch (e) {
    // Gönderilemeyen kod sınırları boşa harcamasın
    await prisma.phoneCode.delete({ where: { id: row.id } });
    if (e instanceof SmsError) {
      console.error("[sms]", e.message);
      throw new AppError("SMS gönderilemedi. Lütfen biraz sonra tekrar deneyin.");
    }
    throw e;
  }
}

/** Kodu doğrular ve tüketir. Yanlış kodda deneme sayısı artar; 5 hatadan sonra kod geçersizleşir. */
export async function verifyCode(opts: { phone: string; purpose: OtpPurpose; code: string; userId?: string }) {
  const code = opts.code.replace(/\D/g, "");
  const row = await prisma.phoneCode.findFirst({
    where: {
      phone: opts.phone,
      purpose: opts.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      ...(opts.userId ? { userId: opts.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new AppError("Kodun süresi dolmuş ya da geçersiz. Yeni kod isteyin.");

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(opts.phone, opts.purpose, code), "hex");
  if (code.length !== 6 || !crypto.timingSafeEqual(expected, given)) {
    const attempts = row.attempts + 1;
    await prisma.phoneCode.update({
      where: { id: row.id },
      data: { attempts, ...(attempts >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
    });
    throw new AppError(
      attempts >= MAX_ATTEMPTS ? "Çok fazla hatalı deneme. Yeni kod isteyin." : `Kod hatalı. Kalan deneme: ${MAX_ATTEMPTS - attempts}.`,
    );
  }
  // Aynı kodun iki kez kullanılmasını engelle
  const res = await prisma.phoneCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (res.count === 0) throw new AppError("Kod zaten kullanıldı. Yeni kod isteyin.");
}
