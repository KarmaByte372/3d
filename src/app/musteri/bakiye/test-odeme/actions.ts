"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { completeTopUp, getPaymentProvider } from "@/lib/payments";

export async function confirmMockPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (getPaymentProvider()?.name !== "mock") throw new AppError("Test ödemesi kapalı.");
    const user = await requireUser("CUSTOMER");
    const topUp = await prisma.topUp.findFirst({
      where: { reference: String(formData.get("ref")), userId: user.id, method: "CARD" },
    });
    if (!topUp) throw new AppError("Ödeme bulunamadı.");
    await completeTopUp(topUp.id, "Test ödemesi");
  } catch (e) {
    return toActionError(e);
  }
  redirect("/musteri/bakiye");
}
