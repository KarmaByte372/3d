# Baskı3D: 3D baskı hizmetleri pazaryeri

3D baskı hizmeti veren **işletmeler** ile baskı yaptırmak isteyen **müşterileri** buluşturan, teklif usulü
çalışan bir platform (Armut modeli). Admin paneli, bakiye sistemi ve **her çarşamba** işletmelere ödeme içerir.

## Nasıl çalışır?

1. **Müşteri** bakiye yükler: kartla (ödeme sağlayıcısı) ya da havale/EFT ile (admin onayı).
2. Müşteri **talep** oluşturur: açıklama, malzeme, adet, şehir, model dosyası (STL/OBJ/3MF/STEP/ZIP, en fazla 50 MB).
3. **İşletmeler** açık talepleri görür ve **ücretsiz teklif** verir. Talep başına teklif sınırı vardır.
4. Müşteri bir teklifi kabul eder. Tutar bakiyesinden düşülür ve **emanette** tutulur. Diğer teklifler reddedilir.
5. İşletme siparişi kargolar. Müşteri teslimi onaylar. Onaylamazsa 7 gün sonra sipariş otomatik tamamlanır.
6. Sipariş tamamlanınca **%20 komisyon** platforma, kalan tutar işletmenin bakiyesine geçer.
7. **Her çarşamba 09:00'da** (İstanbul) ödeme partisi oluşur. Admin gün içinde transferleri yapar ve "Ödendi" işaretler.
   Başarısız transferler işletme bakiyesine geri döner.

İptalde emanetteki tutarın tamamı müşteriye iade edilir. Müşteri sorun bildirirse otomatik onay durur ve kararı
admin verir. Tamamlanan siparişler 1-5 yıldızla değerlendirilir. Puanlar teklif kartlarında ve atölyenin herkese
açık profilinde (`/atolye/[id]`) görünür. Komisyon oranının nasıl belirlendiği için:
[docs/komisyon.md](docs/komisyon.md).

## Roller ve paneller

| Rol | Yol | Özellikler |
|---|---|---|
| Müşteri | `/musteri` | Talepler, teklif karşılaştırma/kabul (atölye puanlarıyla), sipariş detayı ve mesajlaşma, teslim onayı, sorun bildirme, değerlendirme, bakiye yükleme (iadeler bakiyede kalır), bildirimler, Hesabım (şifre ve telefon değiştirme) |
| İşletme | `/isletme` | Açık talepler (şehir/malzeme filtresi), teklif ver/güncelle/geri çek, sipariş detayı ve mesajlaşma, kargolama/iptal, kazanç ve ödemeler, profil ve IBAN, herkese açık profil, bildirimler, Hesabım |
| Admin | `/admin` | Özet ve uyarılar (anlaşmazlık, havale), kullanıcılar (askıya alma, doğrulama, telefon durumu, bakiye düzeltme, geçici şifre, yeni yönetici), havale onayı, sipariş inceleme (mesajlar, para hareketleri, tamamla / iptal ve iade), çarşamba ödemeleri, ayarlar (komisyon, marka adı, şirket bilgileri, banka) |

## Kurulum

```bash
npm install
cp .env.example .env          # SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD değerlerini değiştirin
npm run db:push               # veritabanını oluşturur
npm run db:seed               # admin hesabını oluşturur (demo hesaplar için: npm run db:seed:demo)
npm run dev                   # http://localhost:3000
```

Demo hesaplar (`db:seed:demo`): `musteri@demo.tr` ve `isletme@demo.tr`, şifre `demo12345`.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Geliştirme, derleme, üretim sunucusu |
| `npm test` | İş kuralı testleri (bakiye, emanet, komisyon, ödemeler, IBAN, tarih) |
| `npm run lint` | TypeScript tip kontrolü |
| `npm run payouts:run` | Harici cron için ödeme işi. Çarşamba değilse yalnızca otomatik teslim onayını çalıştırır (`-- --force` ile zorla). |

## Çarşamba ödemeleri: zamanlama

- **Tek sunucu:** `.env` içinde `ENABLE_SCHEDULER="true"` olursa uygulama içi zamanlayıcı çalışır.
  Ödemeler çarşamba 09:00'da, otomatik teslim onayı her gün 03:00'te çalışır (Europe/Istanbul).
- **Birden fazla sunucu / serverless:** `ENABLE_SCHEDULER="false"` yapın. Ardından her gün harici bir cron ile
  `POST /api/cron/run` (`Authorization: Bearer $CRON_SECRET`) çağırın ya da `npm run payouts:run` çalıştırın.
  Aynı gün için ikinci bir parti oluşmaz, işlem tekrar çalıştırmaya karşı güvenlidir.
- Admin, "Bekleyenleri CSV indir" ile bankanın toplu EFT ekranına yüklenecek listeyi alabilir.

## Para ve güvenlik notları

- Tüm tutarlar **kuruş** cinsinden tamsayıdır, oranlar baz puandır (%20 = 2000). Ondalık hata olmaz.
- Her bakiye değişimi `LedgerEntry` defterine işlenir. Bakiye düşüşleri koşullu güncellemeyle yapılır,
  bakiye eksiye düşmez. Komisyon geliri kullanıcısız (platform) defter kaydıdır.
- Komisyon oranı sipariş anında siparişe yazılır. Sonradan ayar değişse de eski siparişler etkilenmez.
- Oturum: imzalı JWT, httpOnly çerez. Şifreler bcrypt ile saklanır. Askıya alınan hesap anında erişimini kaybeder.
  Şifre değişince ya da admin sıfırlayınca diğer cihazlardaki oturumlar kapanır (`sessionVersion`).
- Giriş denemeleri sınırlıdır: hesap başına 15 dakikada 5, IP başına 30 hatalı deneme.
- **Oturum IP'ye bağlıdır:** IP adresi değişince (ör. Wi-Fi'dan mobil veriye geçiş) oturum kapanır ve kullanıcı yeniden
  giriş yapar. Mobil operatörler IP'yi oturum sırasında da değiştirebildiği için mobil kullanıcılar daha sık çıkış
  görebilir. `SESSION_BIND_IP="false"` ile kapatılabilir.

## Telefon doğrulama ve SMS (Netgsm)

- Kayıtta cep telefonu zorunludur. Numara SMS koduyla doğrulanmadan müşteri ve atölye panellerine girilemez
  (`/dogrula`). Bir numara yalnızca bir hesapta doğrulanabilir.
- **Şifremi unuttum** (`/sifremi-unuttum`): Kayıtlı numaraya SMS kodu gider; kod ve yeni şifreyle sıfırlanır,
  tüm oturumlar kapanır. Kayıtlı olmayan numara için de aynı ekran gösterilir.
- Telefon değiştirme Hesabım'dan yapılır. Yeni numara doğrulanana kadar eski numara geçerli kalır.
- Kodlar 6 hanelidir, 5 dakika geçerlidir ve veritabanında yalnızca HMAC özeti tutulur. En fazla 5 hatalı deneme
  yapılabilir. Yeni kod için 60 saniye beklenir. Numara başına saatte 5, IP başına saatte 20 SMS gönderilebilir.
- Gönderim Netgsm REST v2 üzerinden yapılır: `NETGSM_ENDPOINT="otp"` OTP servisini (`/sms/rest/v2/otp`),
  `"sms"` normal SMS'i (`/sms/rest/v2/send`) kullanır. Netgsm tarafında yapılacaklar:
  1. API alt kullanıcısı oluştur.
  2. Sunucu IP'sine API erişim izni ver.
  3. Onaylı bir mesaj başlığı (gönderici adı) al.
  4. OTP için OTP SMS paketi tanımla.
- `SMS_PROVIDER="log"` iken SMS gitmez, kod sunucu loguna yazılır (yalnızca geliştirme ve test için).
- Model dosyaları `uploads/` altında (public değil) tutulur. Yalnızca talep sahibi, ilgili işletmeler ve admin indirebilir.

## Canlıya almadan önce yapılacaklar

- **Kartla ödeme:** `src/lib/payments.ts` içindeki `PaymentProvider` arayüzüyle iyzico veya PayTR entegrasyonu
  yapılmalı (üye işyeri hesabı gerekir). Şu an yalnızca `mock` test sağlayıcı var. Üretimde varsayılan olarak
  kapalıdır, havale/EFT çalışır.
- **Veritabanı:** SQLite geliştirme içindir. Üretimde `prisma/schema.prisma` içindeki `provider` değerini
  `postgresql` yapın.
- **Dosya depolama:** Birden fazla sunucuda `uploads/` yerine S3 uyumlu bir depolama kullanın.
- **Yasal:** Başkası adına para tutmak (emanet ve bakiye) Türkiye'de 6493 sayılı Kanun kapsamında ödeme
  hizmeti sayılabilir. Bir ödeme kuruluşunun pazaryeri çözümü (alt üye işyeri, ör. iyzico veya PayTR
  Pazaryeri) kullanılması veya hukuki görüş alınması önerilir. KVKK metinleri, mesafeli satış sözleşmesi ve
  komisyon faturalandırması (e-fatura) da eklenmelidir.
- **Yasal metinler** (`/kullanim-sartlari`, `/gizlilik`, `/kvkk`) şirket bilgilerini admin → Ayarlar'dan alır.
  Yayından önce bir hukukçuya kontrol ettirilmeli.
- **İadeler yalnızca bakiyeye yapılır, IBAN'a aktarılmaz.** Tüketiciye yapılan iadelerin ödeme aracına geri
  yapılması gerekip gerekmediği ve bakiyenin elektronik para sayılıp sayılmadığı konusunda hukuki görüş alınmalı.
