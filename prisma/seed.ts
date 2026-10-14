import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 8) throw new Error("ADMIN_EMAIL ve ADMIN_PASSWORD (en az 8 karakter) .env içinde tanımlanmalı");

  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Yönetici", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    update: {},
  });
  console.log(`Admin hazır: ${email}`);

  if (process.argv.includes("--demo")) {
    const hash = await bcrypt.hash("demo12345", 12);
    await prisma.user.upsert({
      where: { email: "musteri@demo.tr" },
      create: { email: "musteri@demo.tr", name: "Ayşe Demir", role: "CUSTOMER", passwordHash: hash, phone: "5550000001", phoneVerifiedAt: new Date(), identityStatus: "VERIFIED", identityMethod: "ADMIN", legalFirstName: "AYŞE", legalLastName: "DEMİR", birthYear: 1990 },
      update: {},
    });
    await prisma.user.upsert({
      where: { email: "isletme@demo.tr" },
      create: {
        email: "isletme@demo.tr",
        name: "Mehmet Yılmaz",
        role: "BUSINESS",
        passwordHash: hash,
        phone: "5550000002",
        phoneVerifiedAt: new Date(),
        identityStatus: "VERIFIED",
        identityMethod: "ADMIN",
        legalFirstName: "MEHMET",
        legalLastName: "YILMAZ",
        birthYear: 1985,
        credit: 50000, // demo: teklif ücretleri için 500 TL bakiye
        business: {
          create: {
            companyName: "Katman 3D Atölye",
            city: "İstanbul",
            technologies: "FDM, SLA",
            materials: "PLA, PETG, ABS, Reçine",
            iban: "TR330006100519786457841326",
            ibanHolder: "Katman 3D Atölye Ltd. Şti.",
            verified: true,
          },
        },
      },
      update: {},
    });
    console.log("Demo hesaplar: musteri@demo.tr / isletme@demo.tr (şifre: demo12345)");
  }
}

main().finally(() => prisma.$disconnect());
