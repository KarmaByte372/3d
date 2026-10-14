import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { AppError } from "./errors";
import { validateNewPassword } from "./account";
import { issueCode, verifyCode } from "./otp";
import { normalizeTrMobile } from "./phone";

/** Doğrulanması gereken numara: değişim bekleyen numara, yoksa henüz doğrulanmamış mevcut numara. */
export function targetPhone(u: { phone: string | null; phoneVerifiedAt: Date | null; pendingPhone: string | null }) {
  return u.pendingPhone ?? (u.phoneVerifiedAt ? null : u.phone);
}

async function assertPhoneFree(phone: string, exceptUserId?: string) {
  const other = await prisma.user.findFirst({
    where: { phone, phoneVerifiedAt: { not: null }, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    select: { id: true },
  });
  if (other) throw new AppError("Bu telefon numarası başka bir hesapta kayıtlı.");
}

export function parsePhone(input: string) {
  const phone = normalizeTrMobile(input);
  if (!phone) throw new AppError("Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).");
  return phone;
}

export async function sendVerificationCode(userId: string, ip: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const phone = targetPhone(user);
  if (!phone) throw new AppError("Doğrulanacak bir numara yok.");
  await issueCode({ phone, purpose: "VERIFY", userId, ip });
}

/** Kod doğruysa numara hesaba doğrulanmış olarak yazılır. */
export async function confirmVerification(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const phone = targetPhone(user);
  if (!phone) throw new AppError("Doğrulanacak bir numara yok.");
  await verifyCode({ phone, purpose: "VERIFY", code, userId });
  await assertPhoneFree(phone, userId);
  return prisma.user.update({
    where: { id: userId },
    data: { phone, pendingPhone: null, phoneVerifiedAt: new Date() },
  });
}

/** Yeni numara kaydedilir ve ona kod gönderilir; doğrulanana kadar eski numara geçerli kalır. */
export async function requestPhoneChange(userId: string, input: string, ip: string) {
  const phone = parsePhone(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.phoneVerifiedAt && user.phone === phone) throw new AppError("Bu numara zaten hesabınızda doğrulanmış.");
  await assertPhoneFree(phone, userId);
  if (user.phoneVerifiedAt) await prisma.user.update({ where: { id: userId }, data: { pendingPhone: phone } });
  else await prisma.user.update({ where: { id: userId }, data: { phone, pendingPhone: null } });
  await issueCode({ phone, purpose: "VERIFY", userId, ip });
}

export async function cancelPhoneChange(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { pendingPhone: null } });
}

/**
 * Şifre sıfırlama kodu ister. Numara kayıtlı değilse de aynı yanıt verilir
 * (hangi numaraların kayıtlı olduğu dışarıdan anlaşılmasın).
 */
export async function requestPasswordReset(input: string, ip: string) {
  const phone = parsePhone(input);
  const user = await prisma.user.findFirst({ where: { phone, phoneVerifiedAt: { not: null }, status: "ACTIVE" } });
  if (user) await issueCode({ phone, purpose: "RESET", userId: user.id, ip });
  return phone;
}

export async function resetPasswordWithCode(input: string, code: string, newPassword: string) {
  const phone = parsePhone(input);
  validateNewPassword(newPassword);
  const user = await prisma.user.findFirst({ where: { phone, phoneVerifiedAt: { not: null }, status: "ACTIVE" } });
  if (!user) throw new AppError("Kodun süresi dolmuş ya da geçersiz. Yeni kod isteyin.");
  await verifyCode({ phone, purpose: "RESET", code, userId: user.id });
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12), sessionVersion: { increment: 1 } },
  });
}
