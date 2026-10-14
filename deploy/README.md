# Sunucuya kurulum

Bu klasördeki betikler sırasıyla eski projeyi **inceler**, **yedekler**, **kaldırır** ve Baskı3D'yi **kurar**.
Hepsi sunucuda `root` olarak çalıştırılır. Desteklenen sistemler: Ubuntu 20.04+ ve Debian 11+.

## 0. Betikleri sunucuya kopyala

Kendi bilgisayarında, repo klasöründeyken:

```bash
scp -r deploy root@SUNUCU_IP:/root/
ssh root@SUNUCU_IP
cd /root/deploy
```

## 1. İncele (hiçbir şeyi değiştirmez)

```bash
bash 01-incele.sh | tee inceleme.txt
```

Çıktıda eski projenin klasörünü (ör. `/var/www/site`), veritabanlarını ve çalışan servisleri gör.

## 2. Yedekle

```bash
bash 02-yedekle.sh /var/www/site
```

Yedeğe şunlar girer:
- proje dosyaları,
- tüm MySQL ve PostgreSQL veritabanları,
- Docker birimleri,
- nginx, apache, systemd ve SSL ayarları,
- cron ve pm2 kayıtları.

Betik her arşivi açıp kontrol eder. Yedek `/root/yedekler/TARIH/` altına yazılır. Bir kopyasını kendi
bilgisayarına da indir:

```bash
scp -r root@SUNUCU_IP:/root/yedekler/TARIH .
```

## 3. Eski projeyi kaldır

```bash
bash 03-kaldir.sh /var/www/site
```

- Son 24 saatte o klasörü içeren doğrulanmış bir yedek yoksa betik çalışmaz.
- Senden `SIL` yazmanı ister.
- Projenin pm2, docker, systemd ve nginx kayıtlarını durdurup kaldırır, sonra klasörü siler.
- Veritabanlarına dokunmaz. Yedekleri alındı, istersen sonra elle silebilirsin.

## 4. Baskı3D'yi kur

Repo gizli olduğu için kodu çekmenin iki yolu var.

**A) GitHub token ile (önerilen, güncellemesi kolay):**
GitHub'da Settings → Developer settings → Fine-grained tokens bölümünden yalnızca `KarmaByte372/3d` reposuna
**Contents: Read-only** yetkili bir token oluştur.

```bash
GITHUB_TOKEN=github_pat_xxx bash 04-kur.sh
```

**B) Arşivle:** Kendi bilgisayarında `git archive --prefix=baski3d/ -o baski3d.tar.gz HEAD` çalıştır,
`scp baski3d.tar.gz root@SUNUCU_IP:/root/` ile gönder. Sonra sunucuda:

```bash
KAYNAK=/root/baski3d.tar.gz bash 04-kur.sh
```

Alan adın varsa (DNS kaydı sunucu IP'sine yönlenmiş olmalı), HTTPS de otomatik kurulur:

```bash
GITHUB_TOKEN=... ALAN_ADI=baski3d.com SSL_EPOSTA=sen@mail.com bash 04-kur.sh
```

Kurulumun yaptıkları:
- Node.js 22, nginx ve gerekiyorsa takas alanı kurar.
- Kodu `/opt/baski3d` klasörüne alır, rastgele gizli anahtarlarla `.env` dosyasını oluşturur.
- Uygulamayı derler ve admin hesabını açar.
- `baski3d` adlı systemd servisini başlatır, nginx'i 80 portundan uygulamaya yönlendirir.

Admin şifresi kurulumun sonunda **bir kez** ekrana yazılır.

**Güncelleme:** Aynı komutu tekrar çalıştır. `.env`, veritabanı ve yüklenen dosyalar korunur.

## Kurulumdan sonra

- `/admin/ayarlar` sayfasından şunları gir: site/marka adı, şirket bilgileri (yasal sayfalarda kullanılır) ve
  havale/EFT için banka bilgileri.
- **SMS (Netgsm):** Admin panelinde **Entegrasyonlar** sayfasına gir. Gönderimi "Netgsm" yap; kullanıcı kodu, API
  şifresi ve mesaj başlığını gir, kaydet. Ardından "Test SMS'i gönder" ile kendi numarana dene. Netgsm panelinde API
  alt kullanıcısına sunucu IP'sinden erişim izni vermeyi unutma.
  SMS ayarlanmadan kayıt olanların kodları sadece loga düşer: `journalctl -u baski3d | grep sms:log`
- **SMTP (isteğe bağlı):** Aynı sayfadan girilip test e-postasıyla denenebilir.
- Kartla ödeme admin → Entegrasyonlar → PayTR'den açılır. PayTR panelinde Bildirim URL: `http://SUNUCU/api/paytr/callback`
  (alan adı ve https alınınca güncelleyin). PayTR kapalıyken kartla ödeme gizlenir, havale çalışır.
- Alan adı ve SSL olmadan site `http://IP` adresinden çalışır, ama şifreler şifrelenmeden gider.
  Gerçek kullanıcı almadan önce alan adı ve HTTPS kur.
- Veritabanı `/opt/baski3d/prisma/prod.db`, yüklenen dosyalar `/opt/baski3d/uploads`. Bu ikisini düzenli yedekle.
- Komutlar:
  - `systemctl status baski3d` durumu gösterir.
  - `journalctl -u baski3d -f` logları canlı izler.
  - `systemctl restart baski3d` servisi yeniden başlatır.

## Güvenlik

Root şifresi bir sohbete yazıldıysa **hemen değiştir** (`passwd`). Şifreyle giriş yerine SSH anahtarı kullan:
1. Kendi bilgisayarında `ssh-copy-id root@SUNUCU_IP` çalıştır.
2. Sunucuda `/etc/ssh/sshd_config` içinde `PasswordAuthentication no` yap.
3. `systemctl restart ssh` ile SSH'yi yeniden başlat.
