import { LegalPage } from "@/components/LegalPage";
import { getSettings } from "@/lib/settings";
import { formatBps } from "@/lib/money";

export const metadata = { title: "Kullanım Koşulları · Baskı3D" };
export const dynamic = "force-dynamic";

export default async function Terms() {
  const s = await getSettings();
  return (
    <LegalPage title="Kullanım Koşulları" updated="Ekim 2026">
      <p>Bu koşullar, Baskı3D platformunu (&quot;Platform&quot;) kullanan müşteriler ve 3D baskı hizmeti veren işletmeler (&quot;Atölye&quot;) için geçerlidir. Platforma kayıt olarak bu koşulları kabul etmiş sayılırsınız.</p>
      <h2>1. Platformun rolü</h2>
      <p>Platform, müşteriler ile atölyeleri buluşturan bir aracıdır. Baskı hizmetini atölye verir; ürünün kalitesi, teslimi ve yasal yükümlülükleri atölyeye aittir.</p>
      <h2>2. Ödeme ve emanet</h2>
      <ul>
        <li>Müşteri bir teklifi kabul ettiğinde tutar bakiyesinden düşülür ve sipariş tamamlanana kadar emanette tutulur.</li>
        <li>Müşteri teslimi onayladığında, ya da kargodan sonra {s.autoCompleteDays} gün içinde sorun bildirmezse, tutar atölyeye aktarılır.</li>
        <li>Sipariş iptal edilirse tutarın tamamı müşterinin bakiyesine iade edilir. Kullanılmayan bakiye IBAN&apos;a çekilebilir.</li>
      </ul>
      <h2>3. Komisyon ve atölye ödemeleri</h2>
      <ul>
        <li>Teklif vermek ücretsizdir. Tamamlanan her siparişten {formatBps(s.commissionBps)} hizmet bedeli kesilir.</li>
        <li>Atölye kazançları her çarşamba, asgari tutarı aşan bakiyeler için kayıtlı IBAN&apos;a gönderilir.</li>
      </ul>
      <h2>4. Anlaşmazlıklar</h2>
      <p>Müşteri, sipariş tamamlanmadan önce sorun bildirebilir. Bu durumda Platform yönetimi tarafları dinleyerek ödemenin atölyeye aktarılmasına ya da müşteriye iadesine karar verir.</p>
      <h2>5. Yasaklı içerik</h2>
      <p>Silah ve silah parçası, telif hakkı ihlal eden modeller ve yasalara aykırı ürünlerin basımı için platform kullanılamaz. Bu tür talepler kaldırılır, hesaplar askıya alınabilir.</p>
      <h2>6. İletişim</h2>
      <p>[Şirket unvanı, adresi, MERSİS no, iletişim e-postası]</p>
    </LegalPage>
  );
}
