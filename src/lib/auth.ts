import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { clientIp, ipMatches, type IpMode } from "./ip";
import { getSettings } from "./settings";
import { isIdentityRequired, needsIdentity } from "./identity";
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

export async function startSession(user: { id: string; role: string; sessionVersion: number }) {
  const token = await signSession({ sub: user.id, role: user.role, ver: user.sessionVersion, ip: clientIp(await headers()) });
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

/** Ağ (IP) değişti mi? Admin → Entegrasyonlar → Oturum güvenliği ayarına göre. */
async function networkChanged(sessionIp: string) {
  const { sessionIpMode } = await getSettings();
  return !ipMatches(sessionIp, clientIp(await headers()), sessionIpMode as IpMode);
}

/** Oturumdaki kullanıcıyı veritabanından yükler; askıya alınmış hesaplar oturumsuz sayılır. */
export async function getCurrentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  // Ağ (IP) değiştiyse oturum geçersiz: kullanıcı yeniden giriş yapmalı
  if (await networkChanged(session.ip)) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { business: true } });
  // Şifre değiştiyse ya da admin sıfırladıysa eski oturumlar geçersizdir
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.ver) return null;
  return user;
}

/** Oturum yoksa giriş sayfasına; ağ değiştiği için düştüyse kullanıcıya nedenini göster. */
async function toLogin(): Promise<never> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  redirect(session && (await networkChanged(session.ip)) ? "/giris?sebep=ag" : "/giris");
}

export async function requireAnyUser() {
  const user = await getCurrentUser();
  if (!user) return toLogin();
  return user;
}

export async function requireUser(role: "CUSTOMER" | "BUSINESS" | "ADMIN") {
  const user = await getCurrentUser();
  if (!user) return toLogin();
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role] ?? "/");
  // Telefonu SMS ile doğrulanmamış kullanıcı panele giremez (adminler hariç)
  if (user.role !== "ADMIN" && !user.phoneVerifiedAt) redirect("/dogrula");
  // TC kimlik zorunluysa ve bilgi verilmemiş ya da reddedilmişse kimlik adımına
  if (needsIdentity(user) && (await isIdentityRequired())) redirect("/kimlik");
  return user;
}
