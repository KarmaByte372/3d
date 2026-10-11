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

İptalde emanetteki tutarın tamamı müşteriye iade edilir. Komisyon oranının nasıl belirlendiği için:
[docs/komisyon.md](docs/komisyon.md).

## Roller ve paneller

| Rol | Yol | Özellikler |
|---|---|---|
| Müşteri | `/musteri` | Talepler, teklif karşılaştırma/kabul, siparişler, teslim onayı, bakiye yükleme, hesap hareketleri |
| İşletme | `/isletme` | Açık talepler (şehir/malzeme filtresi), teklif ver/güncelle/geri çek, sipariş kargolama/iptal, kazanç ve ödemeler, profil ve IBAN |
| Admin | `/admin` | Özet (komisyon geliri, emanet, işletmelere borç), kullanıcılar (askıya alma, işletme doğrulama, bakiye düzeltme), havale onayı, sipariş anlaşmazlıkları (tamamla / iptal ve iade), çarşamba ödemeleri (CSV dışa aktarım, ödendi/başarısız), ayarlar (komisyon oranı vb.) |

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
- Giriş denemelerine hız sınırı (rate limit) ve e-posta doğrulama eklenmesi önerilir.
