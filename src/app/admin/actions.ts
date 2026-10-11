"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { cancelOrder, completeOrder } from "@/lib/marketplace";
import { parseTL } from "@/lib/money";
import { completeTopUp, rejectTopUp } from "@/lib/payments";
import { markPayoutFailed, markPayoutPaid } from "@/lib/payouts";
import { runWeeklyPayouts } from "@/lib/scheduler";
import { updateSettings } from "@/lib/settings";
import { changeBalance } from "@/lib/wallet";

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
    await prisma.$transaction((tx) =>
      changeBalance(tx, String(f.get("userId")), negative ? -abs : abs, {
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
    });
    revalidatePath("/", "layout");
    return { ok: "Ayarlar kaydedildi. Yeni komisyon oranı bundan sonra kabul edilen siparişlere uygulanır." };
  } catch (e) {
    return toActionError(e);
  }
}
