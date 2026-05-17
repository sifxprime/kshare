# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | Yes |
| Older releases | No — upgrade to latest |

---

## Threat model

Understanding what KShare protects and what it does not:

**KShare protects:**

- Your local network: KShare makes one outbound WebSocket connection. No ports are opened on your machine. No inbound connections are accepted. Your firewall remains unchanged.
- Tunnel confidentiality: Tunnels use HTTPS end-to-end. Traffic between the public URL and the tunnel server is TLS-encrypted.
- Access control: Password-protected tunnels (`--password`) reject unauthenticated requests at the server level before any traffic reaches your machine.
- URL integrity: Outgoing HTML, CSS, and JS are rewritten to replace localhost references with the tunnel URL. No scripts are injected.

**KShare does not protect:**

- Your app's own security: KShare proxies requests as-is. If your local app has vulnerabilities (SQL injection, auth bypass, path traversal), those vulnerabilities are now publicly reachable.
- Traffic content: The self-hosted tunnel server sees plaintext request and response bodies. Traffic between the CLI and the server is encrypted, but the server decrypts it to proxy the request. If you self-host, you control this server. If you use the hosted service, KODELYTH operates it.
- App secrets: Any secrets your local app logs to stdout are visible in the tunnel server logs. Use `--password` to limit who can trigger requests.

**Recommendation for sensitive work:** self-host the server on infrastructure you control, and use `--password` for any tunnel that proxies authenticated routes.

---

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **security@kodelyth.com**

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any proof-of-concept code (encrypted if you prefer)

You will receive an acknowledgement within 48 hours.

**Disclosure timeline:**

1. Report received — acknowledged within 48 hours
2. Triage and severity assessment — within 5 business days
3. Fix developed and tested
4. Patch released
5. Public disclosure — coordinated with you, typically 90 days after initial report

We follow responsible disclosure. We will credit reporters in release notes unless you request anonymity.

---

## Known risk areas

If you are auditing the codebase, focus on these areas:

**CLI (`packages/cli/src/tunnel.js`)**
- URL rewriting: `rewriteText` replaces localhost references in response bodies. Ensure rewriting cannot be triggered on binary content types that match `REWRITABLE_TYPES`.
- WebSocket reconnect: exponential backoff is not implemented — consider adding jitter for large deployments.

**Server (`packages/server/src/`)**
- `proxy.js`: Handles forwarding HTTP requests to the connected WebSocket. Verify request timeout and error handling prevents resource exhaustion.
- `auth.js`: Admin authentication uses a shared secret. Ensure it is compared with a constant-time comparison to prevent timing attacks.
- Rate limiting: IP-based rate limiting uses Redis. Verify that `X-Forwarded-For` spoofing is mitigated by trusting only the first IP in the chain.
- Subdomain allocation: Subdomains are generated randomly. Verify collision handling and that reserved names cannot be allocated.

**Dashboard (`packages/dashboard/`)**
- Admin panel (`app/admin/page.tsx`): The admin secret is sent as a request header. Ensure it is not logged in any access log visible to unauthorized parties.

---

## Dependency scanning

```bash
# Audit npm dependencies
npm audit

# Check for known CVEs in pnpm lockfile
pnpm audit
```

Dependencies are kept minimal by design:
- CLI: `ws`, `qrcode`, `node-fetch` — all stable, widely audited packages
- Server: `ws`, `ioredis`, `dotenv`
- Dashboard: Next.js, React — standard Vercel stack

---

## Self-host hardening checklist

If you operate your own KShare server:

- [ ] Set `ADMIN_SECRET` to a random 32+ character string
- [ ] Configure `RATE_LIMIT_MAX_REQUESTS` appropriate for your expected traffic
- [ ] Set `MAX_TUNNELS_PER_IP` to limit abuse
- [ ] Enable Redis authentication (`requirepass` in `redis.conf`)
- [ ] Bind Redis to `127.0.0.1` — never expose it publicly
- [ ] Use the provided Nginx config with TLS and `proxy_set_header X-Real-IP`
- [ ] Set up UFW to allow only ports 22, 80, 443
- [ ] Enable `fail2ban` for SSH brute-force protection
- [ ] Monitor PM2 logs for unexpected restarts
- [ ] Keep Node.js and npm packages updated
