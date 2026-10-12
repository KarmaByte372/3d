import { prisma } from "@/lib/db";

export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payoutBatch.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.printRequest.deleteMany();
  await prisma.topUp.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
}

let n = 0;
export async function makeCustomer(balance = 0) {
  n++;
  return prisma.user.create({
    data: { email: `c${n}@test.tr`, passwordHash: "x", name: `Müşteri ${n}`, role: "CUSTOMER", balance },
  });
}

export async function makeBusiness(opts: { iban?: boolean; balance?: number } = {}) {
  n++;
  return prisma.user.create({
    data: {
      email: `b${n}@test.tr`,
      passwordHash: "x",
      name: `İşletme ${n}`,
      role: "BUSINESS",
      balance: opts.balance ?? 0,
      business: {
        create: {
          companyName: `Baskı ${n}`,
          city: "İstanbul",
          iban: opts.iban === false ? null : "TR330006100519786457841326",
          ibanHolder: opts.iban === false ? null : `Baskı ${n} Ltd.`,
        },
      },
    },
  });
}

export async function makeRequest(customerId: string) {
  return prisma.printRequest.create({
    data: { customerId, title: "Dişli parçası", description: "PLA, 20% doluluk", material: "PLA", city: "İstanbul" },
  });
}
