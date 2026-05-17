# Contributing to KShare

Thank you for taking the time to contribute. KShare is a small, well-scoped project — contributions that fit the existing design are welcome.

---

## Before you open a PR

- Open an issue first for anything non-trivial. A quick discussion saves both of us time if the approach doesn't fit.
- For bug fixes, a PR without a prior issue is fine — just describe the bug clearly in the PR body.
- For new features, please open an issue first. KShare is intentionally minimal.

---

## Development setup

**Requirements:** Node 18+, pnpm, a local Redis instance.

```bash
# Clone
git clone https://github.com/sifxprime/kshare.git
cd kshare

# Install all packages
pnpm install

# Start Redis (Docker is simplest)
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Running locally

**Server:**

```bash
cp packages/server/.env.example packages/server/.env
# Edit .env:
#   NODE_ENV=development
#   BASE_DOMAIN=localhost
#   ADMIN_SECRET=any-string-for-dev

pnpm dev:server
# Server starts on ws://localhost:4000
```

**CLI against your local server:**

```bash
# Start any local app first, then:
KSHARE_SERVER=ws://localhost:4000 node packages/cli/bin/kshare.js --port 3000
```

**Dashboard:**

```bash
cd packages/dashboard
cp .env.example .env.local
pnpm dev
# Opens on http://localhost:3000
```

---

## Package map

| Package | What it is | Key files |
|---------|-----------|-----------|
| `packages/cli` | The npm package users install globally | `src/tunnel.js`, `src/display.js`, `bin/kshare.js` |
| `packages/server` | Tunnel server (runs on a VPS) | `src/index.js`, `src/tunnel-manager.js`, `src/proxy.js` |
| `packages/dashboard` | Next.js landing page + admin panel | `app/page.tsx`, `app/admin/page.tsx` |

---

## Code conventions

- JavaScript: `'use strict'`, CommonJS modules in CLI and server
- TypeScript: strict mode in dashboard (Next.js App Router)
- Formatting: Prettier defaults (2-space indent, single quotes)
- Naming: `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants
- No `console.log` left in production paths — use named log statements with `[kshare]` prefix
- Error handling: always handle errors explicitly, never swallow them silently
- Keep CLI dependencies minimal — users install this globally and dep count matters

---

## Testing your changes

There is no automated test suite yet. Test manually:

1. Start a dummy local server: `npx serve -l 3000 .` (or any real app)
2. Start the tunnel server locally
3. Run the CLI against it
4. Verify the public URL responds correctly
5. Test reconnection: kill and restart the CLI, verify the same URL resumes

For proxy changes, test with HTML pages (URL rewriting), binary responses (images), and large payloads.

---

## Pull request checklist

- [ ] Describe what the PR does and why in the PR body
- [ ] Manual testing steps you ran
- [ ] No hardcoded VPS IPs, secrets, or credentials
- [ ] No new dependencies added to CLI without prior discussion (keep it lean)
- [ ] Dashboard changes: tested in both Chrome and Firefox

---

## What we will not accept

- Features that require users to create an account or add credentials
- Telemetry or analytics without explicit opt-in
- Dependencies with GPL or AGPL licenses (we are MIT)
- Changes to the self-hosted tunnel server that break the open protocol

---

## Commit format

```
feat: add --timeout flag to control request deadline
fix: prevent cookie domain from leaking into tunnel responses
docs: update vps-setup with Redis auth steps
chore: update ws to 8.18
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

---

## Getting help

Open an issue with the `question` label. Response times vary — this is a small team — but we do read everything.
