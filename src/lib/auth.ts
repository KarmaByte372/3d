import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { HOME_BY_ROLE, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

let dummyHash: string | undefined;

/** Hash yoksa (kullanıcı bulunamadı) da aynı sürede çalışır ki yanıt süresi hesabın varlığını ele vermesin. */
export async function verifyPassword(password: string, hash: string | undefined) {
  if (!hash) {
    dummyHash ??= await bcrypt.hash("zamanlama-esitleme", 12);
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}

export async function startSession(user: { id: string; role: string }) {
  const token = await signSession({ sub: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // HTTPS yokken (ör. yalnızca IP ile erişim) COOKIE_SECURE="false" verilmeli, yoksa tarayıcı çerezi kaydetmez
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Oturumdaki kullanıcıyı veritabanından yükler; askıya alınmış hesaplar oturumsuz sayılır. */
export async function getCurrentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { business: true } });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function requireUser(role: "CUSTOMER" | "BUSINESS" | "ADMIN") {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role] ?? "/");
  return user;
}
