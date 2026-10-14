import cron from "node-cron";
import { TIMEZONE } from "./dates";
import { createPayoutBatch } from "./payouts";
import { autoCompleteShippedOrders } from "./marketplace";

/** Her çarşamba 09:00'da (İstanbul) ödeme partisini oluşturur; adminler gün içinde transferleri yapar. */
export const PAYOUT_CRON = "0 9 * * 3";
/** Her gün 03:00'te kargolanıp onaylanmayan siparişleri otomatik tamamlar. */
export const AUTO_COMPLETE_CRON = "0 3 * * *";

export async function runWeeklyPayouts() {
  // Ödemeden önce süresi dolan siparişleri tamamla ki kazançlar bu haftaya dahil olsun
  await autoCompleteShippedOrders();
  return createPayoutBatch();
}

const globalForCron = globalThis as unknown as { schedulerStarted?: boolean };

export function startScheduler() {
  if (globalForCron.schedulerStarted) return;
  globalForCron.schedulerStarted = true;

  cron.schedule(
    PAYOUT_CRON,
    async () => {
      try {
        const r = await runWeeklyPayouts();
        console.log(`[zamanlayıcı] ${r.payoutDate} ödeme partisi: ${r.created} ödeme oluşturuldu`);
      } catch (e) {
        console.error("[zamanlayıcı] Haftalık ödeme hatası", e);
      }
    },
    { timezone: TIMEZONE },
  );

  cron.schedule(
    AUTO_COMPLETE_CRON,
    async () => {
      try {
        const n = await autoCompleteShippedOrders();
        if (n) console.log(`[zamanlayıcı] ${n} sipariş otomatik tamamlandı`);
      } catch (e) {
        console.error("[zamanlayıcı] Otomatik tamamlama hatası", e);
      }
    },
    { timezone: TIMEZONE },
  );

  console.log("[zamanlayıcı] Başlatıldı: çarşamba 09:00 ödemeler, her gün 03:00 otomatik onay (Europe/Istanbul)");
}
