import { LegalPage, val } from "@/components/LegalPage";

export const metadata = { title: "Gizlilik Politikası" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik Politikası" updated="Ekim 2026" path="/gizlilik">
      {(s) => (
        <>
          <p>
            {val(s.companyTitle, "şirket unvanı")} olarak {s.siteName} platformunda gizliliğinize önem veriyoruz. Bu politika hangi bilgileri
            topladığımızı, nasıl kullandığımızı ve nasıl koruduğumuzu açıklar. Kişisel verilerin işlenmesine ilişkin yasal bilgilendirme için{" "}
            <a href="/kvkk" className="link">KVKK Aydınlatma Metni</a>&apos;ne bakınız.
          </p>

          <h2>Topladığımız bilgiler</h2>
          <ul>
            <li><strong>Hesap:</strong> ad soyad, e-posta, cep telefonu numarası, şifrenizin geri döndürülemez özeti (şifrenizin kendisini saklamayız).</li>
            <li><strong>Atölyeler:</strong> işletme adı, vergi/TC kimlik numarası, şehir, IBAN ve hesap sahibi.</li>
            <li><strong>İşlemler:</strong> talepler, yüklediğiniz model dosyaları, teklifler, siparişler, mesajlar, değerlendirmeler, bakiye hareketleri.</li>
            <li><strong>Güvenlik:</strong> giriş yaptığınız IP adresi, SMS doğrulama kayıtları (kodların kendisi değil, şifrelenmiş özetleri), hatalı giriş denemeleri.</li>
          </ul>

          <h2>Bilgileri nasıl kullanıyoruz</h2>
          <ul>
            <li>Hesabınızı oluşturmak, telefonunuzu doğrulamak ve şifre sıfırlama kodu göndermek</li>
            <li>Talep, teklif ve siparişlerin taraflar arasında iletilmesi; ödemelerin ve atölye hakedişlerinin yapılması</li>
            <li>Hesabınızı korumak: IP adresiniz değiştiğinde oturumun kapatılması, kaba kuvvet denemelerinin engellenmesi</li>
            <li>Anlaşmazlıkların incelenmesi ve yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
          <p>Bilgilerinizi reklam amacıyla satmayız ve üçüncü kişilerle pazarlama amacıyla paylaşmayız.</p>

          <h2>Kimlerle paylaşıyoruz</h2>
          <ul>
            <li><strong>Sipariş tarafları:</strong> Teklifiniz kabul edildiğinde müşteri ve atölye, siparişi yürütmek için gereken bilgileri (ad, talep ayrıntıları, model dosyası, mesajlar) görür. Herkese açık atölye profilinde yorum yapanın yalnızca adı ve soyadının baş harfi gösterilir.</li>
            <li><strong>SMS hizmet sağlayıcısı:</strong> Doğrulama ve şifre sıfırlama kodları Netgsm İletişim ve Bilgi Teknolojileri A.Ş. üzerinden gönderilir; bu amaçla yalnızca telefon numaranız ve mesaj metni iletilir.</li>
            <li><strong>Ödeme kuruluşları ve bankalar:</strong> bakiye yükleme ve atölye ödemeleri için.</li>
            <li><strong>Yetkili kamu kurumları:</strong> yasal zorunluluk halinde.</li>
          </ul>

          <h2>Çerezler</h2>
          <p>
            Platform yalnızca oturumunuzu sürdürmek için zorunlu bir çerez kullanır (giriş yaptığınızı hatırlar, 7 gün sonra veya IP adresiniz değiştiğinde
            geçersiz olur). Reklam, analitik veya üçüncü taraf takip çerezi kullanılmaz.
          </p>

          <h2>Saklama süreleri</h2>
          <ul>
            <li>Hesap ve sipariş kayıtları: üyelik süresince ve sonrasında yasal saklama süreleri boyunca (ticari kayıtlar için 10 yıl).</li>
            <li>SMS doğrulama kayıtları: güvenlik amacıyla en fazla 1 yıl.</li>
            <li>Model dosyaları: sipariş tamamlandıktan sonra makul bir süre; talep halinde daha erken silinir.</li>
          </ul>

          <h2>Güvenlik</h2>
          <p>
            Şifreler bcrypt ile özetlenir, SMS kodları özet olarak saklanır ve 5 dakika geçerlidir. Model dosyaları herkese açık değildir; yalnızca talep sahibi,
            ilgili atölyeler ve yöneticiler erişebilir. Oturumlar IP adresine bağlıdır.
          </p>

          <h2>Haklarınız ve iletişim</h2>
          <p>
            Bilgilerinize erişme, düzeltme ve silinmesini isteme haklarınızı kullanmak için {val(s.companyEmail, "iletişim e-postası")} adresine yazabilirsiniz.
          </p>
        </>
      )}
    </LegalPage>
  );
}
