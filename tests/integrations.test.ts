import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getSmsConfig, getSmtpConfig, hasSecret, saveIntegration } from "@/lib/integrations";
import { MailError, sendMail } from "@/lib/mail";
import { seal, unseal } from "@/lib/secret-box";
import { sendSms, SmsError } from "@/lib/sms";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

const netgsmOn = () =>
  saveIntegration(
    { smsProvider: "netgsm", netgsmUsercode: "8501234567", netgsmMsgheader: "DIGITUVA", netgsmEndpoint: "otp" },
    { netgsmPassword: { value: "gizli-sifre", clear: false } },
  );

describe("şifreli saklama", () => {
  it("şifreler çözülebilir ama veritabanında açık metin olarak durmaz", async () => {
    expect(unseal(seal("abc123"))).toBe("abc123");
    expect(unseal("v1:bozuk:veri:x")).toBeNull();
    await netgsmOn();
    const row = await prisma.setting.findUniqueOrThrow({ where: { key: "int.netgsmPassword" } });
    expect(row.value).not.toContain("gizli-sifre");
    expect((await getSmsConfig()).password).toBe("gizli-sifre");
  });

  it("boş şifre mevcut şifreyi korur, 'sil' kaldırır", async () => {
    await netgsmOn();
    await saveIntegration({ netgsmMsgheader: "YENI" }, { netgsmPassword: { value: "", clear: false } });
    expect((await getSmsConfig()).password).toBe("gizli-sifre");
    await saveIntegration({}, { netgsmPassword: { value: "", clear: true } });
    expect(await hasSecret("netgsmPassword")).toBe(false);
  });

  it("panelde girilmeyen alanlar .env'den gelir", async () => {
    const c = await getSmsConfig();
    expect(c.provider).toBe("log"); // test ortamında SMS_PROVIDER=log
    await netgsmOn();
    expect((await getSmsConfig()).provider).toBe("netgsm");
  });
});

describe("Netgsm gönderimi", () => {
  it("OTP ucuna doğru kimlik bilgisi ve gövdeyle istek atar", async () => {
    await netgsmOn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "00", jobid: "1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendSms("5321234567", "kod 123456");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.netgsm.com.tr/sms/rest/v2/otp");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("8501234567:gizli-sifre").toString("base64")}`);
    expect(JSON.parse(init.body)).toEqual({ msgheader: "DIGITUVA", msg: "kod 123456", no: "5321234567" });
  });

  it("normal SMS ucunda messages dizisi gönderir", async () => {
    await netgsmOn();
    await saveIntegration({ netgsmEndpoint: "sms" }, {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "00" })));
    vi.stubGlobal("fetch", fetchMock);
    await sendSms("5321234567", "merhaba");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.netgsm.com.tr/sms/rest/v2/send");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual([{ msg: "merhaba", no: "5321234567" }]);
  });

  it("Netgsm hata kodunu anlaşılır mesaja çevirir", async () => {
    await netgsmOn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "30" }), { status: 406 })));
    await expect(sendSms("5321234567", "x")).rejects.toThrow(/30.*API erişimi/);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(sendSms("5321234567", "x")).rejects.toBeInstanceOf(SmsError);
  });

  it("eksik ayarla gönderim denemez", async () => {
    await saveIntegration({ smsProvider: "netgsm", netgsmUsercode: "", netgsmMsgheader: "" }, {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendSms("5321234567", "x")).rejects.toThrow("eksik");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("SMTP", () => {
  it("kapalıyken gönderim yapmaz; ayarlar okunur", async () => {
    await expect(sendMail("a@b.co", "s", "t")).rejects.toBeInstanceOf(MailError);
    await saveIntegration(
      { smtpEnabled: "true", smtpHost: "smtp.example.com", smtpPort: "465", smtpSecure: "true", smtpUser: "u", smtpFrom: "x@example.com" },
      { smtpPassword: { value: "p", clear: false } },
    );
    expect(await getSmtpConfig()).toEqual({
      enabled: true, host: "smtp.example.com", port: 465, secure: true, user: "u", password: "p", from: "x@example.com",
    });
  });
});
