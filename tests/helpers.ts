import { prisma } from "@/lib/db";

export async function resetDb() {
  await prisma.phoneCode.deleteMany();
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
    data: { email: `c${n}@test.tr`, passwordHash: "x", name: `Müşteri ${n}`, role: "CUSTOMER", balance, identityStatus: "VERIFIED" },
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
      identityStatus: "VERIFIED",
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

/** Algoritmaya uygun rastgele T.C. kimlik numarası (test için) */
export function fakeTckn(seed = Math.floor(Math.random() * 1e8)): string {
  const d = String(100000000 + (seed % 899999999)).slice(0, 9).split("").map(Number);
  if (d[0] === 0) d[0] = 1;
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  d.push((((odd * 7 - even) % 10) + 10) % 10);
  d.push(d.reduce((a, b) => a + b, 0) % 10);
  return d.join("");
}
