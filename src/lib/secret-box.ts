import "server-only";
import crypto from "node:crypto";

/**
 * Entegrasyon şifrelerini (Netgsm, SMTP) veritabanında AES-256-GCM ile şifreler.
 * Anahtar SESSION_SECRET'tan türetilir; SESSION_SECRET değişirse kayıtlı şifreler yeniden girilmelidir.
 */
function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET en az 32 karakter olmalı");
  return crypto.createHash("sha256").update(`integrations:${s}`).digest();
}

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

/** Çözülemezse (anahtar değişmiş, veri bozuk) null döner. */
export function unseal(sealed: string): string | null {
  try {
    const [v, iv, tag, enc] = sealed.split(":");
    if (v !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
