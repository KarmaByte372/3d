"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { saveModelFile } from "@/lib/files";
import { acceptQuote, completeOrder } from "@/lib/marketplace";
import { parseTL } from "@/lib/money";
import { createBankTransferTopUp, startCardTopUp } from "@/lib/payments";
import { requestWithdrawal } from "@/lib/withdrawals";

const requestSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(120),
  description: z.string().trim().min(10, "Açıklama en az 10 karakter olmalı.").max(5000),
  technology: z.string().trim().max(30).optional(),
  material: z.string().trim().min(2, "Malzeme seçin.").max(50),
  color: z.string().trim().max(50).optional(),
  quantity: z.coerce.number().int().min(1, "Adet en az 1 olmalı.").max(10000),
  city: z.string().trim().min(2, "Şehir girin.").max(50),
  budget: z.string().optional(),
  deadline: z.string().optional(),
});

export async function createRequestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireUser("CUSTOMER");
    const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;

    let budget: number | null = null;
    if (d.budget) {
      budget = parseTL(d.budget);
      if (budget === null) return { error: "Bütçe geçerli bir tutar olmalı." };
    }
    const deadline = d.deadline ? new Date(`${d.deadline}T23:59:00+03:00`) : null;
    if (deadline && (isNaN(deadline.getTime()) || deadline < new Date())) {
      return { error: "Son tarih ileri bir tarih olmalı." };
    }

    const file = formData.get("file");
    const upload = file instanceof File && file.size > 0 ? await saveModelFile(file) : null;

    const created = await prisma.printRequest.create({
      data: {
        customerId: user.id,
        title: d.title,
        description: d.description,
        technology: d.technology || null,
        material: d.material,
        color: d.color || null,
        quantity: d.quantity,
        city: d.city,
        budget,
        deadline,
        fileName: upload?.fileName,
        filePath: upload?.filePath,
      },
    });
    id = created.id;
  } catch (e) {
    return toActionError(e);
  }
  redirect(`/musteri/talep/${id}`);
}

export async function cancelRequestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    const id = String(formData.get("requestId"));
    const res = await prisma.printRequest.updateMany({
      where: { id, customerId: user.id, status: "OPEN" },
      data: { status: "CANCELLED" },
    });
    if (res.count === 0) throw new AppError("Talep iptal edilemedi.");
    await prisma.quote.updateMany({ where: { requestId: id, status: "PENDING" }, data: { status: "REJECTED" } });
    revalidatePath(`/musteri/talep/${id}`);
    return { ok: "Talep iptal edildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function acceptQuoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    await acceptQuote(user.id, String(formData.get("quoteId")));
  } catch (e) {
    return toActionError(e);
  }
  redirect("/musteri/siparisler");
}

export async function confirmDeliveryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    await completeOrder(String(formData.get("orderId")), { customerId: user.id, reason: "müşteri onayı" });
    revalidatePath("/musteri/siparisler");
    return { ok: "Teslim onaylandı. Teşekkürler!" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cardTopUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let url: string;
  try {
    const user = await requireUser("CUSTOMER");
    const amount = parseTL(String(formData.get("amount") ?? ""));
    if (amount === null) return { error: "Geçerli bir tutar girin." };
    url = (await startCardTopUp(user.id, amount)).redirectUrl;
  } catch (e) {
    return toActionError(e);
  }
  redirect(url);
}

export async function bankTopUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    const amount = parseTL(String(formData.get("amount") ?? ""));
    if (amount === null) return { error: "Geçerli bir tutar girin." };
    const t = await createBankTransferTopUp(user.id, amount);
    revalidatePath("/musteri/bakiye");
    return { ok: `Bildirim oluşturuldu. Havale açıklamasına ${t.reference} kodunu yazın.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function withdrawAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    const amount = parseTL(String(formData.get("amount") ?? ""));
    if (amount === null) return { error: "Geçerli bir tutar girin." };
    await requestWithdrawal(user.id, amount, String(formData.get("iban") ?? ""), String(formData.get("ibanHolder") ?? ""));
    revalidatePath("/musteri/bakiye");
    return { ok: "Çekim talebin alındı. Yönetici onayından sonra IBAN'ına gönderilecek." };
  } catch (e) {
    return toActionError(e);
  }
}
