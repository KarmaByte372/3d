"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changePassword } from "@/lib/account";
import { requireAnyUser, startSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toActionError, type ActionState } from "@/lib/errors";

export async function updateAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireAnyUser();
    const parsed = z
      .object({
        name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(100),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });
    revalidatePath("/", "layout");
    return { ok: "Bilgileriniz kaydedildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireAnyUser();
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    if (next !== String(formData.get("confirm") ?? "")) return { error: "Yeni şifreler birbiriyle eşleşmiyor." };
    const updated = await changePassword(user.id, current, next);
    // Diğer cihazlardaki oturumlar kapandı; bu cihazda yeni sürümle oturumu yenile
    await startSession(updated);
    return { ok: "Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı." };
  } catch (e) {
    return toActionError(e);
  }
}
