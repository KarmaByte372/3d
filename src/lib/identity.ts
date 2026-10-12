import "server-only";
import crypto from "node:crypto";
import { prisma } from "./db";
import { AppError } from "./errors";
import { notify, notifyAdmins } from "./notifications";
import { seal, unseal } from "./secret-box";
import { isValidTckn, maskTckn } from "./tckn";

export const MIN_AGE = 18;

/** Aynı TCKN'nin ikinci hesapta kullanılmasını, numarayı açık saklamadan yakalamak için. */
function tcknHash(tckn: string) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`tckn:${tckn}`).digest("hex");
}

/** Türkçe büyük harfe çevirir ve boşlukları sadeleştirir (NVİ kayıtları büyük harflidir). */
function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
}

export type IdentityInput = { tckn: string; firstName: string; lastName: string; birthYear: number };

/**
 * Kullanıcının kimlik bilgilerini alır.
 * Müşteri: algoritma kontrolünden geçerse hemen onaylanır.
 * Atölye: yönetici onayına düşer; onaylanana kadar teklif veremez.
 */
export async function submitIdentity(userId: string, input: IdentityInput, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === "ADMIN") throw new AppError("Yönetici hesapları için kimlik doğrulama gerekmez.");
  if (user.identityStatus === "VERIFIED" || user.identityStatus === "PENDING") {
    throw new AppError("Kimlik bilgileriniz zaten gönderildi.");
  }

  const tckn = input.tckn.replace(/\D/g, "");
  if (!isValidTckn(tckn)) throw new AppError("T.C. kimlik numarası geçersiz. Lütfen kontrol edin.");
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  if (firstName.length < 2 || lastName.length < 2) throw new AppError("Adınızı ve soyadınızı kimliğinizdeki gibi yazın.");
  if (!/^[\p{L} '.-]+$/u.test(firstName + lastName)) throw new AppError("Ad ve soyad yalnızca harf içermeli.");
  const year = now.getFullYear();
  if (!Number.isInteger(input.birthYear) || input.birthYear < 1900 || input.birthYear > year) {
    throw new AppError("Doğum yılı geçersiz.");
  }
  if (year - input.birthYear < MIN_AGE) throw new AppError(`Platformu kullanmak için ${MIN_AGE} yaşından büyük olmalısınız.`);

  const hash = tcknHash(tckn);
  const taken = await prisma.user.findFirst({
    where: { id: { not: userId }, role: user.role, tcknHash: hash, identityStatus: { in: ["PENDING", "VERIFIED"] } },
    select: { id: true },
  });
  if (taken) throw new AppError("Bu T.C. kimlik numarası başka bir hesapta kayıtlı. Destek ile iletişime geçin.");

  const autoApprove = user.role === "CUSTOMER";
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      tcknEnc: seal(tckn),
      tcknHash: hash,
      legalFirstName: firstName,
      legalLastName: lastName,
      birthYear: input.birthYear,
      identityStatus: autoApprove ? "VERIFIED" : "PENDING",
      identityMethod: autoApprove ? "FORMAT" : null,
      identityVerifiedAt: autoApprove ? now : null,
      identityNote: null,
    },
  });
  if (!autoApprove) {
    await notifyAdmins(prisma, {
      title: "Atölye kimlik onayı bekliyor",
      body: `${firstName} ${lastName}`,
      href: "/admin/kullanicilar?kimlik=PENDING",
    });
  }
  return updated;
}

export async function approveIdentity(userId: string) {
  const res = await prisma.user.updateMany({
    where: { id: userId, identityStatus: "PENDING" },
    data: { identityStatus: "VERIFIED", identityMethod: "ADMIN", identityVerifiedAt: new Date(), identityNote: null },
  });
  if (res.count === 0) throw new AppError("Onay bekleyen bir kimlik yok.");
  await notify(prisma, userId, { title: "Kimliğin onaylandı, artık teklif verebilirsin", href: "/isletme/talepler" });
}

/** Reddedilen kullanıcı bilgilerini düzeltip yeniden gönderir; eski numara serbest kalır. */
export async function rejectIdentity(userId: string, note: string) {
  const reason = note.trim() || "Bilgiler kimlikle eşleşmedi";
  const res = await prisma.user.updateMany({
    where: { id: userId, identityStatus: { in: ["PENDING", "VERIFIED"] } },
    data: { identityStatus: "REJECTED", identityMethod: null, identityVerifiedAt: null, identityNote: reason, tcknEnc: null, tcknHash: null },
  });
  if (res.count === 0) throw new AppError("Reddedilecek bir kimlik yok.");
  await notify(prisma, userId, { title: "Kimlik bilgilerin onaylanmadı", body: reason, href: "/kimlik" });
}

/** Ekranda gösterim için maskeli numara (yalnızca son 2 hane açık). */
export function maskedTcknOf(u: { tcknEnc: string | null }) {
  if (!u.tcknEnc) return null;
  const t = unseal(u.tcknEnc);
  return t ? maskTckn(t) : "çözülemedi";
}

export function needsIdentity(u: { role: string; identityStatus: string }) {
  return u.role !== "ADMIN" && (u.identityStatus === "NONE" || u.identityStatus === "REJECTED");
}
