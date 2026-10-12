import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageTitle } from "@/components/Shell";
import { formatTL, splitCommission } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "../actions";

const tl = (k: number) => (k / 100).toFixed(2).replace(".", ",");

export default async function AdminSettings() {
  const s = await getSettings();
  const ex = splitCommission(100000, s.commissionBps);
  return (
    <>
      <PageTitle eyebrow="Yönetim">Ayarlar</PageTitle>
      <div className="card max-w-3xl">
        <ActionForm action={updateSettingsAction} className="space-y-6">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Marka ve şirket bilgileri</legend>
            <div>
              <label className="label" htmlFor="siteName">Site / marka adı</label>
              <input className="input" id="siteName" name="siteName" defaultValue={s.siteName} required maxLength={40} />
              <p className="mt-1 text-xs text-ink-400">Logo, sayfa başlıkları ve SMS metinlerinde görünür. SMS&apos;lerde Türkçe karakterler sadeleştirilir.</p>
            </div>
            <div>
              <label className="label" htmlFor="companyTitle">Şirket unvanı (tam)</label>
              <input className="input" id="companyTitle" name="companyTitle" defaultValue={s.companyTitle} required placeholder="Digituva Yazılım Ltd. Şti." />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="companyAddress">Adres</label>
              <input className="input" id="companyAddress" name="companyAddress" defaultValue={s.companyAddress} />
            </div>
            <div>
              <label className="label" htmlFor="companyTaxOffice">Vergi dairesi</label>
              <input className="input" id="companyTaxOffice" name="companyTaxOffice" defaultValue={s.companyTaxOffice} />
            </div>
            <div>
              <label className="label" htmlFor="companyTaxNumber">Vergi no</label>
              <input className="input" id="companyTaxNumber" name="companyTaxNumber" defaultValue={s.companyTaxNumber} />
            </div>
            <div>
              <label className="label" htmlFor="companyMersis">MERSİS no</label>
              <input className="input" id="companyMersis" name="companyMersis" defaultValue={s.companyMersis} />
            </div>
            <div>
              <label className="label" htmlFor="companyKep">KEP adresi</label>
              <input className="input" id="companyKep" name="companyKep" defaultValue={s.companyKep} />
            </div>
            <div>
              <label className="label" htmlFor="companyEmail">İletişim e-postası</label>
              <input className="input" id="companyEmail" name="companyEmail" type="email" defaultValue={s.companyEmail} />
            </div>
            <div>
              <label className="label" htmlFor="companyPhone">İletişim telefonu</label>
              <input className="input" id="companyPhone" name="companyPhone" defaultValue={s.companyPhone} placeholder="0850 …" />
            </div>
            <p className="text-xs text-ink-400 sm:col-span-2">
              Bu bilgiler <a href="/kullanim-sartlari" target="_blank" className="link">Kullanım Şartları</a>,{" "}
              <a href="/gizlilik" target="_blank" className="link">Gizlilik Politikası</a> ve{" "}
              <a href="/kvkk" target="_blank" className="link">KVKK</a> sayfalarında kullanılır.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold">Komisyon</legend>
            <div className="max-w-xs">
              <label className="label" htmlFor="commissionPercent">Komisyon oranı (%)</label>
              <input className="input" id="commissionPercent" name="commissionPercent" inputMode="decimal"
                defaultValue={String(s.commissionBps / 100).replace(".", ",")} required />
            </div>
            <p className="text-sm text-ink-500">
              Şu anki oranla {formatTL(100000)} siparişte platform {formatTL(ex.commission)}, işletme {formatTL(ex.earning)} alır.
              Varsayılan %20, Armut&apos;un hizmet verenlerden fiilen kestiği orana dair tahmine dayanır. Değişiklik yalnızca yeni siparişlere uygulanır.
            </p>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Ödemeler ve bakiye</legend>
            <div>
              <label className="label" htmlFor="minPayout">Asgari çarşamba ödemesi (TL)</label>
              <input className="input" id="minPayout" name="minPayout" defaultValue={tl(s.minPayout)} required />
            </div>
            <div>
              <label className="label" htmlFor="autoCompleteDays">Otomatik teslim onayı (gün)</label>
              <input className="input" id="autoCompleteDays" name="autoCompleteDays" type="number" defaultValue={s.autoCompleteDays} required />
            </div>
            <div>
              <label className="label" htmlFor="minTopUp">En az yükleme (TL)</label>
              <input className="input" id="minTopUp" name="minTopUp" defaultValue={tl(s.minTopUp)} required />
            </div>
            <div>
              <label className="label" htmlFor="maxTopUp">En fazla yükleme (TL)</label>
              <input className="input" id="maxTopUp" name="maxTopUp" defaultValue={tl(s.maxTopUp)} required />
            </div>
            <div>
              <label className="label" htmlFor="maxQuotesPerRequest">Talep başına en fazla teklif</label>
              <input className="input" id="maxQuotesPerRequest" name="maxQuotesPerRequest" type="number" defaultValue={s.maxQuotesPerRequest} required />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 font-semibold">Havale/EFT için platform banka hesabı</legend>
            <div>
              <label className="label" htmlFor="bankName">Banka</label>
              <input className="input" id="bankName" name="bankName" defaultValue={s.bankName} />
            </div>
            <div>
              <label className="label" htmlFor="bankAccountHolder">Hesap sahibi</label>
              <input className="input" id="bankAccountHolder" name="bankAccountHolder" defaultValue={s.bankAccountHolder} />
            </div>
            <div>
              <label className="label" htmlFor="bankIban">IBAN</label>
              <input className="input font-mono" id="bankIban" name="bankIban" defaultValue={s.bankIban} />
            </div>
          </fieldset>
          <SubmitButton>Kaydet</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
