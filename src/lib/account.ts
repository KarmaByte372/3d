import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { AppError } from "./errors";
import { notify } from "./notifications";

export const MIN_PASSWORD = 8;

export function validateNewPassword(pw: string) {
  if (pw.length < MIN_PASSWORD) throw new AppError(`Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.`);
  if (pw.length > 200) throw new AppError("Şifre çok uzun.");
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(pw) || !/\d/.test(pw)) throw new AppError("Şifre en az bir harf ve bir rakam içermeli.");
}

/** Kullanıcı kendi şifresini değiştirir; diğer cihazlardaki oturumlar kapanır. */
export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new AppError("Mevcut şifre hatalı.");
  if (current === next) throw new AppError("Yeni şifre eskisiyle aynı olamaz.");
  validateNewPassword(next);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(next, 12), sessionVersion: { increment: 1 } },
  });
}

/** Admin bir kullanıcıya geçici şifre atar; kullanıcının tüm oturumları kapanır. */
export async function adminResetPassword(userId: string) {
  const temp = crypto.randomBytes(9).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(temp, 12), sessionVersion: { increment: 1 } },
  });
  await notify(prisma, userId, {
    title: "Şifreniz yönetici tarafından sıfırlandı",
    body: "Geçici şifrenizle giriş yaptıktan sonra Hesabım sayfasından yeni bir şifre belirleyin.",
  });
  return temp;
}
