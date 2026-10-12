"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { normalizeTrIban } from "@/lib/iban";
import { cancelOrder, markShipped, submitQuote, withdrawQuote } from "@/lib/marketplace";
import { parseTL } from "@/lib/money";

export async function submitQuoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("BUSINESS");
    const price = parseTL(String(formData.get("price") ?? ""));
    if (price === null) return { error: "Geçerli bir fiyat girin." };
    const deliveryDays = Number(formData.get("deliveryDays"));
    if (!Number.isInteger(deliveryDays)) return { error: "Teslim süresi tam sayı olmalı." };
    const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
    const requestId = String(formData.get("requestId"));
    await submitQuote({ businessId: user.id, requestId, price, deliveryDays, message });
    revalidatePath(`/isletme/talepler/${requestId}`);
    return { ok: "Teklifin gönderildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function withdrawQuoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("BUSINESS");
    await withdrawQuote(user.id, String(formData.get("quoteId")));
    revalidatePath("/isletme/teklifler");
    return { ok: "Teklif geri çekildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function markShippedAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("BUSINESS");
    const tracking = String(formData.get("trackingInfo") ?? "").trim().slice(0, 200);
    await markShipped(user.id, String(formData.get("orderId")), tracking);
    revalidatePath("/isletme/siparisler");
    return { ok: "Sipariş kargolandı olarak işaretlendi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelOrderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("BUSINESS");
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 5) throw new AppError("İptal nedeni yazın (en az 5 karakter).");
    await cancelOrder(String(formData.get("orderId")), { reason: reason.slice(0, 500), businessId: user.id });
    revalidatePath("/isletme/siparisler");
    return { ok: "Sipariş iptal edildi, tutar müşteriye iade edildi." };
  } catch (e) {
    return toActionError(e);
  }
}

const profileSchema = z.object({
  companyName: z.string().trim().min(2, "İşletme adı gerekli.").max(150),
  taxNumber: z.string().trim().max(20).optional(),
  city: z.string().trim().min(2, "Şehir gerekli.").max(50),
  description: z.string().trim().max(3000).optional(),
  technologies: z.string().trim().max(200).optional(),
  materials: z.string().trim().max(300).optional(),
  iban: z.string().trim().max(40).optional(),
  ibanHolder: z.string().trim().max(150).optional(),
});

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("BUSINESS");
    const parsed = profileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;

    let iban: string | null = null;
    if (d.iban) {
      iban = normalizeTrIban(d.iban);
      if (!iban) return { error: "IBAN geçersiz. TR ile başlayan 26 haneli IBAN girin." };
      if (!d.ibanHolder || d.ibanHolder.length < 3) return { error: "IBAN sahibinin adını/unvanını girin." };
    }

    await prisma.$transaction([
      prisma.businessProfile.update({
        where: { userId: user.id },
        data: {
          companyName: d.companyName,
          taxNumber: d.taxNumber || null,
          city: d.city,
          description: d.description ?? "",
          technologies: d.technologies ?? "",
          materials: d.materials ?? "",
          iban,
          ibanHolder: iban ? d.ibanHolder! : null,
        },
      }),
    ]);
    revalidatePath("/isletme", "layout");
    return { ok: "Profil kaydedildi." };
  } catch (e) {
    return toActionError(e);
  }
}
