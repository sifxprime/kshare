# KShare

**by KODELYTH**

Turn any localhost port into a public HTTPS link — in one command.  
No config, no cloud account, no port forwarding. Just run it.

[![npm](https://img.shields.io/badge/npm-%40sifxprime%2Fkshare-red.svg)](https://www.npmjs.com/package/@sifxprime/kshare)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/sifxprime/kshare/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Self-hostable](https://img.shields.io/badge/self--hostable-yes-blueviolet.svg)](https://github.com/sifxprime/kshare/blob/main/docs/vps-setup.md)

<p align="center">
  <img
    src="https://raw.githubusercontent.com/sifxprime/kshare/main/docs/images/social-preview.png"
    alt="KShare — Share localhost. Instantly."
    width="860"
  />
</p>

---

## Install

```bash
# Install globally
npm install -g @sifxprime/kshare

# Or run without installing
npx @sifxprime/kshare --port 3000
```

> The binary is always called `kshare`. After a global install, run `kshare --port 3000`.

Works on **macOS**, **Linux**, and **Windows**. Node 18+ required.

---

## Quick start

```bash
kshare --port 3000
```

<p align="center">
  <img
    src="https://raw.githubusercontent.com/sifxprime/kshare/main/docs/images/install.svg"
    alt="KShare terminal output"
    width="860"
  />
</p>

Anyone on the internet can now open your app at that HTTPS link.

---

## How it works

<p align="center">
  <img
    src="https://raw.githubusercontent.com/sifxprime/kshare/main/docs/images/architecture.svg"
    alt="KShare architecture — outbound WebSocket tunnel"
    width="860"
  />
</p>

KShare opens one **outbound WebSocket** to the tunnel server. No inbound ports, no firewall rules, no cloud account. When someone hits your public URL, the request travels back through that WebSocket to your local server.

---

## Usage

```bash
# Share any port
kshare --port 3000
kshare --port 5173
kshare --port 8080

# Short form — no flag needed
kshare 3000

# Password-protect the link
kshare --port 3000 --password mysecret

# Show QR code in terminal (great for mobile testing)
kshare --port 3000 --qr

# Point at your own self-hosted server
kshare --port 3000 --server wss://api.yourdomain.com

# View active tunnels on this machine
kshare status

# Stop tunnels
kshare stop
```

---

## Local dashboard

<p align="center">
  <img
    src="https://raw.githubusercontent.com/sifxprime/kshare/main/docs/images/dashboard.svg"
    alt="KShare local dashboard"
    width="860"
  />
</p>

While a tunnel is running, open **[http://localhost:4040](http://localhost:4040)** to see:

- Live request log with method, path, and timestamp
- Public URL, local port, and request count
- Expiry countdown with visual progress bar
- No browser extension required

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `KSHARE_SERVER` | `wss://api.kodelyth.net` | WebSocket server URL (overridden by `--server` flag) |
| `KSHARE_PASSWORD` | — | Default password (overridden by `--password` flag) |

---

## Works with everything

| Framework | Command |
|-----------|---------|
| React / CRA | `kshare 3000` |
| Vite / Vue | `kshare 5173` |
| Next.js | `kshare 3000` |
| Express / Node | `kshare 3000` |
| Django | `kshare 8000` |
| Flask | `kshare 5000` |
| Laravel | `kshare 8000` |
| Rails | `kshare 3000` |
| FastAPI | `kshare 8000` |
| Spring Boot | `kshare 8080` |

---

## Self-host

KShare works two ways:

**Managed** — connect to KODELYTH's server, zero setup:
```bash
kshare --port 3000
# → https://ab12x.kodelyth.net
```

**Self-hosted** — deploy on your own VPS, your domain:
```bash
git clone https://github.com/sifxprime/kshare.git
cd kshare/packages/server
cp .env.example .env   # set BASE_DOMAIN and REDIS_URL
pnpm install && pnpm start

# Then point the CLI at your server:
kshare --port 3000 --server wss://api.yourdomain.com
# → https://ab12x.yourdomain.com
```

Self-hosted instances must display KODELYTH branding — the logo and "KShare by KODELYTH" appear on the homepage and error pages by default and should not be removed.

Full setup guide: [docs/vps-setup.md](https://github.com/sifxprime/kshare/blob/main/docs/vps-setup.md)  
DNS and SSL guide: [docs/dns-setup.md](https://github.com/sifxprime/kshare/blob/main/docs/dns-setup.md)

---

## Security

- One outbound WebSocket — no inbound ports opened
- No code injected into your app
- URL rewriting on raw text only — no DOM manipulation
- Tunnels auto-expire after 24 hours
- Password protection available
- Self-host for full traffic control

[SECURITY.md](https://github.com/sifxprime/kshare/blob/main/SECURITY.md) — vulnerability disclosure policy.

---

## Links

- **GitHub**: [github.com/sifxprime/kshare](https://github.com/sifxprime/kshare)
- **Homepage**: [kodelyth.net](https://kodelyth.net)
- **Issues**: [github.com/sifxprime/kshare/issues](https://github.com/sifxprime/kshare/issues)

---

MIT — [KODELYTH](https://kodelyth.com)
