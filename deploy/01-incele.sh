#!/usr/bin/env bash
# Sunucuyu YALNIZCA OKUYARAK inceler: hangi proje nerede, neyle çalışıyor, hangi veritabanları var.
# Hiçbir şeyi değiştirmez. Kullanım: bash 01-incele.sh
set -u

baslik() { printf '\n==== %s ====\n' "$1"; }

baslik "Sistem"
uname -a
[ -f /etc/os-release ] && . /etc/os-release && echo "$PRETTY_NAME"
uptime
df -h / | tail -1
free -h | sed -n 2p

baslik "Dinlenen portlar"
(ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null) | grep LISTEN

baslik "Proje olabilecek klasörler"
for d in /var/www /srv /opt /home /root; do
  [ -d "$d" ] || continue
  find "$d" -maxdepth 3 \( -name package.json -o -name composer.json -o -name requirements.txt \
    -o -name manage.py -o -name docker-compose.yml -o -name compose.yaml -o -name wp-config.php \
    -o -name index.php -o -name .git \) -not -path '*/node_modules/*' 2>/dev/null
done | sort

baslik "Klasör boyutları"
for d in /var/www/* /srv/* /opt/* /home/*; do [ -e "$d" ] && du -sh "$d" 2>/dev/null; done

baslik "Web sunucusu yapılandırması"
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf /etc/apache2/sites-enabled/*; do
  [ -f "$f" ] || continue
  echo "--- $f"
  grep -E 'server_name|root |proxy_pass|DocumentRoot|ServerName|listen' "$f" | sed 's/^/   /'
done

baslik "Çalışan uygulama süreçleri"
command -v pm2 >/dev/null && pm2 list
command -v docker >/dev/null && docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
systemctl list-units --type=service --state=running --no-pager 2>/dev/null \
  | grep -vE 'systemd|dbus|ssh|cron|getty|network|rsyslog|polkit|udev|snap|multipathd|unattended|user@|qemu|serial|chrony|ntp|irqbalance|accounts|ModemManager|fwupd|thermald|upower|packagekit' 

baslik "Veritabanları"
if command -v mysql >/dev/null; then
  echo "MySQL/MariaDB:"; mysql -N -e 'SHOW DATABASES' 2>/dev/null | grep -vE '^(information_schema|performance_schema|mysql|sys)$' | sed 's/^/   /'
fi
if command -v psql >/dev/null; then
  echo "PostgreSQL:"; sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datname NOT IN ('template0','template1','postgres')" 2>/dev/null | sed 's/^/   /'
fi
command -v mongosh >/dev/null && echo "MongoDB kurulu"
find / -xdev \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -size +0 \
  -not -path '/proc/*' -not -path '/usr/*' -not -path '/var/lib/*' -not -path '*/node_modules/*' 2>/dev/null | head -20

baslik "Zamanlanmış görevler (root)"
crontab -l 2>/dev/null || echo "(yok)"
