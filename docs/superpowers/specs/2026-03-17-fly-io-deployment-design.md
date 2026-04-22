# Fly.io Deployment — Docker Services Stack

**Date:** 2026-03-17
**Status:** Approved

## Context

The Vercel-hosted Next.js app depends on three stateful services (WhatsApp bot, Listmonk email, Ghost CMS) that are currently only defined in docker-compose.yaml with no production deployment. The wa-bot has been running ad-hoc from a dev machine. All three need persistent hosting.

## Architecture

All services deploy to Fly.io under the `mukha-mudra` org.

### mm-wa-bot
- **Purpose:** WhatsApp messaging via whatsapp-web.js (Puppeteer/Chromium)
- **Machine:** shared-cpu-2x, 512MB RAM (Chromium needs memory)
- **Volume:** `wa_bot_auth` (1GB) — persists `.wwebjs_auth` and `.wwebjs_cache`
- **Database:** Connects to Neon Cloud (same DATABASE_URL as Vercel)
- **Network:** No public HTTP needed — communicates via DB only
- **Dockerfile:** Reuses existing `services/wa-bot/Dockerfile`

### mm-ghost
- **Purpose:** Headless CMS — admin panel for content, Content API for Vercel
- **Machine:** shared-cpu-1x, 256MB RAM
- **Volume:** `ghost_content` (2GB) — persists content, images, themes, SQLite DB
- **Database:** SQLite (stored in volume, no separate MySQL needed)
- **Network:** Public at `ghost.mukhamudra.com` (admin panel + Content API)
- **Image:** Official `ghost:5-alpine`

### mm-listmonk
- **Purpose:** Transactional and marketing email
- **Machine:** shared-cpu-1x, 256MB RAM
- **Database:** Fly Managed Postgres (`mm-listmonk-db`, 1GB, single node)
- **Network:** Public (Vercel crons need to reach it for `/api/cron/send-emails`)
- **Image:** Official `listmonk/listmonk:latest`

## Data Flow

```
Vercel (apps/web)
  ├─ DATABASE_URL ──────────► Neon Cloud PostgreSQL
  ├─ GHOST_URL ─────────────► mm-ghost.fly.dev (Content API)
  ├─ LISTMONK_URL ──────────► mm-listmonk.fly.dev (Transactional API)
  └─ QStash crons ──────────► Vercel /api/cron/* routes
                                ├─ send-emails → Listmonk API
                                └─ other crons → Neon DB

mm-wa-bot
  └─ DATABASE_URL ──────────► Neon Cloud PostgreSQL
     (polls MessageLog, writes wa_bot_status/wa_bot_qr to Setting)
```

## DNS

- `ghost.mukhamudra.com` → mm-ghost.fly.dev (CNAME)
- Listmonk: use `mm-listmonk.fly.dev` directly (no custom domain needed)
- wa-bot: no HTTP endpoint needed

## Environment Variables to Update on Vercel

After deployment:
- `GHOST_URL` → `https://ghost.mukhamudra.com`
- `LISTMONK_URL` → `https://mm-listmonk.fly.dev`
- `LISTMONK_API_USER` / `LISTMONK_API_PASSWORD` → new production credentials

## Estimated Cost

~$10-15/month (3 machines at ~$3-5 each + tiny Postgres + volumes)
