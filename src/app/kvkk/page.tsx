import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "KVKK Aydınlatma Metni · Baskı3D" };

export default function Kvkk() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" updated="Ekim 2026">
      <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, veri sorumlusu sıfatıyla [Şirket unvanı] olarak kişisel verilerinizi aşağıda açıklanan kapsamda işliyoruz.</p>
      <h2>İşlenen veriler</h2>
      <ul>
        <li>Kimlik ve iletişim: ad soyad, e-posta, telefon</li>
        <li>Atölyeler için: işletme adı, vergi/TC kimlik no, şehir, IBAN ve hesap sahibi</li>
        <li>İşlem: talepler, yüklenen model dosyaları, teklifler, siparişler, mesajlar, değerlendirmeler, bakiye hareketleri</li>
        <li>Güvenlik: oturum bilgileri ve giriş denemeleri için IP adresi</li>
      </ul>
      <h2>Amaçlar ve hukuki sebepler</h2>
      <p>Verileriniz; üyelik ve sözleşmenin kurulması ve ifası (KVKK m.5/2-c), hukuki yükümlülüklerin yerine getirilmesi (m.5/2-ç) ve meşru menfaat (m.5/2-f) kapsamında; hizmetin sunulması, ödemelerin yapılması, anlaşmazlıkların çözülmesi ve güvenliğin sağlanması amacıyla işlenir.</p>
      <h2>Aktarım</h2>
      <p>Verileriniz yalnızca hizmetin gerektirdiği ölçüde; sipariş tarafı olan müşteri veya atölyeyle, ödeme kuruluşları ve bankalarla ve yasal olarak yetkili kurumlarla paylaşılır.</p>
      <h2>Haklarınız</h2>
      <p>KVKK m.11 kapsamında verilerinize erişme, düzeltilmesini veya silinmesini isteme ve itiraz etme haklarına sahipsiniz. Başvurularınızı [iletişim e-postası] adresine iletebilirsiniz.</p>
    </LegalPage>
  );
}
