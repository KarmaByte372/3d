import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isWednesday } from "@/lib/dates";
import { autoCompleteShippedOrders } from "@/lib/marketplace";
import { runWeeklyPayouts } from "@/lib/scheduler";

/**
 * Harici zamanlayıcı (sistem cron'u, Vercel Cron vb.) için uç nokta.
 * Authorization: Bearer <CRON_SECRET>. Her gün çağrılabilir; ödeme partisi yalnızca çarşamba oluşturulur.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const valid =
    !!secret &&
    given.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!valid) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  if (isWednesday()) {
    const result = await runWeeklyPayouts();
    return NextResponse.json({ payouts: result });
  }
  const autoCompleted = await autoCompleteShippedOrders();
  return NextResponse.json({ autoCompleted });
}
