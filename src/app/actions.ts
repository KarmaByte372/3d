"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/session";
import type { ActionState } from "@/lib/errors";
import { hit, isLimited, minutesLeft, reset } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { normalizeTrMobile } from "@/lib/phone";
import { issueCode } from "@/lib/otp";
import { validateNewPassword } from "@/lib/account";
import { AppError } from "@/lib/errors";

export async function logoutAction() {
  await endSession();
  redirect("/");
}

function safeNext(next: FormDataEntryValue | null, role: string) {
  const home = HOME_BY_ROLE[role] ?? "/";
  if (typeof next !== "string" || !next.startsWith(home) || next.startsWith("//")) return home;
  return next;
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Kaba kuvvet denemelerine karşı: hesap başına 15 dakikada 5, IP başına 30 hatalı deneme
  const h = await headers();
  const ip = clientIp(h);
  const WINDOW = 15 * 60 * 1000;
  const keys = [`email:${email}`, `ip:${ip}`];
  if (isLimited(keys[0], 5, WINDOW) || isLimited(keys[1], 30, WINDOW)) {
    const wait = Math.max(minutesLeft(keys[0]), minutesLeft(keys[1]));
    return { error: `Çok fazla hatalı deneme. ${wait} dakika sonra tekrar deneyin.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    keys.forEach((k) => hit(k, WINDOW));
    return { error: "E-posta veya şifre hatalı." };
  }
  reset(keys[0]);
  if (user.status !== "ACTIVE") return { error: "Hesabınız askıya alınmış. Destek ile iletişime geçin." };
  await startSession(user);
  redirect(safeNext(formData.get("next"), user.role));
}

const registerSchema = z
  .object({
    role: z.enum(["CUSTOMER", "BUSINESS"]),
    name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(100),
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
    phone: z.string().trim().min(10, "Cep telefonu numarası gerekli.").max(20),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
    companyName: z.string().trim().max(150).optional(),
    city: z.string().trim().max(50).optional(),
    terms: z.literal("on", { errorMap: () => ({ message: "Kullanım koşullarını kabul etmelisiniz." }) }),
  })
  .refine((d) => d.role !== "BUSINESS" || (d.companyName && d.companyName.length >= 2), {
    message: "İşletme adı gerekli.",
  })
  .refine((d) => d.role !== "BUSINESS" || (d.city && d.city.length >= 2), { message: "Şehir gerekli." });

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    validateNewPassword(d.password);
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "Geçersiz şifre." };
  }

  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { error: "Bu e-posta ile kayıtlı bir hesap var." };
  }
  const phone = normalizeTrMobile(d.phone);
  if (!phone) return { error: "Geçerli bir cep telefonu numarası girin (05XX XXX XX XX)." };
  if (await prisma.user.findFirst({ where: { phone, phoneVerifiedAt: { not: null } } })) {
    return { error: "Bu telefon numarası başka bir hesapta kayıtlı." };
  }

  const user = await prisma.user.create({
    data: {
      email: d.email,
      name: d.name,
      phone,
      role: d.role,
      passwordHash: await hashPassword(d.password),
      business:
        d.role === "BUSINESS" ? { create: { companyName: d.companyName!, city: d.city! } } : undefined,
    },
  });
  await startSession(user);
  try {
    await issueCode({ phone, purpose: "VERIFY", userId: user.id, ip: clientIp(await headers()) });
  } catch (e) {
    // Gönderilemezse doğrulama sayfasından tekrar istenebilir
    console.error("Kayıt SMS'i gönderilemedi", e);
  }
  redirect("/dogrula");
}
