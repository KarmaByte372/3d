import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getPaytrConfig } from "@/lib/integrations";
import { completeTopUp, rejectTopUp } from "@/lib/payments";
import { verifyCallback } from "@/lib/paytr";

export const dynamic = "force-dynamic";

/**
 * PayTR ödeme bildirimi (PayTR paneli → Bildirim URL: https://alanadi/api/paytr/callback).
 * İmza doğrulanır, yükleme bir kez işlenir ve PayTR'nin beklediği düz "OK" yanıtı döner.
 * "OK" dönülmezse PayTR bildirimi tekrar gönderir; bu yüzden zaten işlenmiş bildirimler de "OK" alır.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const cfg = await getPaytrConfig();
  if (!verifyCallback(body, cfg.merchantKey, cfg.merchantSalt)) {
    console.warn("PayTR bildirimi: geçersiz imza", body.merchant_oid);
    return new Response("PAYTR notification failed: bad hash", { status: 400 });
  }

  const topUp = await prisma.topUp.findUnique({ where: { reference: body.merchant_oid } });
  if (!topUp || topUp.method !== "CARD") {
    console.warn("PayTR bildirimi: yükleme bulunamadı", body.merchant_oid);
    return new Response("OK");
  }
  if (topUp.status === "PENDING") {
    try {
      if (body.status === "success") {
        await completeTopUp(topUp.id, `PayTR · ${body.payment_type ?? "kart"} · tahsil edilen ${body.total_amount} kuruş`);
      } else {
        const reason = [body.failed_reason_code, body.failed_reason_msg].filter(Boolean).join(" ");
        await rejectTopUp(topUp.id, `PayTR: ${reason || "ödeme başarısız"}`.slice(0, 300));
      }
    } catch (e) {
      if (!(e instanceof AppError)) throw e; // zaten işlenmiş (eşzamanlı bildirim)
    }
  }
  return new Response("OK");
}
