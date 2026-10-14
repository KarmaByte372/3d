#!/usr/bin/env bash
# Baskı3D'yi Ubuntu/Debian sunucuya kurar ya da günceller (tekrar çalıştırmak güvenlidir).
#
# Kod kaynağı (biri gerekli, repo gizli olduğu için):
#   GITHUB_TOKEN=ghp_xxx bash 04-kur.sh          # salt-okunur GitHub token ile çeker
#   KAYNAK=/root/baski3d.tar.gz bash 04-kur.sh   # önceden kopyalanmış arşivden kurar
#
# İsteğe bağlı:
#   ALAN_ADI=ornek.com  SSL_EPOSTA=sen@ornek.com   -> Let's Encrypt ile HTTPS
#   ADMIN_EMAIL=...  (varsayılan admin@baski3d.local)
#   DAL=claude/armut-platform-research-y2rgo5     -> çekilecek git dalı
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "root olarak çalıştırın"; exit 1; }

UYG=baski3d
DIZIN=/opt/$UYG
PORT=3000
REPO=github.com/KarmaByte372/3d.git
DAL=${DAL:-claude/armut-platform-research-y2rgo5}
ALAN_ADI=${ALAN_ADI:-}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@baski3d.local}

adim() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }

adim "Sistem paketleri"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx build-essential openssl ca-certificates rsync >/dev/null

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  adim "Node.js 22 kuruluyor"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "Node $(node -v), npm $(npm -v)"

# Derleme düşük bellekli sunucularda çökmesin
if [ "$(free -m | awk '/Mem:/{print $2}')" -lt 2000 ] && ! swapon --show | grep -q .; then
  adim "2 GB takas alanı ekleniyor (bellek < 2 GB)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

id "$UYG" >/dev/null 2>&1 || useradd --system --home "$DIZIN" --shell /usr/sbin/nologin "$UYG"

adim "Kod alınıyor"
if [ -n "${KAYNAK:-}" ]; then
  GECICI=$(mktemp -d)
  tar -xzf "$KAYNAK" -C "$GECICI"
  KOK=$(dirname "$(find "$GECICI" -maxdepth 2 -name package.json | head -1)")
  mkdir -p "$DIZIN"
  rsync -a --delete --exclude .env --exclude 'prisma/*.db' --exclude 'uploads/' --exclude node_modules --exclude .next "$KOK"/ "$DIZIN"/
  rm -rf "$GECICI"
elif [ -d "$DIZIN/.git" ]; then
  [ -n "${GITHUB_TOKEN:-}" ] || { echo "Güncelleme için GITHUB_TOKEN gerekli"; exit 1; }
  git -C "$DIZIN" fetch -q "https://x-access-token:${GITHUB_TOKEN}@${REPO}" "$DAL"
  git -C "$DIZIN" reset -q --hard FETCH_HEAD
else
  [ -n "${GITHUB_TOKEN:-}" ] || { echo "GITHUB_TOKEN veya KAYNAK verin (repo gizli)"; exit 1; }
  git clone -q --branch "$DAL" "https://x-access-token:${GITHUB_TOKEN}@${REPO}" "$DIZIN"
  git -C "$DIZIN" remote set-url origin "https://${REPO}"   # token diske yazılmasın
fi
mkdir -p "$DIZIN/uploads"
cd "$DIZIN"

ILK_KURULUM=0
if [ ! -f .env ]; then
  adim ".env oluşturuluyor"
  ILK_KURULUM=1
  ADMIN_SIFRE=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
  cat > .env <<ENV
DATABASE_URL="file:./prod.db"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
ADMIN_EMAIL="$ADMIN_EMAIL"
ADMIN_PASSWORD="$ADMIN_SIFRE"
PAYMENT_PROVIDER="none"
ENABLE_SCHEDULER="true"
CRON_SECRET="$(openssl rand -hex 24)"
COOKIE_SECURE="false"
ENV
fi
# Sonradan eklenen ayarlar: güncellemede mevcut .env'ye eksikse eklenir
grep -q '^SMS_PROVIDER=' .env || cat >> .env <<'ENV'

# SMS: Netgsm bilgilerini girip SMS_PROVIDER="netgsm" yapın, sonra: systemctl restart baski3d
SMS_PROVIDER="log"
NETGSM_USERCODE=""
NETGSM_PASSWORD=""
NETGSM_MSGHEADER=""
NETGSM_ENDPOINT="otp"
ENV
grep -q '^SESSION_BIND_IP=' .env || echo 'SESSION_BIND_IP="true"' >> .env
chmod 600 .env

adim "Bağımlılıklar, veritabanı ve derleme"
npm ci --no-audit --no-fund --loglevel=error
npx prisma db push --skip-generate >/dev/null
npx prisma generate >/dev/null
npm run build
if [ "$ILK_KURULUM" -eq 1 ]; then
  npm run db:seed
  # Seed sonrası şifre .env'de tutulmasın
  sed -i 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=""/' .env
fi
chown -R "$UYG:$UYG" "$DIZIN"

adim "systemd servisi"
cat > /etc/systemd/system/$UYG.service <<UNIT
[Unit]
Description=Baski3D 3D baski pazaryeri
After=network.target

[Service]
Type=simple
User=$UYG
WorkingDirectory=$DIZIN
Environment=NODE_ENV=production
ExecStart=$(command -v npm) start -- -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable -q $UYG
systemctl restart $UYG

adim "nginx"
cat > /etc/nginx/sites-available/$UYG <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${ALAN_ADI:-_};
    client_max_body_size 55m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/$UYG /etc/nginx/sites-enabled/$UYG
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH >/dev/null; ufw allow 'Nginx Full' >/dev/null
fi

if [ -n "$ALAN_ADI" ] && [ -n "${SSL_EPOSTA:-}" ]; then
  adim "HTTPS (Let's Encrypt)"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$ALAN_ADI" --non-interactive --agree-tos -m "$SSL_EPOSTA" --redirect
  sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE="true"/' .env
  systemctl restart $UYG
fi

adim "Sağlık kontrolü"
for i in $(seq 1 30); do
  curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 1
done
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" && echo "Uygulama çalışıyor" || { journalctl -u $UYG -n 40 --no-pager; exit 1; }

ADRES=${ALAN_ADI:-$(hostname -I | awk '{print $1}')}
echo
echo "=================================================================="
echo " Baskı3D hazır:  http${ALAN_ADI:+s}://$ADRES"
echo " Admin paneli:   http${ALAN_ADI:+s}://$ADRES/admin"
if [ "$ILK_KURULUM" -eq 1 ]; then
  echo " Admin e-posta:  $ADMIN_EMAIL"
  echo " Admin şifre:    $ADMIN_SIFRE   (bir yere kaydedin, tekrar gösterilmez)"
fi
echo " Loglar:         journalctl -u $UYG -f"
if grep -q '^SMS_PROVIDER="log"' .env; then
  echo
  echo " NOT: SMS panelden ayarlanmadıysa doğrulama kodları sadece loga yazılır:"
  echo "        journalctl -u $UYG | grep sms:log"
  echo "        Netgsm bilgilerini admin paneli -> Entegrasyonlar sayfasından girin."
fi
echo " Veritabanı:     $DIZIN/prisma/prod.db   Yüklenen dosyalar: $DIZIN/uploads"
echo "=================================================================="
