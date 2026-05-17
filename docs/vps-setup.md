# VPS Setup Guide

Run your own KShare tunnel server. Full control, your own domain, your data stays on your infrastructure.

**Requirements:** Ubuntu 22.04 or 24.04, 1 CPU, 1 GB RAM, 20 GB SSD.  
A $4–6/month VPS from Hetzner, DigitalOcean, or Vultr is sufficient.

---

## 1. System preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw fail2ban
```

## 2. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

## 3. Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v22.x.x
npm install -g pnpm pm2
```

## 4. Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should print PONG
```

Set a Redis password (strongly recommended):

```bash
sudo nano /etc/redis/redis.conf
# Find the line: # requirepass foobared
# Uncomment it and set a strong password:
#   requirepass your-strong-password-here

sudo systemctl restart redis-server

# Verify it works
redis-cli -a your-strong-password-here ping
```

Bind Redis to localhost only (it should already be bound to 127.0.0.1 by default — verify):

```bash
grep "^bind" /etc/redis/redis.conf
# Should print: bind 127.0.0.1 -::1
```

## 5. Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

## 6. DNS and SSL

Follow [dns-setup.md](dns-setup.md) to:

1. Add wildcard A records to your domain
2. Obtain a wildcard SSL certificate with Certbot DNS challenge

Come back here once you have the cert files at:
```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## 7. Clone and configure

```bash
git clone https://github.com/sifxprime/kshare.git ~/kshare
cd ~/kshare

pnpm install
```

Configure the server:

```bash
cp packages/server/.env.example packages/server/.env
nano packages/server/.env
```

Fill in these values:

```bash
NODE_ENV=production
PORT=4000

# Your domain (no protocol, no trailing slash)
BASE_DOMAIN=yourdomain.com

# API subdomain — typically api.yourdomain.com
API_DOMAIN=api.yourdomain.com

# Redis connection
REDIS_URL=redis://:your-strong-password-here@127.0.0.1:6379

# Admin panel secret — make this a random 32+ character string
ADMIN_SECRET=change-me-to-something-random-and-long

# How long tunnels stay active (hours)
TUNNEL_TTL_HOURS=24

# Abuse limits
MAX_TUNNELS_PER_IP=5
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
```

Configure the dashboard:

```bash
cp packages/dashboard/.env.example packages/dashboard/.env.local
nano packages/dashboard/.env.local
```

```bash
NEXT_PUBLIC_ADMIN_API=https://api.yourdomain.com/admin
```

## 8. Nginx configuration

Create the Nginx site config:

```bash
sudo nano /etc/nginx/sites-available/kshare
```

Paste this config (replace `yourdomain.com` with your actual domain):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    return 301 https://$host$request_uri;
}

# Main site and tunnel subdomains
server {
    listen 443 ssl;
    server_name yourdomain.com *.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Tunnel API and WebSocket connections
    location /connect {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # All other requests (tunnel proxy + dashboard)
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/kshare /etc/nginx/sites-enabled/kshare
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Build and start

```bash
cd ~/kshare

# Start the tunnel server
pm2 start packages/server/src/index.js \
    --name kshare-server \
    --env production

pm2 status   # should show kshare-server as online

# Build and start the dashboard
cd packages/dashboard
pnpm build
pm2 start "pnpm start" --name kshare-dashboard
cd ~/kshare

# Persist PM2 across reboots
pm2 save
pm2 startup
# Run the command it prints (it looks like: sudo env PATH=... pm2 startup ...)
```

## 10. Verify

```bash
pm2 status
pm2 logs kshare-server --lines 20
```

Then test from your local machine:

```bash
npm install -g kshare
kshare --port 3000
```

You should see:

```
  KShare  by KODELYTH

  Connected

  Public URL   https://ab12x.yourdomain.com
```

Open the URL in a browser. Your local app should load.

---

## Admin panel

Open `https://yourdomain.com/admin` (or `https://api.yourdomain.com/admin` if configured).

Enter the `ADMIN_SECRET` value you set in `packages/server/.env`.

The admin panel shows active tunnels, uptime, memory usage, and lets you revoke tunnels.

---

## Updating

```bash
cd ~/kshare
git pull
pnpm install
pm2 restart kshare-server

# Rebuild dashboard if it changed
cd packages/dashboard
pnpm build
pm2 restart kshare-dashboard
```

---

## Troubleshooting

**PM2 shows many restarts:**

```bash
pm2 logs kshare-server --lines 50
```

Common causes:
- Wrong `REDIS_URL` — test with `redis-cli -a your-password ping`
- Redis not running — `sudo systemctl status redis-server`
- Port 4000 already in use — `sudo lsof -i :4000`
- Missing `.env` file — `ls -la packages/server/.env`

**Tunnels connect but requests time out:**

Check Nginx is proxying correctly:

```bash
curl -v http://127.0.0.1:4000/health
```

Should return `{"status":"ok","tunnels":0}`.

**Cannot get wildcard SSL cert:**

Ensure you completed the DNS challenge step in [dns-setup.md](dns-setup.md). The wildcard cert is required for `*.yourdomain.com` subdomains.

**PM2 process not persisting after reboot:**

```bash
pm2 startup   # copy and run the command it prints
pm2 save
```
