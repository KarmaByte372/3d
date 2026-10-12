"use server";

import { revalidatePath } from "next/cache";
import { requireAnyUser, requireUser } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { openDispute, sendMessage, submitReview } from "@/lib/marketplace";

export async function sendMessageAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const user = await requireAnyUser();
    const orderId = String(f.get("orderId"));
    await sendMessage(orderId, user.id, String(f.get("body") ?? ""));
    revalidatePath(`/musteri/siparisler/${orderId}`);
    revalidatePath(`/isletme/siparisler/${orderId}`);
    return {};
  } catch (e) {
    return toActionError(e);
  }
}

export async function openDisputeAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    const orderId = String(f.get("orderId"));
    await openDispute(user.id, orderId, String(f.get("reason") ?? ""));
    revalidatePath(`/musteri/siparisler/${orderId}`);
    return { ok: "Sorun bildirildi. Ödemen, yönetici karar verene kadar güvencede tutulacak." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitReviewAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("CUSTOMER");
    const orderId = String(f.get("orderId"));
    await submitReview(user.id, orderId, Number(f.get("rating")), String(f.get("comment") ?? ""));
    revalidatePath(`/musteri/siparisler/${orderId}`);
    return { ok: "Değerlendirmen için teşekkürler!" };
  } catch (e) {
    return toActionError(e);
  }
}
