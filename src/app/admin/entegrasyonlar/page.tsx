import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { IconMessage, IconShield } from "@/components/Icons";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getPaytrConfig, getSmsConfig, getSmtpConfig, hasSecret, paytrReady } from "@/lib/integrations";
import { headers } from "next/headers";
import { clientIp, ipBindingForcedOff, siteOrigin } from "@/lib/ip";
import { IconCard } from "@/components/Icons";
import { formatPhone } from "@/lib/phone";
import { saveSessionIpModeAction, savePaytrSettingsAction, saveIdentitySettingAction, saveSmsSettingsAction, saveSmtpSettingsAction, testMailAction, testSmsAction } from "../actions";
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
  const [paytr, keySaved, saltSaved] = await Promise.all([getPaytrConfig(), hasSecret("paytrMerchantKey"), hasSecret("paytrMerchantSalt")]);
  const h = await headers();
  const origin = siteOrigin(h);
  const myIp = clientIp(h);
  const { sessionIpMode } = await getSettings();
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

        {/* OTURUM GÜVENLİĞİ */}
        <section className="card p-6 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconShield className="h-5 w-5 text-brand-600" /> Oturum güvenliği · IP değişince çıkış</h2>
            <Status ok={sessionIpMode !== "off" && !ipBindingForcedOff()}>
              {ipBindingForcedOff() ? "Kapalı (.env)" : sessionIpMode === "strict" ? "Sıkı" : sessionIpMode === "subnet" ? "Esnek" : "Kapalı"}
            </Status>
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Kullanıcının internet bağlantısı değişince oturum kapanır. <strong>Sıkı</strong> modda IP birebir aynı olmalıdır; iCloud Özel Geçiş,
            VPN veya IP&apos;si sık değişen operatörlerde kullanıcılar sürekli çıkış yapar. <strong>Esnek</strong> mod aynı operatör ağı içindeki
            IP değişikliklerine izin verir, Wi-Fi ↔ mobil veri geçişinde yine çıkış yapar. Sunucunun şu an gördüğü IP adresin:{" "}
            <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-xs">{myIp}</code>
            {ipBindingForcedOff() && <span className="text-amber-700"> · Sunucudaki .env dosyasında SESSION_BIND_IP=&quot;false&quot; olduğu için kontrol kapalı.</span>}
          </p>
          <ActionForm action={saveSessionIpModeAction} className="flex flex-wrap items-center gap-3">
            <select className="input max-w-sm" name="sessionIpMode" defaultValue={sessionIpMode}>
              <option value="subnet">Esnek: ağ/operatör değişince çıkış (önerilen)</option>
              <option value="strict">Sıkı: IP değişince çıkış</option>
              <option value="off">Kapalı: IP kontrolü yok</option>
            </select>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
        </section>

        {/* PAYTR */}
        <section className="card p-6 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconCard className="h-5 w-5 text-brand-600" /> Kartla ödeme · PayTR</h2>
            <Status ok={paytrReady(paytr)}>{paytrReady(paytr) ? (paytr.testMode ? "Etkin · test modu" : "Etkin · canlı") : paytr.enabled ? "Eksik ayar" : "Kapalı"}</Status>
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Müşteriler bakiyelerini, atölyeler teklif bakiyelerini PayTR iFrame ile kartla yükler. Bilgiler PayTR Mağaza Paneli → Destek &amp; Kurulum → Entegrasyon Bilgileri&apos;ndedir.
            PayTR panelinde <strong>Bildirim URL</strong> olarak şunu girin:{" "}
            <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-xs">{origin}/api/paytr/callback</code>
            {origin.startsWith("http://") && <span className="text-amber-700"> (canlı ortamda alan adı ve https önerilir)</span>}
          </p>
          <ActionForm action={savePaytrSettingsAction} className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="paytrEnabled" defaultChecked={paytr.enabled} className="h-5 w-5 accent-brand-500" /> PayTR etkin
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="paytrTestMode" defaultChecked={paytr.testMode} className="h-5 w-5 accent-brand-500" /> Test modu (gerçek para çekilmez)
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="paytrMerchantId">Mağaza no (merchant_id)</label>
                <input className="input font-mono" id="paytrMerchantId" name="paytrMerchantId" defaultValue={paytr.merchantId} inputMode="numeric" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="paytrMerchantKey">Merchant Key</label>
                <SecretInput name="paytrMerchantKey" saved={keySaved} />
              </div>
              <div>
                <label className="label" htmlFor="paytrMerchantSalt">Merchant Salt</label>
                <SecretInput name="paytrMerchantSalt" saved={saltSaved} />
              </div>
              <div>
                <label className="label" htmlFor="paytrMaxInstallment">Taksit</label>
                <select className="input" id="paytrMaxInstallment" name="paytrMaxInstallment" defaultValue={String(paytr.maxInstallment)}>
                  <option value="0">Tek çekim</option>
                  {[2, 3, 6, 9, 12].map((n) => <option key={n} value={n}>En fazla {n} taksit</option>)}
                </select>
              </div>
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
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
