"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAnyUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { clientIp, siteOrigin } from "@/lib/ip";
import { parseTL } from "@/lib/money";
import { completeTopUp, createBankTransferTopUp, getPaymentProvider, startCardTopUp } from "@/lib/payments";

/** Müşteri bakiyesine veya atölye teklif bakiyesine yükleme yapabilen, telefonu doğrulanmış kullanıcı */
async function payer() {
  const user = await requireAnyUser();
  if (user.role === "ADMIN") throw new AppError("Yönetici hesabı bakiye yükleyemez.");
  if (!user.phoneVerifiedAt) redirect("/dogrula");
  return user;
}

const walletPath = (role: string) => (role === "BUSINESS" ? "/isletme/bakiye" : "/musteri/bakiye");

export async function cardTopUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let url: string;
  try {
    const user = await payer();
    const amount = parseTL(String(formData.get("amount") ?? ""));
    if (amount === null) return { error: "Geçerli bir tutar girin." };
    const h = await headers();
    url = (await startCardTopUp(user, amount, { ip: clientIp(h), origin: siteOrigin(h) })).redirectUrl;
  } catch (e) {
    return toActionError(e);
  }
  redirect(url);
}

export async function bankTopUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await payer();
    const amount = parseTL(String(formData.get("amount") ?? ""));
    if (amount === null) return { error: "Geçerli bir tutar girin." };
    const t = await createBankTransferTopUp(user, amount);
    revalidatePath(walletPath(user.role));
    return { ok: `Bildirim oluşturuldu. Havale açıklamasına ${t.reference} kodunu yazın.` };
  } catch (e) {
    return toActionError(e);
  }
}

/** Yalnızca test sağlayıcısı (PAYMENT_PROVIDER=mock) açıkken */
export async function confirmMockPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let role: string;
  try {
    if ((await getPaymentProvider())?.name !== "mock") throw new AppError("Test ödemesi kapalı.");
    const user = await payer();
    role = user.role;
    const topUp = await prisma.topUp.findFirst({
      where: { reference: String(formData.get("ref")), userId: user.id, method: "CARD", provider: "mock" },
    });
    if (!topUp) throw new AppError("Ödeme bulunamadı.");
    await completeTopUp(topUp.id, "Test ödemesi");
  } catch (e) {
    return toActionError(e);
  }
  redirect(walletPath(role));
}
