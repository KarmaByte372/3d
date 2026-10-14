#!/usr/bin/env bash
# Mevcut projenin tam yedeğini alır: proje klasörü, tüm MySQL/PostgreSQL veritabanları,
# web sunucusu ayarları, pm2/docker/cron bilgileri. Yedeği açıp kontrol eder.
# Kullanım: bash 02-yedekle.sh /var/www/eski-proje [/ek/klasor ...]
set -euo pipefail

[ "$#" -ge 1 ] || { echo "Kullanım: $0 <proje-klasörü> [ek klasörler...]"; exit 1; }
for p in "$@"; do [ -e "$p" ] || { echo "Bulunamadı: $p"; exit 1; }; done

ZAMAN=$(date +%Y%m%d-%H%M%S)
HEDEF=/root/yedekler/$ZAMAN
mkdir -p "$HEDEF"
chmod 700 /root/yedekler "$HEDEF"
echo "Yedek klasörü: $HEDEF"

echo "-> Proje dosyaları arşivleniyor"
tar -czpf "$HEDEF/proje-dosyalari.tar.gz" --absolute-names "$@"

if command -v mysqldump >/dev/null; then
  echo "-> MySQL/MariaDB veritabanları"
  mysqldump --all-databases --single-transaction --routines --events --triggers 2>/dev/null \
    | gzip > "$HEDEF/mysql-tum.sql.gz" || echo "   UYARI: mysqldump başarısız (şifre gerekebilir)"
fi
if command -v pg_dumpall >/dev/null; then
  echo "-> PostgreSQL veritabanları"
  sudo -u postgres pg_dumpall 2>/dev/null | gzip > "$HEDEF/postgres-tum.sql.gz" \
    || echo "   UYARI: pg_dumpall başarısız"
fi
if command -v docker >/dev/null && [ -n "$(docker ps -aq 2>/dev/null)" ]; then
  echo "-> Docker bilgileri ve birimleri"
  docker ps -a > "$HEDEF/docker-ps.txt"
  for v in $(docker volume ls -q); do
    docker run --rm -v "$v":/v -v "$HEDEF":/b alpine tar -czf "/b/docker-volume-$v.tar.gz" -C /v . 2>/dev/null \
      || echo "   UYARI: $v birimi yedeklenemedi"
  done
fi

echo "-> Sunucu ayarları"
tar -czf "$HEDEF/sunucu-ayarlari.tar.gz" --ignore-failed-read \
  /etc/nginx /etc/apache2 /etc/systemd/system /etc/letsencrypt /etc/crontab /var/spool/cron 2>/dev/null || true
command -v pm2 >/dev/null && { pm2 list > "$HEDEF/pm2-list.txt" 2>&1; pm2 save --force >/dev/null 2>&1; cp ~/.pm2/dump.pm2 "$HEDEF/" 2>/dev/null || true; }
crontab -l > "$HEDEF/root-crontab.txt" 2>/dev/null || true

echo "-> Yedek doğrulanıyor"
for f in "$HEDEF"/*.gz; do
  gzip -t "$f" || { echo "BOZUK: $f"; exit 1; }
done
tar -tzf "$HEDEF/proje-dosyalari.tar.gz" > /dev/null
DOSYA_SAYISI=$(tar -tzf "$HEDEF/proje-dosyalari.tar.gz" | wc -l)
(cd "$HEDEF" && sha256sum ./* > SHA256SUMS)
touch "$HEDEF/.tamamlandi"

echo
echo "YEDEK TAMAM: $HEDEF ($(du -sh "$HEDEF" | cut -f1), proje arşivinde $DOSYA_SAYISI dosya)"
ls -lh "$HEDEF"
echo
echo "Bilgisayarına indirmek için (kendi bilgisayarında çalıştır):"
echo "  scp -r root@$(hostname -I | awk '{print $1}'):$HEDEF ."
