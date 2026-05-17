# How KShare Works

A plain-English walkthrough of the tunnel architecture, request lifecycle, and URL rewriting.

---

## The core problem

Exposing a localhost port to the internet normally requires port forwarding on your router, a static IP, or a cloud VM. Most developers have none of these — they're behind NAT, CGNAT, or corporate firewalls.

KShare solves this by reversing the connection direction.

---

## Outbound WebSocket, not inbound port

Instead of opening a port for inbound connections, your machine makes one **outbound** WebSocket connection to the KShare tunnel server. Outbound connections work everywhere — Wi-Fi, LTE, corporate networks, even most VPNs.

```
Your machine                    Tunnel server
     │                               │
     │  ── WebSocket CONNECT ──>    │   (your machine initiates)
     │  <─────────────────────────  │   (server accepts)
     │                               │
     │  <── { type: "request" } ─── │   (server sends HTTP requests over WS)
     │  ─── { type: "response" } ─> │   (your machine sends responses back)
```

The server never connects to your machine — it only talks through the WebSocket your machine opened.

---

## Request lifecycle

When someone opens `https://ab12x.yourdomain.com/api/users`:

1. **DNS** resolves `ab12x.yourdomain.com` to the VPS IP (wildcard A record)
2. **Nginx** receives the HTTPS request, terminates TLS, and proxies it to the tunnel server on port 4000
3. **Tunnel server** looks up `ab12x` in its active socket map, finds your WebSocket, and sends:
   ```json
   { "type": "request", "id": "req-123", "method": "GET", "path": "/api/users", "headers": {...}, "body": null }
   ```
4. **Your CLI** receives the message, forwards it to `http://127.0.0.1:PORT/api/users`, waits for the response
5. **Your local app** handles the request normally and returns a response
6. **Your CLI** sends the response back over the WebSocket:
   ```json
   { "type": "response", "id": "req-123", "status": 200, "headers": {...}, "body": "<base64>" }
   ```
7. **Tunnel server** looks up `req-123` in the pending map, resolves the waiting HTTP response

Round-trip time is typically the WebSocket round-trip + your local app's processing time — usually 10–50ms of overhead.

---

## URL rewriting

Your local app may generate URLs like `http://localhost:3000/static/app.js` in its HTML responses. These would break when served through the tunnel because visitors' browsers would try to load `localhost:3000` — their own machine, not yours.

KShare rewrites these URLs in the response body for text content types:

- `text/html`
- `text/css`
- `application/javascript`
- `text/javascript`
- `application/json`
- `text/plain`
- `image/svg+xml`

Specifically, it replaces:
- `http://localhost:PORT` → `https://ab12x.yourdomain.com`
- `https://localhost:PORT` → `https://ab12x.yourdomain.com`
- `ws://localhost:PORT` → `wss://ab12x.yourdomain.com`
- `wss://localhost:PORT` → `wss://ab12x.yourdomain.com`
- `//localhost:PORT` → `//ab12x.yourdomain.com`
- Same for `127.0.0.1`

Binary responses (images, fonts, videos, PDFs) are proxied unchanged.

If a response is gzip, deflate, or brotli compressed, KShare decompresses it, rewrites, and re-compresses before forwarding.

---

## Cookie handling

Cookies set with `Domain=localhost` would not bind to the tunnel domain. KShare strips `Domain=localhost` and `Domain=127.0.0.1` from `Set-Cookie` headers so cookies bind to the tunnel URL instead.

---

## Tunnel state: Redis + in-memory

The tunnel server keeps state in two places:

| Store | What it holds | Why |
|-------|--------------|-----|
| Redis | Tunnel metadata (subdomain, port, IP, expiresAt, requestCount) | Survives server restarts; allows resume |
| In-memory Map | Live WebSocket connections | Fast per-request lookup |

When the CLI reconnects after a network drop, it sends its previous subdomain in the `register` message. The server checks Redis for an existing entry from the same IP — if found and not expired, it reuses the same subdomain and URL. This is how reconnection preserves the same public URL.

---

## Subdomain generation

Subdomains are short random strings (5 characters, alphanumeric) generated on registration. The server checks for collisions and reserved names before confirming.

Reserved names include: `www`, `api`, `admin`, `status`, `dashboard`, `mail`, and similar.

---

## TTL and expiry

Tunnels expire after 24 hours by default (configurable with `TUNNEL_TTL_HOURS`).

At registration time, the server starts a `setTimeout` equal to the remaining TTL. When it fires, it sends `{ type: "expired" }` over the WebSocket, deletes the Redis entry, and closes the connection. The CLI prints a message and exits.

---

## Admin API

The server exposes an internal admin HTTP server (default port 4001) at `127.0.0.1:4001`. Nginx proxies authenticated requests from the admin panel to it. It supports:

- `GET /admin/stats` — uptime, memory, active tunnel count
- `GET /admin/tunnels` — list all active tunnels with metadata
- `DELETE /admin/tunnels/:subdomain` — revoke a tunnel immediately

Authentication is a shared secret in the `X-Admin-Secret` header.
