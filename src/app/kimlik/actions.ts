"use server";

import { redirect } from "next/navigation";
import { requireAnyUser } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { submitIdentity } from "@/lib/identity";

export async function submitIdentityAction(_: ActionState, f: FormData): Promise<ActionState> {
  let role: string;
  try {
    const user = await requireAnyUser();
    if (f.get("consent") !== "on") return { error: "Devam etmek için açık rıza kutusunu işaretleyin." };
    await submitIdentity(user.id, {
      tckn: String(f.get("tckn") ?? ""),
      firstName: String(f.get("firstName") ?? ""),
      lastName: String(f.get("lastName") ?? ""),
      birthYear: Number(f.get("birthYear")),
    });
    role = user.role;
  } catch (e) {
    return toActionError(e);
  }
  redirect(role === "BUSINESS" ? "/isletme/profil?hosgeldin=1" : "/musteri");
}
