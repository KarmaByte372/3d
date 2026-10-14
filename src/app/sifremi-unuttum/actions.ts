"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toActionError, type ActionState } from "@/lib/errors";
import { clientIp } from "@/lib/ip";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/phone-verify";

export async function requestResetAction(_: ActionState, f: FormData): Promise<ActionState> {
  let phone: string;
  try {
    phone = await requestPasswordReset(String(f.get("phone") ?? ""), clientIp(await headers()));
  } catch (e) {
    return toActionError(e);
  }
  redirect(`/sifremi-unuttum/kod?tel=${phone}`);
}

export async function resetPasswordAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const next = String(f.get("next") ?? "");
    if (next !== String(f.get("confirm") ?? "")) return { error: "Yeni şifreler birbiriyle eşleşmiyor." };
    await resetPasswordWithCode(String(f.get("phone") ?? ""), String(f.get("code") ?? ""), next);
  } catch (e) {
    return toActionError(e);
  }
  redirect("/giris?sifre=1");
}
