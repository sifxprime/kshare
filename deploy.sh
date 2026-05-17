#!/usr/bin/env bash
# KShare VPS deployment script — run on the VPS: bash /tmp/deploy.sh
set -e

SERVER_SRC="/root/kshare/packages/server/src"
WWW_DIR="/var/www/kshare"
NGINX_CONF="/etc/nginx/sites-available/kshare"

echo "[deploy] installing server deps..."
cd /root/kshare/packages/server
npm install --omit=dev 2>/dev/null || true
cd /root/kshare

echo "[deploy] writing Nginx config..."
cat > "$NGINX_CONF" << 'NGINX'
# Block direct IP access — must be first
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    return 444;
}

server {
    listen 443 default_server ssl;
    listen [::]:443 default_server ssl;
    ssl_certificate     /etc/letsencrypt/live/kodelyth.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kodelyth.net/privkey.pem;
    return 444;
}

# Homepage — static HTML, no Node.js
server {
    listen 80;
    listen [::]:80;
    server_name kodelyth.net www.kodelyth.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name kodelyth.net www.kodelyth.net;

    ssl_certificate     /etc/letsencrypt/live/kodelyth.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kodelyth.net/privkey.pem;

    root /var/www/kshare;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

# API domain — status endpoint proxied to Node
server {
    listen 80;
    listen [::]:80;
    server_name api.kodelyth.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name api.kodelyth.net;

    ssl_certificate     /etc/letsencrypt/live/kodelyth.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kodelyth.net/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Tunnel subdomain proxy — wildcard *.kodelyth.net
server {
    listen 80;
    listen [::]:80;
    server_name *.kodelyth.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name *.kodelyth.net;

    ssl_certificate     /etc/letsencrypt/live/kodelyth.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kodelyth.net/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX

echo "[deploy] testing Nginx config..."
nginx -t

echo "[deploy] reloading Nginx..."
systemctl reload nginx

echo "[deploy] removing kshare-dashboard from PM2..."
pm2 delete kshare-dashboard 2>/dev/null && echo "  removed kshare-dashboard" || echo "  kshare-dashboard was not running — ok"

echo "[deploy] restarting tunnel server..."
pm2 restart kshare-server

echo "[deploy] saving PM2 state..."
pm2 save

echo ""
pm2 list
echo ""
echo "[deploy] complete."
echo ""
echo "  Homepage : https://kodelyth.net  (static HTML)"
echo "  API      : https://api.kodelyth.net/api/status/<subdomain>"
echo "  IP direct: returns 444 (blocked)"
