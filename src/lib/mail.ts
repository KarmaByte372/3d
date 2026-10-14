import "server-only";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "./integrations";

export class MailError extends Error {}

/** SMTP ile e-posta gönderir. SMTP kapalı veya eksikse MailError fırlatır. */
export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const c = await getSmtpConfig();
  if (!c.enabled) throw new MailError("SMTP kapalı");
  if (!c.host || !c.from) throw new MailError("SMTP sunucusu ve gönderen adresi gerekli");
  const transport = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.password } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  try {
    await transport.sendMail({ from: c.from, to, subject, text, html });
  } catch (e) {
    throw new MailError((e as Error).message);
  } finally {
    transport.close();
  }
}
