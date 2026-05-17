# DNS Setup

KShare uses wildcard subdomains — every tunnel gets its own URL like `ab12x.yourdomain.com`. This requires two DNS records and a wildcard SSL certificate.

---

## DNS records

Add these two A records at your domain registrar or DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | Your VPS IP | 300 |
| A | `*` | Your VPS IP | 300 |

The `*` wildcard record makes every subdomain — `ab12x.yourdomain.com`, `xyz99.yourdomain.com`, etc. — resolve to your server.

**How to find your VPS IP:**

```bash
# Run on your VPS
curl -4 ifconfig.me
```

**Propagation:** DNS changes can take a few minutes to a few hours to propagate globally. You can check with:

```bash
dig +short yourdomain.com
dig +short ab12x.yourdomain.com
# Both should return your VPS IP
```

---

## Wildcard SSL certificate

Standard HTTPS certificates do not cover wildcard subdomains. You need a wildcard cert covering `*.yourdomain.com`.

Certbot's standard HTTP challenge cannot verify wildcards — you must use the **DNS challenge**.

### Step 1: Install Certbot

```bash
sudo apt install -y certbot
```

### Step 2: Request the wildcard cert

```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d yourdomain.com \
  -d "*.yourdomain.com"
```

Certbot will pause and ask you to add a TXT record like:

```
_acme-challenge.yourdomain.com   →   "some-random-verification-string"
```

### Step 3: Add the TXT record

In your DNS provider, add:

| Type | Name | Value |
|------|------|-------|
| TXT | `_acme-challenge` | the string Certbot gave you |

Wait 30–60 seconds, then press Enter in the Certbot prompt.

### Step 4: Verify

```bash
ls /etc/letsencrypt/live/yourdomain.com/
# Should show: cert.pem  chain.pem  fullchain.pem  privkey.pem
```

---

## Auto-renewal

Wildcard certs renewed via DNS challenge require manual intervention unless you use a DNS provider plugin.

**Manual renewal reminder (cron):**

```bash
sudo crontab -e
```

Add:

```
0 3 1 * * certbot renew --quiet
```

This attempts renewal monthly. Certbot only renews when the cert is within 30 days of expiry.

**Automated DNS renewal (recommended for production):**

Most major DNS providers have Certbot plugins. Check [certbot.eff.org/docs/using.html#dns-plugins](https://certbot.eff.org/docs/using.html#dns-plugins) for your provider:

- Cloudflare: `certbot-dns-cloudflare`
- DigitalOcean: `certbot-dns-digitalocean`
- Route53: `certbot-dns-route53`
- Google Cloud DNS: `certbot-dns-google`

Example with Cloudflare:

```bash
pip install certbot-dns-cloudflare
# Create credentials file with your Cloudflare API token
# Then:
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourdomain.com \
  -d "*.yourdomain.com"
```

Automated plugins renew without manual intervention — strongly recommended for production.

---

## Cloudflare users

If your domain uses Cloudflare's proxy (orange cloud), **disable the proxy** for the wildcard record:

- Set the `*` record to DNS only (grey cloud)
- Keep the `@` record as DNS only too

Cloudflare's proxy does not support WebSockets on the free plan in all regions, and it may interfere with tunnel connections.

---

## After DNS and SSL are ready

Return to [vps-setup.md](vps-setup.md) and continue from Step 7.
