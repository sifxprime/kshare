# Self-Hosting KShare

## What is KShare?

KShare is a localhost tunneling tool. It gives you a public HTTPS URL that forwards traffic to an app running on your own machine.

```
Internet → https://ab12x.yourdomain.com → KShare server → your laptop:3000
```

You run one command:

```bash
npx @sifxprime/kshare --port 3000
```

KShare opens an outbound WebSocket connection from your machine to the tunnel server. The server receives public HTTPS traffic and routes it back through that connection to your local app. No inbound ports are needed on your machine — your firewall stays closed.

---

## Two ways to use KShare

### Option 1 — Managed (kodelyth.net)

The easiest way. No server needed.

```bash
npx @sifxprime/kshare --port 3000
```

This connects to KODELYTH's hosted server and gives you a URL like `https://ab12x.kodelyth.net`. Works immediately with no configuration.

**Use this when:** you want zero setup, demos, client previews, webhook testing.

### Option 2 — Self-hosted (your VPS)

You deploy the KShare server on your own machine. You control the domain, the data, and the rate limits.

```bash
# After setup, point the CLI at your own server:
kshare --port 3000 --server wss://api.yourdomain.com
```

Traffic flows: `Internet → yourdomain.com → your VPS → your laptop`.

**Use this when:** your team needs a shared tunnel server, you need custom rate limits, data must not leave your infrastructure, or you want your own branded domain.

---

## Branding requirement for self-hosted instances

KShare is open source and free to self-host. The one condition is that **KODELYTH branding must remain visible** on all self-hosted instances.

Specifically, the KodeLythMark logo and "KShare by KODELYTH" must appear on:

- The tunnel server homepage (`yourdomain.com`)
- The link-expired error page shown when a tunnel is inactive
- The terminal output of the CLI

This is built into the source code and is not optional. Do not remove it.

This condition ensures that the KODELYTH name reaches the users who interact with every self-hosted instance, which funds continued development of the open-source project.

---

## Requirements

| Component | Minimum |
|-----------|---------|
| OS | Ubuntu 22.04 or 24.04 |
| CPU | 1 vCPU |
| RAM | 1 GB |
| Disk | 20 GB |
| Monthly cost | $4–6 (Hetzner, DigitalOcean, Vultr) |

You also need a domain name with the ability to add wildcard DNS records. See [dns-setup.md](dns-setup.md) for the DNS and SSL setup.

---

## Step 1 — System preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw fail2ban
```

## Step 2 — Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

## Step 3 — Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v22.x.x
npm install -g pnpm pm2
```

## Step 4 — Redis

KShare uses Redis to store tunnel state so tunnels survive server restarts.

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should print PONG
```

Set a Redis password:

```bash
sudo nano /etc/redis/redis.conf
# Find: # requirepass foobared
# Change to: requirepass your-strong-password-here

sudo systemctl restart redis-server
redis-cli -a your-strong-password-here ping   # should print PONG
```

Verify Redis is bound to localhost only (default, but worth confirming):

```bash
grep "^bind" /etc/redis/redis.conf
# Should print: bind 127.0.0.1 -::1
```

## Step 5 — Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

## Step 6 — DNS and SSL

Follow [dns-setup.md](dns-setup.md) to:

1. Add wildcard A records pointing `yourdomain.com` and `*.yourdomain.com` to your VPS IP
2. Obtain a wildcard SSL certificate with Certbot's DNS challenge

Come back here once the cert files exist at:

```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## Step 7 — Clone and configure

```bash
git clone https://github.com/sifxprime/kshare.git ~/kshare
cd ~/kshare
pnpm install
```

Copy and edit the server environment file:

```bash
cp packages/server/.env.example packages/server/.env
nano packages/server/.env
```

Fill in every value:

```bash
NODE_ENV=production
PORT=4000

# Your domain — no protocol, no trailing slash
BASE_DOMAIN=yourdomain.com

# API subdomain — Nginx routes this to the same server process
API_DOMAIN=api.yourdomain.com

# Redis — use the password you set above
REDIS_URL=redis://:your-strong-password-here@127.0.0.1:6379

# How long tunnels stay alive (default 24 hours)
TUNNEL_TTL_HOURS=24

# Abuse limits — tune these for your team size
MAX_TUNNELS_PER_IP=5
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
```

## Step 8 — Nginx configuration

```bash
sudo nano /etc/nginx/sites-available/kshare
```

Paste this config (replace `yourdomain.com` throughout):

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    return 301 https://$host$request_uri;
}

# HTTPS — main site and all tunnel subdomains
server {
    listen 443 ssl;
    server_name yourdomain.com *.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket tunnel registration
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

    # Everything else — tunnel proxy + homepage + expired page
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

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/kshare /etc/nginx/sites-enabled/kshare
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9 — Start the server

```bash
cd ~/kshare

pm2 start packages/server/src/index.js \
    --name kshare-server \
    --env production

pm2 status
```

Persist PM2 across reboots:

```bash
pm2 save
pm2 startup
# Copy and run the command it prints
```

## Step 10 — Verify

Health check from the VPS:

```bash
curl http://127.0.0.1:4000/health
# {"status":"ok","tunnels":0}
```

Test from your local machine:

```bash
npm install -g @sifxprime/kshare

# Point the CLI at your server
kshare --port 3000 --server wss://api.yourdomain.com
```

You should see:

```
  KShare  by KODELYTH

  Connected

  Public URL   https://ab12x.yourdomain.com
  Dashboard    http://localhost:4040
  Expires      23h 59m
  Local        localhost:3000
```

Open the public URL in a browser. Your local app should load.

Visit `https://yourdomain.com` — you should see the KShare homepage with KODELYTH branding.

---

## Updating

```bash
cd ~/kshare
git pull
pnpm install
pm2 restart kshare-server
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

```bash
curl -v http://127.0.0.1:4000/health
# Should return {"status":"ok","tunnels":0}
```

If that works, check Nginx is forwarding the `Host` header correctly. Each tunnel is identified by subdomain, so the `Host` header must reach the Node process unchanged.

**Cannot get wildcard SSL cert:**

The wildcard cert requires a DNS TXT challenge. Standard HTTP challenge does not work for `*.yourdomain.com`. See [dns-setup.md](dns-setup.md) for the full Certbot DNS challenge walkthrough.

**PM2 process not persisting after reboot:**

```bash
pm2 startup   # copy and run the command it prints
pm2 save
```
