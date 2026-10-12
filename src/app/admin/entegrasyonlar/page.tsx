import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { IconMessage, IconShield } from "@/components/Icons";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getSmsConfig, getSmtpConfig, hasSecret } from "@/lib/integrations";
import { formatPhone } from "@/lib/phone";
import { saveIdentitySettingAction, saveSmsSettingsAction, saveSmtpSettingsAction, testMailAction, testSmsAction } from "../actions";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import Link from "next/link";

function SecretInput({ name, saved }: { name: string; saved: boolean }) {
  return (
    <>
      <input
        className="input"
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        placeholder={saved ? "•••••••• (kayıtlı, değiştirmek için yazın)" : "Şifre"}
      />
      {saved && (
        <label className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <input type="checkbox" name={`${name}Clear`} /> Kayıtlı şifreyi sil
        </label>
      )}
    </>
  );
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
      {children}
    </span>
  );
}

export default async function IntegrationsPage() {
  const me = await requireUser("ADMIN");
  const [sms, smtp, smsSaved, smtpSaved] = await Promise.all([
    getSmsConfig(),
    getSmtpConfig(),
    hasSecret("netgsmPassword"),
    hasSecret("smtpPassword"),
  ]);
  const smsReady = sms.provider === "netgsm" && !!sms.usercode && !!sms.msgheader && smsSaved;
  const [{ identityRequired }, idCounts] = await Promise.all([
    getSettings(),
    prisma.user.groupBy({ by: ["identityStatus"], where: { role: { not: "ADMIN" } }, _count: true }),
  ]);
  const idOn = identityRequired === "true";
  const countOf = (s: string) => idCounts.find((c) => c.identityStatus === s)?._count ?? 0;

  return (
    <>
      <PageTitle eyebrow="Yönetim" description="Şifreler veritabanında şifrelenmiş olarak saklanır ve bu ekranda gösterilmez.">
        Entegrasyonlar
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TC KİMLİK */}
        <section className="card p-6 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconShield className="h-5 w-5 text-brand-600" /> TC kimlik doğrulama</h2>
            <Status ok={idOn}>{idOn ? "Açık" : "Kapalı"}</Status>
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Açıkken müşteri ve atölyeler telefon doğrulamasından sonra T.C. kimlik no, ad, soyad ve doğum yılı girer (18 yaş altı kabul edilmez).
            Müşteriler numara algoritmayla kontrol edilip hemen onaylanır; atölyeler yönetici onayına kadar teklif veremez.
            Kapalıyken kimse kimlik adımına yönlendirilmez, daha önce girilen bilgiler silinmez.
          </p>
          <ActionForm action={saveIdentitySettingAction} className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" name="identityRequired" defaultChecked={idOn} className="h-5 w-5 accent-brand-500" />
              TC kimlik iste
            </label>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
          <p className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="chip">Doğrulanmış: {countOf("VERIFIED")}</span>
            <Link href="/admin/kullanicilar?kimlik=PENDING" className="chip">Onay bekleyen: {countOf("PENDING")}</Link>
            <span className="chip">Reddedilen: {countOf("REJECTED")}</span>
            <span className="chip">Girilmemiş: {countOf("NONE")}</span>
          </p>
        </section>

        {/* NETGSM */}
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconMessage className="h-5 w-5 text-brand-600" /> SMS · Netgsm</h2>
            <Status ok={smsReady}>{smsReady ? "Etkin" : sms.provider === "log" ? "Kapalı (log)" : "Eksik ayar"}</Status>
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Telefon doğrulama ve şifre sıfırlama kodları bu hesapla gönderilir. Netgsm panelinde bir API alt kullanıcısı oluşturun ve sunucu IP&apos;sine API izni verin.
          </p>
          <ActionForm action={saveSmsSettingsAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="smsProvider">Gönderim</label>
              <select className="input" id="smsProvider" name="smsProvider" defaultValue={sms.provider}>
                <option value="netgsm">Netgsm ile gerçek SMS gönder</option>
                <option value="log">Kapalı: kodları sunucu loguna yaz (test)</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="netgsmUsercode">Kullanıcı kodu</label>
                <input className="input font-mono" id="netgsmUsercode" name="netgsmUsercode" defaultValue={sms.usercode} placeholder="850XXXXXXX" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="netgsmPassword">API şifresi</label>
                <SecretInput name="netgsmPassword" saved={smsSaved} />
              </div>
              <div>
                <label className="label" htmlFor="netgsmMsgheader">Mesaj başlığı</label>
                <input className="input font-mono" id="netgsmMsgheader" name="netgsmMsgheader" defaultValue={sms.msgheader} placeholder="Onaylı gönderici adı" />
              </div>
              <div>
                <label className="label" htmlFor="netgsmEndpoint">Servis</label>
                <select className="input" id="netgsmEndpoint" name="netgsmEndpoint" defaultValue={sms.endpoint}>
                  <option value="otp">OTP SMS (önerilen, hızlı)</option>
                  <option value="sms">Normal SMS</option>
                </select>
              </div>
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
          <ActionForm action={testSmsAction} className="mt-6 flex flex-wrap items-end gap-3 border-t border-ink-100 pt-5">
            <div className="min-w-[12rem] flex-1">
              <label className="label" htmlFor="testPhone">Test SMS&apos;i gönder</label>
              <input className="input" id="testPhone" name="testPhone" type="tel" defaultValue={me.phone ? formatPhone(me.phone) : ""} placeholder="05XX XXX XX XX" required />
            </div>
            <SubmitButton className="btn-dark">Test gönder</SubmitButton>
          </ActionForm>
        </section>

        {/* SMTP */}
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconShield className="h-5 w-5 text-brand-600" /> E-posta · SMTP</h2>
            <Status ok={smtp.enabled && !!smtp.host}>{smtp.enabled ? (smtp.host ? "Etkin" : "Eksik ayar") : "Kapalı"}</Status>
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Yedek olarak hazır tutulur. Etkinleştirilse bile şifre sıfırlama SMS ile yapılmaya devam eder.
          </p>
          <ActionForm action={saveSmtpSettingsAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="smtpEnabled" defaultChecked={smtp.enabled} className="accent-brand-500" /> SMTP etkin
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
              <div>
                <label className="label" htmlFor="smtpHost">Sunucu</label>
                <input className="input font-mono" id="smtpHost" name="smtpHost" defaultValue={smtp.host} placeholder="smtp.yandex.com.tr" />
              </div>
              <div>
                <label className="label" htmlFor="smtpPort">Port</label>
                <input className="input font-mono" id="smtpPort" name="smtpPort" type="number" defaultValue={smtp.port} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="smtpSecure" defaultChecked={smtp.secure} className="accent-brand-500" /> SSL/TLS (port 465 için işaretleyin; 587 için boş bırakın)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="smtpUser">Kullanıcı adı</label>
                <input className="input" id="smtpUser" name="smtpUser" defaultValue={smtp.user} autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="smtpPassword">Şifre</label>
                <SecretInput name="smtpPassword" saved={smtpSaved} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="smtpFrom">Gönderen</label>
              <input className="input" id="smtpFrom" name="smtpFrom" defaultValue={smtp.from} placeholder='"Digituva" <bildirim@alanadi.com>' />
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
          <ActionForm action={testMailAction} className="mt-6 flex flex-wrap items-end gap-3 border-t border-ink-100 pt-5">
            <div className="min-w-[12rem] flex-1">
              <label className="label" htmlFor="testEmail">Test e-postası gönder</label>
              <input className="input" id="testEmail" name="testEmail" type="email" defaultValue={me.email} required />
            </div>
            <SubmitButton className="btn-dark">Test gönder</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
