"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAnyUser } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { clientIp } from "@/lib/ip";
import { cancelPhoneChange, confirmVerification, requestPhoneChange, sendVerificationCode } from "@/lib/phone-verify";
import { HOME_BY_ROLE } from "@/lib/session";

export async function confirmCodeAction(_: ActionState, f: FormData): Promise<ActionState> {
  let role: string;
  try {
    const user = await requireAnyUser();
    await confirmVerification(user.id, String(f.get("code") ?? ""));
    role = user.role;
  } catch (e) {
    return toActionError(e);
  }
  redirect(`${HOME_BY_ROLE[role] ?? "/"}${role === "BUSINESS" ? "/profil?hosgeldin=1" : ""}`);
}

export async function resendCodeAction(_: ActionState): Promise<ActionState> {
  try {
    const user = await requireAnyUser();
    await sendVerificationCode(user.id, clientIp(await headers()));
    return { ok: "Yeni kod gönderildi." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePhoneAction(_: ActionState, f: FormData): Promise<ActionState> {
  try {
    const user = await requireAnyUser();
    await requestPhoneChange(user.id, String(f.get("phone") ?? ""), clientIp(await headers()));
  } catch (e) {
    return toActionError(e);
  }
  redirect("/dogrula");
}

export async function cancelChangeAction(): Promise<void> {
  const user = await requireAnyUser();
  await cancelPhoneChange(user.id);
  redirect(HOME_BY_ROLE[user.role] ? `${HOME_BY_ROLE[user.role]}/hesap` : "/");
}
