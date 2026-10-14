import { LegalPage, val } from "@/components/LegalPage";

export const metadata = { title: "KVKK Aydınlatma Metni" };
export const dynamic = "force-dynamic";

export default function KvkkPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" updated="Ekim 2026" path="/kvkk">
      {(s) => (
        <>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, veri sorumlusu sıfatıyla {val(s.companyTitle, "şirket unvanı")}{" "}
            (&quot;Şirket&quot;) olarak, {s.siteName} platformu kapsamında işlenen kişisel verileriniz hakkında sizi bilgilendiririz.
          </p>

          <h2>1. İşlenen kişisel veriler</h2>
          <ul>
            <li><strong>Kimlik:</strong> ad soyad, T.C. kimlik numarası, doğum yılı; atölyeler için ayrıca vergi numarası</li>
            <li><strong>İletişim:</strong> e-posta adresi, cep telefonu numarası</li>
            <li><strong>Finans:</strong> bakiye hareketleri; atölyeler için IBAN ve hesap sahibi</li>
            <li><strong>Müşteri işlem:</strong> talepler, model dosyaları, teklifler, siparişler, mesajlar, değerlendirmeler</li>
            <li><strong>İşlem güvenliği:</strong> IP adresi, oturum bilgileri, SMS doğrulama kayıtları, giriş denemeleri</li>
          </ul>

          <h2>2. İşleme amaçları ve hukuki sebepler</h2>
          <ul>
            <li>Üyelik sözleşmesinin kurulması ve ifası, siparişlerin yürütülmesi, ödemelerin yapılması (KVKK m.5/2-c)</li>
            <li>Telefon numarasının doğrulanması ve SMS ile şifre sıfırlama, hesap güvenliğinin sağlanması (m.5/2-c ve m.5/2-f)</li>
            <li>Üyelerin kimliğinin ve 18 yaşından büyük olduğunun doğrulanması, aynı kişinin birden fazla hesap açmasının engellenmesi (m.5/2-f, meşru menfaat; kimlik adımında alınan açık rıza)</li>
            <li>Vergi ve ticaret mevzuatından doğan saklama ve bildirim yükümlülükleri (m.5/2-ç)</li>
            <li>Anlaşmazlıkların çözümü ve hakların tesisi, kullanılması, korunması (m.5/2-e)</li>
            <li>Dolandırıcılığın ve kötüye kullanımın önlenmesi (m.5/2-f, meşru menfaat)</li>
          </ul>

          <h2>3. Aktarım</h2>
          <p>Kişisel verileriniz yukarıdaki amaçlarla sınırlı olarak şu alıcılara aktarılabilir:</p>
          <ul>
            <li>Siparişin karşı tarafı olan müşteri veya atölye</li>
            <li>SMS gönderimi için Netgsm İletişim ve Bilgi Teknolojileri A.Ş. (yalnızca telefon numarası ve mesaj metni)</li>
            <li>Ödeme kuruluşları ve bankalar</li>
            <li>Sunucu ve barındırma hizmeti sağlayıcıları</li>
            <li>Kanunen yetkili kamu kurum ve kuruluşları</li>
          </ul>

          <h2>4. Toplama yöntemi</h2>
          <p>
            Kişisel verileriniz; kayıt, profil ve sipariş formları, Platform üzerindeki yazışmalar ve oturum açma/SMS doğrulama gibi işlemler sırasında
            elektronik ortamda otomatik yollarla toplanır.
          </p>

          <h2>5. Haklarınız (KVKK m.11)</h2>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini isteme</li>
            <li>Bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
            <li>Otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme</li>
            <li>Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
          </ul>

          <h2>6. Başvuru</h2>
          <p>
            Haklarınıza ilişkin taleplerinizi, kimliğinizi doğrulayan bilgilerle birlikte {val(s.companyEmail, "e-posta")} adresine
            {s.companyKep && <> veya {s.companyKep} KEP adresine</>} ya da {val(s.companyAddress, "adres")} adresine yazılı olarak iletebilirsiniz.
            Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.
          </p>
        </>
      )}
    </LegalPage>
  );
}
