# Komisyon oranı: Armut'tan türetilen %20

## Sonuç

Platformun varsayılan komisyonu **%20**. Admin panelinden (Ayarlar) değiştirilebilir. Değişiklik yalnızca
yeni siparişlere uygulanır, çünkü oran sipariş kabul edildiği anda siparişe sabitlenir.

## Armut nasıl ücret alıyor?

Armut **kamuya açık, sabit bir komisyon oranı yayınlamıyor.** Gelir modeli iki parçalı:

1. **Teklif verme ücreti (pay-per-lead):** Hizmet veren, müşteriye teklif gönderebilmek için ücret öder.
   İşi alamasa bile bu ücret iade edilmez. Ücret kategoriye göre değişir.
2. **İş başına komisyon / sabit fiyatlı rezervasyon:** Temizlik gibi "Hemen Rezervasyon" işlerinde fiyatı
   Armut belirler ve hizmet verene payını aktarır. Bazı kategorilerde iş alındığında komisyon da kesilir.

## Hesaplama: elimizdeki veri noktaları

| Kaynak | Bildirilen kesinti | Oran |
|---|---|---|
| Hizmet veren şikayeti (tadilat) | "yaklaşık %20 komisyon" | ~%20 |
| Hizmet veren şikayeti | 250 TL'lik işten 80–90 TL | %32–36 |
| Forum yazısı | "%15 ile %30 arasında" | %15–30 (orta nokta %22,5) |
| ProntoPro (Armut'un İtalya'daki ortağı), 2019 blog | Teklif kredisinin fiyatı, işin beklenen değerinin ~%10'u | lead başına ~%10 |

Teklif ücreti modelinde hizmet verenin **fiilen** ödediği oran, kazanma oranına bağlıdır. Armut talep başına
yaklaşık 4 teklif iletir. Bir hizmet veren her teklifte işin ~%5–10'u kadar ücret ödüyor ve tekliflerinin
1/3–1/4'ünü kazanıyorsa, kazandığı iş başına maliyeti işin **%15–40'ı** olur.

- Uç değerleri (%32–36 tek örnek, %40 kötümser senaryo) dışarıda bırakınca veri noktaları %15–%22,5 aralığında toplanıyor.
- Tekrar eden ve en doğrudan bildirilen değer **%20**.

**Seçim: %20.** Bu oran Armut'un resmi bir tarifesi değil. Hizmet verenlerin fiilen ödediği payın tahminidir.

## Bizim modelimizin farkı

Armut'ta hizmet verenin en büyük şikayeti, işi alamasa bile teklif ücreti ödemesi. Bizde:

- Teklif vermek **ücretsiz**.
- %20 komisyon yalnızca **tamamlanan** siparişten kesilir.
- İptal edilen siparişte müşteriye tam iade yapılır, kimseden komisyon alınmaz.

Hizmet veren için maliyet aynı seviyede (~%20), ama yalnızca kazandığı işten ödüyor. Bu, işletmeleri
platforma çekmek için güçlü bir argüman.

## Kaynaklar

- Şikayetvar, Armut komisyon şikayetleri: https://www.sikayetvar.com/armut/hizmet-veren/komisyon-aliyor
- Betterteam Armut incelemesi: https://www.betterteam.com/tr/armut
- Armut kullanıcı sözleşmesi ("Teklif Verme Ücreti" tanımı): https://kullanicisozlesmesi.armut.com/
- Armut iş modeli (Dealroom): https://app.dealroom.co/companies/armut
- ProntoPro kredi sistemi: https://giovannifranchini.info/2019/05/13/prontopro-come-funziona-davvero-crediti-richieste-growth-hacking-startup-wang-ogliengo/
