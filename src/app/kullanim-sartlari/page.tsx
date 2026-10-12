import { LegalPage, val } from "@/components/LegalPage";
import { formatBps, formatTL } from "@/lib/money";

export const metadata = { title: "Kullanım Şartları" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım Şartları" updated="Ekim 2026" path="/kullanim-sartlari">
      {(s) => (
        <>
          <p>
            Bu Kullanım Şartları, {val(s.companyTitle, "şirket unvanı")} (&quot;Şirket&quot;) tarafından işletilen {s.siteName} platformunun
            (&quot;Platform&quot;) kullanımına ilişkin koşulları düzenler. Platforma üye olan herkes bu şartları okuduğunu ve kabul ettiğini beyan eder.
          </p>

          <h2>1. Tanımlar</h2>
          <ul>
            <li><strong>Müşteri:</strong> 3D baskı hizmeti almak için talep oluşturan üye.</li>
            <li><strong>Atölye:</strong> Platform üzerinden 3D baskı hizmeti sunan, işletme olarak kayıtlı üye.</li>
            <li><strong>Bakiye:</strong> Müşterinin Platformda sipariş ödemelerinde kullanmak üzere yüklediği tutar ile iadelerden oluşan Platform içi kullanım hakkı.</li>
          </ul>

          <h2>2. Platformun rolü</h2>
          <p>
            Şirket, müşteriler ile atölyeleri buluşturan bir aracı hizmet sağlayıcıdır. Baskı hizmetini atölye sunar. Ürünün niteliği, kalitesi, teslimi ve
            ürüne ilişkin yasal yükümlülükler atölyeye aittir. Şirket, atölyelerin sunduğu hizmetin satıcısı veya üreticisi değildir.
          </p>

          <h2>3. Üyelik ve telefon doğrulaması</h2>
          <ul>
            <li>Üyelik için gerçek ve güncel bilgiler ile size ait bir cep telefonu numarası gereklidir. Numara SMS ile gönderilen kodla doğrulanmadan Platform kullanılamaz.</li>
            <li>Bir telefon numarası yalnızca bir hesapta doğrulanabilir. Şifre sıfırlama işlemleri bu numaraya gönderilen SMS koduyla yapılır.</li>
            <li>Platformu yalnızca 18 yaşından büyük kişiler kullanabilir. Üyeler T.C. kimlik numarası, ad, soyad ve doğum yılını kimliklerindeki gibi beyan eder. Atölye hesapları, kimlik bilgileri Şirket tarafından onaylanana kadar teklif veremez. Yanlış beyan hesabın kapatılma sebebidir.</li>
            <li>Hesap güvenliğiniz için, oturum açtığınız internet bağlantısı (IP adresi) değiştiğinde oturumunuz otomatik olarak kapatılır ve yeniden giriş yapmanız gerekir.</li>
            <li>Şifrenizin ve SMS kodlarının gizliliğinden siz sorumlusunuz. Kodları kimseyle paylaşmayın. Şirket çalışanları sizden kod istemez.</li>
          </ul>

          <h2>4. Bakiye, ödeme ve iadeler</h2>
          <ul>
            <li>Müşteri, kartla veya havale/EFT ile bakiye yükler. En az yükleme tutarı {formatTL(s.minTopUp)}, en fazla {formatTL(s.maxTopUp)}&apos;dir.</li>
            <li>Bir teklif kabul edildiğinde sipariş tutarı bakiyeden düşülür ve sipariş tamamlanana kadar emanette tutulur. Bu sürede atölyeye aktarılmaz.</li>
            <li>Müşteri teslimi onayladığında, ya da sipariş kargoya verildikten sonra {s.autoCompleteDays} gün içinde sorun bildirmezse, tutar atölyeye aktarılır.</li>
            <li>
              <strong>İadeler bakiyeye yapılır.</strong> İptal edilen siparişlerin tutarı müşterinin Platform bakiyesine eksiksiz iade edilir ve yeni siparişlerde
              kullanılabilir. Bakiye nakde çevrilmez, banka hesabına veya IBAN&apos;a aktarılmaz.
            </li>
            <li>Bakiye faiz getirmez ve başka bir üyeye devredilemez.</li>
          </ul>

          <h2>5. Atölyeler için hizmet bedeli ve ödemeler</h2>
          <ul>
            <li>Teklif vermek ücretsizdir. Tamamlanan her siparişin tutarından {formatBps(s.commissionBps)} Platform hizmet bedeli kesilir. Bu oran Şirket tarafından değiştirilebilir; değişiklik yalnızca sonraki siparişlere uygulanır.</li>
            <li>Atölye kazançları her çarşamba günü, bakiyesi {formatTL(s.minPayout)} ve üzerinde olan atölyelerin kayıtlı IBAN&apos;ına gönderilir. IBAN bilgisinin doğruluğundan atölye sorumludur.</li>
            <li>Atölye, kazançlarına ilişkin vergisel yükümlülüklerden ve müşteriye fatura düzenlemekten kendisi sorumludur.</li>
          </ul>

          <h2>6. Anlaşmazlıklar</h2>
          <p>
            Müşteri, sipariş tamamlanmadan önce sorun bildirebilir. Bu durumda otomatik onay durur ve Şirket, tarafların yazışmalarını ve sunduğu bilgileri
            inceleyerek emanetteki tutarın atölyeye aktarılmasına ya da müşterinin bakiyesine iadesine karar verir.
          </p>

          <h2>7. Yasaklı kullanımlar</h2>
          <ul>
            <li>Silah, silah parçası, mühimmat ve yasalarca yasaklanmış ürünlerin basımı</li>
            <li>Fikri ve sınai mülkiyet haklarını ihlal eden modeller</li>
            <li>Platform dışında ödeme yapılması veya teklif alınması amacıyla iletişim bilgisi paylaşılması</li>
            <li>Sahte hesap, başkasına ait telefon numarası veya yanıltıcı bilgi kullanımı</li>
          </ul>
          <p>Bu kurallara aykırı içerikler kaldırılır. Hesap askıya alınabilir ve emanetteki tutarlar inceleme sonuçlanana kadar bekletilebilir.</p>

          <h2>8. Sorumluluğun sınırı</h2>
          <p>
            Şirket, Platformun kesintisiz çalışması için makul özeni gösterir. Ancak atölyelerin sunduğu hizmetten, kullanıcıların birbirine verdiği
            zararlardan ve mücbir sebeplerden doğan kayıplardan, yasal olarak sorumlu tutulamayacağı ölçüde sorumlu değildir.
          </p>

          <h2>9. Değişiklikler ve fesih</h2>
          <p>
            Şirket bu şartları güncelleyebilir. Güncel metin bu sayfada yayımlanır. Üye dilediği zaman hesabını kapatma talebinde bulunabilir. Devam eden
            siparişler sonuçlanmadan hesap kapatılmaz.
          </p>

          <h2>10. Uygulanacak hukuk</h2>
          <p>
            Bu şartlara Türkiye Cumhuriyeti hukuku uygulanır. Tüketici sıfatına sahip üyeler, parasal sınırlar dahilinde Tüketici Hakem Heyetlerine ve
            Tüketici Mahkemelerine başvurabilir.
          </p>

          <h2>11. İletişim</h2>
          <p>
            {val(s.companyTitle, "şirket unvanı")} · {val(s.companyAddress, "adres")} · {val(s.companyEmail, "e-posta")}
            {s.companyPhone && <> · {s.companyPhone}</>}
          </p>
        </>
      )}
    </LegalPage>
  );
}
