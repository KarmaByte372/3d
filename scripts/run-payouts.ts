/** Harici cron için: `npm run payouts:run`. Çarşamba değilse yalnızca otomatik teslim onayını çalıştırır. */
import { isWednesday } from "../src/lib/dates";
import { autoCompleteShippedOrders } from "../src/lib/marketplace";
import { runWeeklyPayouts } from "../src/lib/scheduler";
import { prisma } from "../src/lib/db";

async function main() {
  if (isWednesday() || process.argv.includes("--force")) {
    console.log(await runWeeklyPayouts());
  } else {
    console.log(`Bugün çarşamba değil. Otomatik tamamlanan sipariş: ${await autoCompleteShippedOrders()}`);
  }
}

main().finally(() => prisma.$disconnect());
