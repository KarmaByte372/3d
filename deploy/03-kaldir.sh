#!/usr/bin/env bash
# Eski projeyi durdurur ve siler. Son 24 saatte alınmış doğrulanmış bir yedek yoksa çalışmaz.
# Veritabanlarına dokunmaz (yedekleri zaten alındı); silmek isterseniz ayrıca belirtin.
# Kullanım: bash 03-kaldir.sh /var/www/eski-proje
set -euo pipefail

PROJE=${1:?"Kullanım: $0 <proje-klasörü>"}
PROJE=$(realpath "$PROJE")
case "$PROJE" in
  /|/root|/home|/var|/var/www|/opt|/srv|/etc|/usr) echo "Bu klasör silinemez: $PROJE"; exit 1;;
esac

SON_YEDEK=$(find /root/yedekler -maxdepth 2 -name .tamamlandi -mmin -1440 2>/dev/null | sort | tail -1)
[ -n "$SON_YEDEK" ] || { echo "Son 24 saatte tamamlanmış yedek yok. Önce 02-yedekle.sh çalıştırın."; exit 1; }
YEDEK_KLASORU=$(dirname "$SON_YEDEK")
tar -tzf "$YEDEK_KLASORU/proje-dosyalari.tar.gz" | grep -q "^$PROJE" \
  || { echo "Son yedek bu klasörü içermiyor: $PROJE"; exit 1; }
echo "Yedek bulundu: $YEDEK_KLASORU"

echo "Silinecek: $PROJE ($(du -sh "$PROJE" | cut -f1))"
read -r -p "Onaylamak için SIL yazın: " ONAY
[ "$ONAY" = "SIL" ] || { echo "İptal edildi."; exit 1; }

if command -v pm2 >/dev/null; then
  for id in $(pm2 jlist 2>/dev/null | node -e '
    const l=JSON.parse(require("fs").readFileSync(0,"utf8")||"[]");
    for (const p of l) if ((p.pm2_env?.pm_cwd||"").startsWith(process.argv[1])) console.log(p.pm_id)' "$PROJE" 2>/dev/null); do
    echo "-> pm2 süreci durduruluyor: $id"; pm2 delete "$id"
  done
  pm2 save --force >/dev/null 2>&1 || true
fi

for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
  if [ -f "$PROJE/$c" ] && command -v docker >/dev/null; then
    echo "-> docker compose durduruluyor"; (cd "$PROJE" && docker compose down || docker-compose down) || true
  fi
done

for unit in $(grep -l "$PROJE" /etc/systemd/system/*.service 2>/dev/null); do
  name=$(basename "$unit")
  echo "-> systemd servisi kaldırılıyor: $name"
  systemctl disable --now "$name" || true
  rm -f "$unit"
done
systemctl daemon-reload

for site in $(grep -l "$PROJE" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null); do
  echo "-> nginx sitesi devre dışı: $site"; rm -f "$site"
done
command -v nginx >/dev/null && nginx -t && systemctl reload nginx || true

echo "-> Dosyalar siliniyor"
rm -rf --one-file-system "$PROJE"
echo "Eski proje kaldırıldı. Yedek: $YEDEK_KLASORU"
