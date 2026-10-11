import { SignJWT, jwtVerify } from "jose";

/** Edge (middleware) ve Node tarafında ortak kullanılan oturum belirteci yardımcıları. */
export const SESSION_COOKIE = "b3d_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionPayload = { sub: string; role: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET en az 32 karakter olmalı");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export const HOME_BY_ROLE: Record<string, string> = {
  CUSTOMER: "/musteri",
  BUSINESS: "/isletme",
  ADMIN: "/admin",
};
