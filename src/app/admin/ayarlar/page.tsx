import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageTitle } from "@/components/Shell";
import { formatTL, splitCommission } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { computeQuoteFee } from "@/lib/quote-fee";
import { saveQuoteFeeSettingsAction, updateSettingsAction } from "../actions";

const EXAMPLES = [
  { t: "Yeni atölye · FDM · İstanbul · bütçe 1.000 TL", req: { technology: "FDM", material: "PLA", city: "İstanbul", budget: 100000 }, r: { count: 0, average: 0, fiveStars: 0 } },
  { t: "4,9★ (20 adet 5★) · FDM · İstanbul · bütçe 1.000 TL", req: { technology: "FDM", material: "PLA", city: "İstanbul", budget: 100000 }, r: { count: 22, average: 4.9, fiveStars: 20 } },
  { t: "4,6★ (6 adet 5★) · SLA · Ankara · bütçe 5.000 TL", req: { technology: "SLA", material: "Reçine", city: "Ankara", budget: 500000 }, r: { count: 8, average: 4.6, fiveStars: 6 } },
  { t: "3,2★ · SLS · Konya · bütçe yok", req: { technology: "SLS", material: "PA12", city: "Konya", budget: null }, r: { count: 5, average: 3.2, fiveStars: 1 } },
  { t: "2,5★ · FDM · İzmir · bütçe 300 TL", req: { technology: "FDM", material: "PETG", city: "İzmir", budget: 30000 }, r: { count: 4, average: 2.5, fiveStars: 0 } },
];

function TableField({ name, label, value, hint }: { name: string; label: string; value: string; hint: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <textarea className="input min-h-32 font-mono text-xs" id={name} name={name} defaultValue={value} spellCheck={false} />
      <p className="mt-1 text-xs text-ink-400">{hint}</p>
    </div>
  );
}

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
              Tamamlanan işten alınan pay. Şu anki oranla {formatTL(100000)} siparişte platform {formatTL(ex.commission)}, işletme {formatTL(ex.earning)} alır.
              Varsayılan %0: gelir teklif ücretlerinden gelir (Armut modeli). Değişiklik yalnızca yeni siparişlere uygulanır.
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

      <div className="card mt-6 max-w-3xl" id="teklif-ucreti">
        <h2 className="mb-1 text-lg font-semibold">Teklif ücreti</h2>
        <p className="mb-5 text-sm text-ink-500">
          Atölye teklif verirken ödenir, iade edilmez. Hesap: <span className="font-mono">kategori tabanı × şehir × iş büyüklüğü × (1 − puan indirimi)</span>,
          tam liraya yuvarlanır ve alt/üst sınıra kırpılır. Ücret önce atölyenin kazancından, yetmezse yüklediği bakiyeden düşülür.
        </p>
        <ActionForm action={saveQuoteFeeSettingsAction} className="space-y-6">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" name="quoteFeeEnabled" defaultChecked={s.quoteFeeEnabled === "true"} className="h-5 w-5 accent-brand-500" />
            Teklif ücreti al (kapalıyken teklif vermek ücretsiz)
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="quoteFeeDefaultBase">Varsayılan taban (TL)</label>
              <input className="input" id="quoteFeeDefaultBase" name="quoteFeeDefaultBase" defaultValue={tl(s.quoteFeeDefaultBase)} required />
            </div>
            <div>
              <label className="label" htmlFor="quoteFeeMin">En düşük ücret (TL)</label>
              <input className="input" id="quoteFeeMin" name="quoteFeeMin" defaultValue={tl(s.quoteFeeMin)} required />
            </div>
            <div>
              <label className="label" htmlFor="quoteFeeMax">En yüksek ücret (TL)</label>
              <input className="input" id="quoteFeeMax" name="quoteFeeMax" defaultValue={tl(s.quoteFeeMax)} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TableField name="quoteFeeCategories" label="Kategori tabanları (TL)" value={s.quoteFeeCategories}
              hint="Teknoloji veya malzeme=TL. Önce teknoloji, sonra malzeme eşleşir; yoksa varsayılan taban." />
            <TableField name="quoteFeeCities" label="Şehir çarpanları" value={s.quoteFeeCities}
              hint="Şehir=çarpan. Listede olmayan şehirler ×1." />
            <TableField name="quoteFeeBudgets" label="İş büyüklüğü (bütçe)" value={s.quoteFeeBudgets}
              hint="Bütçe üst sınırı TL=çarpan; * = daha büyük bütçeler. Bütçe girilmemişse ×1." />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <TableField name="quoteFeeRatingTiers" label="Puana göre indirim (%)" value={s.quoteFeeRatingTiers}
              hint="En az ortalama=indirim %. Eksi değer zamdır (ör. 0=-20: düşük puana %20 zam)." />
            <div className="grid content-start gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="quoteFeeFiveStarStep">Her 5★ için ek indirim (%)</label>
                <input className="input" id="quoteFeeFiveStarStep" name="quoteFeeFiveStarStep" inputMode="decimal" defaultValue={String(s.quoteFeeFiveStarStep).replace(".", ",")} required />
              </div>
              <div>
                <label className="label" htmlFor="quoteFeeFiveStarCap">5★ ek indirimi en fazla (%)</label>
                <input className="input" id="quoteFeeFiveStarCap" name="quoteFeeFiveStarCap" inputMode="decimal" defaultValue={String(s.quoteFeeFiveStarCap).replace(".", ",")} required />
              </div>
              <div>
                <label className="label" htmlFor="quoteFeeMinReviews">İndirim için en az değerlendirme</label>
                <input className="input" id="quoteFeeMinReviews" name="quoteFeeMinReviews" type="number" min={0} max={100} defaultValue={s.quoteFeeMinReviews} required />
              </div>
              <div>
                <label className="label" htmlFor="quoteFeeMaxDiscount">Toplam indirim en fazla (%)</label>
                <input className="input" id="quoteFeeMaxDiscount" name="quoteFeeMaxDiscount" inputMode="decimal" defaultValue={String(s.quoteFeeMaxDiscount).replace(".", ",")} required />
              </div>
            </div>
          </div>
          <SubmitButton>Teklif ücretini kaydet</SubmitButton>
        </ActionForm>

        <h3 className="mb-2 mt-8 font-semibold">Mevcut ayarlarla örnekler</h3>
        <div className="overflow-x-auto rounded-xl border border-ink-100">
          <table className="table">
            <thead><tr><th>Durum</th><th className="text-right">Ücret</th></tr></thead>
            <tbody>
              {EXAMPLES.map((e) => (
                <tr key={e.t}>
                  <td data-label="Durum">{e.t}</td>
                  <td data-label="Ücret" className="text-right font-mono font-semibold">{formatTL(computeQuoteFee(e.req, e.r, s).amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
