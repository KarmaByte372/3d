import "server-only";
import { prisma } from "./db";
import { seal, unseal } from "./secret-box";

/**
 * Netgsm ve SMTP ayarları. Admin panelinden girilen değerler veritabanında ("int." önekli Setting kayıtları)
 * tutulur; şifreler şifrelenmiştir. Panelden hiç girilmemiş alanlar için .env değerleri kullanılır.
 */
const P = "int.";

async function rows() {
  const list = await prisma.setting.findMany({ where: { key: { startsWith: P } } });
  return new Map(list.map((r) => [r.key.slice(P.length), r.value]));
}

function pick(db: Map<string, string>, key: string, env: string | undefined, fallback = "") {
  return db.has(key) ? db.get(key)! : (env ?? fallback);
}

function secret(db: Map<string, string>, key: string, env: string | undefined) {
  if (db.has(key)) return db.get(key) ? unseal(db.get(key)!) ?? "" : "";
  return env ?? "";
}

export type SmsConfig = {
  provider: "netgsm" | "log";
  usercode: string;
  password: string;
  msgheader: string;
  endpoint: "otp" | "sms";
};

export async function getSmsConfig(): Promise<SmsConfig> {
  const db = await rows();
  const e = process.env;
  return {
    provider: pick(db, "smsProvider", e.SMS_PROVIDER, "log") === "netgsm" ? "netgsm" : "log",
    usercode: pick(db, "netgsmUsercode", e.NETGSM_USERCODE),
    password: secret(db, "netgsmPassword", e.NETGSM_PASSWORD),
    msgheader: pick(db, "netgsmMsgheader", e.NETGSM_MSGHEADER),
    endpoint: pick(db, "netgsmEndpoint", e.NETGSM_ENDPOINT, "otp") === "sms" ? "sms" : "otp",
  };
}

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const db = await rows();
  const e = process.env;
  return {
    enabled: pick(db, "smtpEnabled", e.SMTP_ENABLED, "false") === "true",
    host: pick(db, "smtpHost", e.SMTP_HOST),
    port: Number(pick(db, "smtpPort", e.SMTP_PORT, "587")) || 587,
    secure: pick(db, "smtpSecure", e.SMTP_SECURE, "false") === "true",
    user: pick(db, "smtpUser", e.SMTP_USER),
    password: secret(db, "smtpPassword", e.SMTP_PASSWORD),
    from: pick(db, "smtpFrom", e.SMTP_FROM),
  };
}

/** Ekranda göstermek için: şifrelerin kendisi değil, yalnızca kayıtlı olup olmadığı. */
export async function hasSecret(key: "netgsmPassword" | "smtpPassword") {
  const db = await rows();
  if (db.has(key)) return !!db.get(key);
  return !!(key === "netgsmPassword" ? process.env.NETGSM_PASSWORD : process.env.SMTP_PASSWORD);
}

/**
 * Ayarları kaydeder. Şifre alanı boş bırakılırsa mevcut şifre korunur; clearSecret ile silinir.
 */
export async function saveIntegration(
  values: Record<string, string>,
  secrets: Record<string, { value: string; clear: boolean }>,
) {
  const ops = Object.entries(values).map(([k, v]) =>
    prisma.setting.upsert({ where: { key: P + k }, create: { key: P + k, value: v }, update: { value: v } }),
  );
  for (const [k, s] of Object.entries(secrets)) {
    if (s.clear) {
      ops.push(prisma.setting.upsert({ where: { key: P + k }, create: { key: P + k, value: "" }, update: { value: "" } }));
    } else if (s.value) {
      const v = seal(s.value);
      ops.push(prisma.setting.upsert({ where: { key: P + k }, create: { key: P + k, value: v }, update: { value: v } }));
    }
  }
  await prisma.$transaction(ops);
}
