# DNS and SSL Setup

KShare assigns every tunnel a unique subdomain: `ab12x.yourdomain.com`, `xyz99.yourdomain.com`, and so on. For this to work, two things must be true:

1. Every subdomain must resolve to your VPS IP (wildcard DNS)
2. Every subdomain must have a valid HTTPS certificate (wildcard SSL)

---

## DNS records

Add these records at your domain registrar or DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | Your VPS IP | 300 |
| A | `*` | Your VPS IP | 300 |

The `@` record covers the root domain (`yourdomain.com`).  
The `*` wildcard covers every subdomain: `ab12x.yourdomain.com`, `api.yourdomain.com`, etc.

**Find your VPS IP:**

```bash
# Run on the VPS
curl -4 ifconfig.me
```

**Check propagation:**

```bash
dig +short yourdomain.com
dig +short anything.yourdomain.com
# Both should return your VPS IP
```

DNS changes typically propagate within a few minutes, but can take up to an hour depending on your provider and TTL.

---

## Wildcard SSL certificate

A standard certificate covers only a single domain. A wildcard certificate covers `*.yourdomain.com` — every subdomain with one cert.

Certbot's HTTP challenge cannot issue wildcard certs. You must use the **DNS-01 challenge**, which proves domain ownership by adding a temporary TXT record.

### Step 1 — Install Certbot

```bash
sudo apt install -y certbot
```

### Step 2 — Request the wildcard cert

```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d yourdomain.com \
  -d "*.yourdomain.com"
```

Certbot pauses and gives you a verification string like:

```
Please deploy a DNS TXT record under the name:
_acme-challenge.yourdomain.com
with the following value:
aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### Step 3 — Add the TXT record

In your DNS provider, add:

| Type | Name | Value |
|------|------|-------|
| TXT | `_acme-challenge` | the string Certbot gave you |

Wait 30–60 seconds for the TXT record to propagate, then press Enter in the Certbot prompt.

If Certbot fails the challenge, wait another minute and try again. TXT propagation is usually fast but not instant.

### Step 4 — Verify

```bash
ls /etc/letsencrypt/live/yourdomain.com/
# cert.pem  chain.pem  fullchain.pem  privkey.pem
```

---

## Auto-renewal

Wildcard certs obtained via manual DNS challenge need manual renewal unless you use a DNS provider plugin. Certbot renews automatically when a cert is within 30 days of expiry.

**If you cannot use a plugin (manual renewal):**

```bash
sudo crontab -e
```

Add:

```
0 3 1 * * certbot renew --quiet
```

When renewal runs, Certbot asks you to update the TXT record again. Set a calendar reminder.

**Recommended: use a DNS provider plugin for fully automatic renewal.**

| Provider | Plugin |
|----------|--------|
| Cloudflare | `certbot-dns-cloudflare` |
| DigitalOcean | `certbot-dns-digitalocean` |
| AWS Route 53 | `certbot-dns-route53` |
| Google Cloud DNS | `certbot-dns-google` |

See the full plugin list at [certbot.eff.org/docs/using.html#dns-plugins](https://certbot.eff.org/docs/using.html#dns-plugins).

Example with Cloudflare:

```bash
pip install certbot-dns-cloudflare

# Create ~/.secrets/cloudflare.ini with your API token:
# dns_cloudflare_api_token = your-cloudflare-api-token

chmod 600 ~/.secrets/cloudflare.ini

sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourdomain.com \
  -d "*.yourdomain.com"
```

Once configured, renewal runs fully automatically with no manual steps.

---

## Cloudflare proxy (important)

If your domain is on Cloudflare, the tunnel subdomain records must be **DNS only** (grey cloud), not proxied (orange cloud).

- `@` → DNS only
- `*` → DNS only

Cloudflare's proxy layer intercepts WebSocket connections in ways that break the tunnel. Set both records to DNS-only mode before testing.

---

## After DNS and SSL are ready

Return to [vps-setup.md](vps-setup.md) and continue from Step 7.
