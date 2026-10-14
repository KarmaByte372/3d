"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";
import { adminResetPassword } from "@/lib/account";
import { approveIdentity, rejectIdentity } from "@/lib/identity";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { cancelOrder, completeOrder } from "@/lib/marketplace";
import { parseTL } from "@/lib/money";
import { completeTopUp, rejectTopUp } from "@/lib/payments";
import { markPayoutFailed, markPayoutPaid } from "@/lib/payouts";
import { runWeeklyPayouts } from "@/lib/scheduler";
import { getSettings, updateSettings } from "@/lib/settings";
import { getPaytrConfig, getSmsConfig, hasSecret, paytrReady, saveIntegration } from "@/lib/integrations";
import { invalidTableLine } from "@/lib/quote-fee";
import { MailError, sendMail } from "@/lib/mail";
import { normalizeTrMobile } from "@/lib/phone";
import { sendSms, SmsError } from "@/lib/sms";
import { changeWallet } from "@/lib/wallet";

async function admin() {
  return requireUser("ADMIN");
}

function done(path: string, ok: string): ActionState {
  revalidatePath(path);
  return { ok };
}

export async function approveTopUpAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    await completeTopUp(String(f.get("topUpId")), `Onaylayan: ${a.email}`);
    return done("/admin/yuklemeler", "Yükleme onaylandı, bakiye eklendi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function rejectTopUpAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    await rejectTopUp(String(f.get("topUpId")), String(f.get("note") ?? "").slice(0, 300));
    return done("/admin/yuklemeler", "Yükleme reddedildi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserStatusAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const userId = String(f.get("userId"));
    if (userId === a.id) throw new AppError("Kendi hesabınızı askıya alamazsınız.");
    const status = f.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    await prisma.user.update({ where: { id: userId }, data: { status } });
    return done("/admin/kullanicilar", status === "SUSPENDED" ? "Hesap askıya alındı." : "Hesap aktifleştirildi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleVerifiedAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const userId = String(f.get("userId"));
    const profile = await prisma.businessProfile.findUniqueOrThrow({ where: { userId } });
    await prisma.businessProfile.update({ where: { userId }, data: { verified: !profile.verified } });
    return done("/admin/kullanicilar", profile.verified ? "Doğrulama kaldırıldı." : "İşletme doğrulandı.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function adjustBalanceAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const raw = String(f.get("amount") ?? "").trim();
    const negative = raw.startsWith("-");
    const abs = parseTL(negative ? raw.slice(1) : raw);
    if (!abs) throw new AppError("Geçerli bir tutar girin (eksi için başına - koyun).");
    const note = String(f.get("note") ?? "").trim();
    if (note.length < 5) throw new AppError("Düzeltme açıklaması zorunlu (en az 5 karakter).");
    const wallet = f.get("wallet") === "CREDIT" ? "CREDIT" : "BALANCE";
    await prisma.$transaction((tx) =>
      changeWallet(tx, String(f.get("userId")), wallet, negative ? -abs : abs, {
        type: "ADJUSTMENT",
        description: `${note} (admin: ${a.email})`,
      }),
    );
    return done("/admin/kullanicilar", "Bakiye düzeltildi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function adminCompleteOrderAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    await completeOrder(String(f.get("orderId")), { reason: `admin onayı: ${a.email}` });
    return done("/admin/siparisler", "Sipariş tamamlandı, kazanç işletmeye aktarıldı.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function adminCancelOrderAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const reason = String(f.get("reason") ?? "").trim();
    if (reason.length < 5) throw new AppError("İptal nedeni yazın.");
    await cancelOrder(String(f.get("orderId")), { reason: `Admin: ${reason}`, allowShipped: true });
    return done("/admin/siparisler", "Sipariş iptal edildi, tutar müşteriye iade edildi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function runPayoutsAction(_: ActionState, _f: FormData): Promise<ActionState> {
  try {
    await admin();
    const r = await runWeeklyPayouts();
    return done("/admin/odemeler", `${r.payoutDate} partisi: ${r.created} yeni ödeme oluşturuldu.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function markPaidAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    await markPayoutPaid(String(f.get("payoutId")), String(f.get("bankReference") ?? "").trim().slice(0, 100));
    return done("/admin/odemeler", "Ödendi olarak işaretlendi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function markFailedAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    await markPayoutFailed(String(f.get("payoutId")), String(f.get("reason") ?? "").trim().slice(0, 300));
    return done("/admin/odemeler", "Başarısız işaretlendi, tutar işletme bakiyesine iade edildi.");
  } catch (e) {
    return toActionError(e);
  }
}

const COMPANY_KEYS = [
  "companyTitle",
  "companyAddress",
  "companyTaxOffice",
  "companyTaxNumber",
  "companyMersis",
  "companyEmail",
  "companyPhone",
  "companyKep",
] as const;

function companyFields(f: FormData) {
  const siteName = String(f.get("siteName") ?? "").trim();
  if (siteName.length < 2 || siteName.length > 40) throw new AppError("Site adı 2-40 karakter olmalı.");
  const out: Record<string, string> = { siteName };
  for (const k of COMPANY_KEYS) out[k] = String(f.get(k) ?? "").trim().slice(0, 300);
  if (!out.companyTitle) throw new AppError("Şirket unvanı boş olamaz.");
  return out;
}

export async function updateSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const pct = Number(String(f.get("commissionPercent") ?? "").replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) throw new AppError("Komisyon %0 ile %50 arasında olmalı.");
    const minPayout = parseTL(String(f.get("minPayout") ?? ""));
    const minTopUp = parseTL(String(f.get("minTopUp") ?? ""));
    const maxTopUp = parseTL(String(f.get("maxTopUp") ?? ""));
    if (minPayout === null || minTopUp === null || maxTopUp === null || minTopUp > maxTopUp) {
      throw new AppError("Tutar alanlarını kontrol edin.");
    }
    const autoCompleteDays = Number(f.get("autoCompleteDays"));
    const maxQuotesPerRequest = Number(f.get("maxQuotesPerRequest"));
    if (!Number.isInteger(autoCompleteDays) || autoCompleteDays < 1 || autoCompleteDays > 60) {
      throw new AppError("Otomatik onay süresi 1-60 gün olmalı.");
    }
    if (!Number.isInteger(maxQuotesPerRequest) || maxQuotesPerRequest < 1 || maxQuotesPerRequest > 50) {
      throw new AppError("Teklif sınırı 1-50 olmalı.");
    }
    await updateSettings({
      commissionBps: Math.round(pct * 100),
      minPayout,
      minTopUp,
      maxTopUp,
      autoCompleteDays,
      maxQuotesPerRequest,
      bankName: String(f.get("bankName") ?? "").slice(0, 100),
      bankIban: String(f.get("bankIban") ?? "").slice(0, 40),
      bankAccountHolder: String(f.get("bankAccountHolder") ?? "").slice(0, 150),
      ...companyFields(f),
    });
    revalidatePath("/", "layout");
    return { ok: "Ayarlar kaydedildi. Yeni komisyon oranı bundan sonra kabul edilen siparişlere uygulanır." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetUserPasswordAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const userId = String(f.get("userId"));
    if (userId === a.id) throw new AppError("Kendi şifrenizi Hesabım sayfasından değiştirin.");
    const temp = await adminResetPassword(userId);
    return { ok: `Geçici şifre: ${temp}. Kullanıcıya güvenli bir kanaldan iletin; tüm oturumları kapatıldı.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function createAdminAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    const name = String(f.get("name") ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError("Geçerli bir e-posta girin.");
    if (name.length < 2) throw new AppError("Ad soyad girin.");
    if (await prisma.user.findUnique({ where: { email } })) throw new AppError("Bu e-posta zaten kayıtlı.");
    const temp = crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({ data: { email, name, role: "ADMIN", passwordHash: await hashPassword(temp) } });
    return done("/admin/kullanicilar", `Yönetici oluşturuldu. Geçici şifre: ${temp} (ilk girişte Hesabım'dan değiştirilmeli)`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveQuoteFeeSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const money = (k: string) => {
      const v = parseTL(String(f.get(k) ?? ""));
      if (v === null) throw new AppError("Tutar alanlarını kontrol edin.");
      return v;
    };
    const pct = (k: string, min: number, max: number) => {
      const v = Number(String(f.get(k) ?? "").replace(",", "."));
      if (!Number.isFinite(v) || v < min || v > max) throw new AppError(`Yüzde alanlarını kontrol edin (${min}-${max}).`);
      return v;
    };
    const table = (k: string, label: string) => {
      const v = String(f.get(k) ?? "").replace(/\r/g, "").trim().slice(0, 3000);
      const bad = invalidTableLine(v);
      if (bad) throw new AppError(`${label}: "${bad}" satırı "anahtar=sayı" biçiminde olmalı.`);
      return v;
    };
    const quoteFeeMin = money("quoteFeeMin");
    const quoteFeeMax = money("quoteFeeMax");
    if (quoteFeeMin > quoteFeeMax) throw new AppError("En düşük ücret en yüksekten büyük olamaz.");
    const quoteFeeMinReviews = Number(f.get("quoteFeeMinReviews"));
    if (!Number.isInteger(quoteFeeMinReviews) || quoteFeeMinReviews < 0 || quoteFeeMinReviews > 100) {
      throw new AppError("Değerlendirme sayısı 0-100 olmalı.");
    }
    await updateSettings({
      quoteFeeEnabled: f.get("quoteFeeEnabled") === "on" ? "true" : "false",
      quoteFeeDefaultBase: money("quoteFeeDefaultBase"),
      quoteFeeMin,
      quoteFeeMax,
      quoteFeeCategories: table("quoteFeeCategories", "Kategori tabanları"),
      quoteFeeCities: table("quoteFeeCities", "Şehir çarpanları"),
      quoteFeeBudgets: table("quoteFeeBudgets", "İş büyüklüğü"),
      quoteFeeRatingTiers: table("quoteFeeRatingTiers", "Puan indirimi"),
      quoteFeeFiveStarStep: pct("quoteFeeFiveStarStep", 0, 20),
      quoteFeeFiveStarCap: pct("quoteFeeFiveStarCap", 0, 90),
      quoteFeeMinReviews,
      quoteFeeMaxDiscount: pct("quoteFeeMaxDiscount", 0, 90),
    });
    revalidatePath("/", "layout");
    return { ok: "Teklif ücreti ayarları kaydedildi. Yeni teklifler bu ayarlarla ücretlendirilir." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function savePaytrSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const merchantId = String(f.get("paytrMerchantId") ?? "").trim();
    if (merchantId && !/^\d{3,12}$/.test(merchantId)) throw new AppError("Mağaza no yalnızca rakamlardan oluşmalı.");
    const maxInst = Number(f.get("paytrMaxInstallment") ?? 0);
    const enabled = f.get("paytrEnabled") === "on";
    const values = {
      paytrEnabled: enabled ? "true" : "false",
      paytrMerchantId: merchantId,
      paytrTestMode: f.get("paytrTestMode") === "on" ? "true" : "false",
      paytrMaxInstallment: String(Number.isInteger(maxInst) && maxInst >= 0 && maxInst <= 12 ? maxInst : 0),
    };
    const sec = (k: string) => ({ value: String(f.get(k) ?? "").trim(), clear: f.get(`${k}Clear`) === "on" });
    await saveIntegration(values, { paytrMerchantKey: sec("paytrMerchantKey"), paytrMerchantSalt: sec("paytrMerchantSalt") });
    if (enabled && !paytrReady(await getPaytrConfig())) {
      return { error: "Kaydedildi, ancak PayTR'yi açmak için mağaza no, Merchant Key ve Merchant Salt gerekli." };
    }
    revalidatePath("/", "layout");
    return { ok: "PayTR ayarları kaydedildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveSmsSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const provider = f.get("smsProvider") === "netgsm" ? "netgsm" : "log";
    const values = {
      smsProvider: provider,
      netgsmUsercode: String(f.get("netgsmUsercode") ?? "").trim().slice(0, 50),
      netgsmMsgheader: String(f.get("netgsmMsgheader") ?? "").trim().slice(0, 30),
      netgsmEndpoint: f.get("netgsmEndpoint") === "sms" ? "sms" : "otp",
    };
    const password = String(f.get("netgsmPassword") ?? "");
    const clear = f.get("netgsmPasswordClear") === "on";
    if (provider === "netgsm") {
      if (!values.netgsmUsercode || !values.netgsmMsgheader) throw new AppError("Netgsm için kullanıcı kodu ve mesaj başlığı gerekli.");
      if (clear || (!password && !(await hasSecret("netgsmPassword")))) throw new AppError("Netgsm şifresi gerekli.");
    }
    await saveIntegration(values, { netgsmPassword: { value: password, clear } });
    return done("/admin/entegrasyonlar", provider === "netgsm" ? "SMS ayarları kaydedildi. Test SMS'i göndererek kontrol edin." : "Kaydedildi. SMS gönderimi kapalı (kodlar loga yazılır).");
  } catch (e) {
    return toActionError(e);
  }
}

export async function testSmsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const phone = normalizeTrMobile(String(f.get("testPhone") ?? ""));
    if (!phone) throw new AppError("Geçerli bir cep telefonu girin.");
    const { siteName } = await getSettings();
    await sendSms(phone, `${siteName} test mesaji. SMS ayarlariniz calisiyor.`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i"));
    const cfg = await getSmsConfig();
    return { ok: cfg.provider === "netgsm" ? "Test SMS'i Netgsm'e iletildi. Telefonunuzu kontrol edin." : "SMS gönderimi kapalı: mesaj yalnızca sunucu loguna yazıldı." };
  } catch (e) {
    if (e instanceof SmsError) return { error: e.message };
    return toActionError(e);
  }
}

export async function saveSmtpSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const enabled = f.get("smtpEnabled") === "on";
    const port = Number(f.get("smtpPort"));
    const values = {
      smtpEnabled: String(enabled),
      smtpHost: String(f.get("smtpHost") ?? "").trim().slice(0, 200),
      smtpPort: String(Number.isInteger(port) && port > 0 && port < 65536 ? port : 587),
      smtpSecure: String(f.get("smtpSecure") === "on"),
      smtpUser: String(f.get("smtpUser") ?? "").trim().slice(0, 200),
      smtpFrom: String(f.get("smtpFrom") ?? "").trim().slice(0, 200),
    };
    if (enabled && (!values.smtpHost || !values.smtpFrom)) throw new AppError("SMTP sunucusu ve gönderen adresi gerekli.");
    await saveIntegration(values, {
      smtpPassword: { value: String(f.get("smtpPassword") ?? ""), clear: f.get("smtpPasswordClear") === "on" },
    });
    return done("/admin/entegrasyonlar", "SMTP ayarları kaydedildi.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function testMailAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const to = String(f.get("testEmail") ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new AppError("Geçerli bir e-posta girin.");
    const { siteName } = await getSettings();
    await sendMail(to, `${siteName} SMTP testi`, `Bu bir test e-postasıdır. ${siteName} SMTP ayarlarınız çalışıyor.`);
    return { ok: `Test e-postası ${to} adresine gönderildi.` };
  } catch (e) {
    if (e instanceof MailError) return { error: `E-posta gönderilemedi: ${e.message}` };
    return toActionError(e);
  }
}

export async function approveIdentityAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    await approveIdentity(String(f.get("userId")));
    return done("/admin/kullanicilar", "Kimlik onaylandı.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function rejectIdentityAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    await rejectIdentity(String(f.get("userId")), String(f.get("note") ?? "").slice(0, 300));
    return done("/admin/kullanicilar", "Kimlik reddedildi; kullanıcıdan bilgilerini yeniden girmesi istenecek.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveIdentitySettingAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    await admin();
    const on = f.get("identityRequired") === "on";
    await updateSettings({ identityRequired: on ? "true" : "false" });
    revalidatePath("/", "layout");
    return {
      ok: on
        ? "TC kimlik doğrulaması açıldı. Kimliği olmayan kullanıcılar bir sonraki sayfada kimlik adımına yönlendirilecek."
        : "TC kimlik doğrulaması kapatıldı. Kimse kimlik adımına yönlendirilmez; atölyeler onaysız teklif verebilir.",
    };
  } catch (e) {
    return toActionError(e);
  }
}
