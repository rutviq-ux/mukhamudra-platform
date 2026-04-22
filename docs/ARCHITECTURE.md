# Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Next.js App │────▶│  PostgreSQL  │◀────│  WA Bot   │
│  (Vercel)    │     │  (Managed)   │     │  Service  │
└──────┬───┬──┘     └──────────────┘     └───────────┘
       │   │
       │   └──────▶ Clerk (Auth)
       │
       ├──────────▶ Razorpay (Payments)
       ├──────────▶ Ghost CMS (Blog)
       ├──────────▶ Listmonk (Email)
       ├──────────▶ PostHog (Analytics)
       └──────────▶ Sentry (Errors)
```

## Monorepo Structure

```
ru/
├── apps/
│   └── web/                    # Next.js 16 app (App Router)
│       ├── app/                # Routes (pages, layouts, API)
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── landing/    # Landing page sections
│       │   │   ├── three/      # React Three Fiber 3D components
│       │   │   └── ...
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Utilities, clients, helpers
│       │   └── i18n/           # Internationalization config
│       ├── messages/           # i18n translation files
│       └── public/             # Static assets
├── apps-infra/
│   ├── ghost/                  # Ghost CMS Docker config
│   └── listmonk/               # Listmonk Docker config
├── packages/
│   ├── ui/                     # Shared UI components (shadcn/ui + Tailwind v4)
│   ├── db/                     # Prisma schema + generated client
│   ├── config/                 # Environment validation, Zod schemas, constants
│   ├── ghost-client/           # Ghost CMS API wrapper
│   ├── listmonk-client/        # Listmonk API wrapper
│   └── notifications/          # Multi-channel notification providers
├── services/
│   └── wa-bot/                 # WhatsApp bot (whatsapp-web.js)
├── tooling/
│   └── scripts/                # Seed, backup, and utility scripts
├── docs/                       # Developer documentation
├── docker-compose.yml          # Local dev services
└── turbo.json                  # Turborepo pipeline config
```

## Data Flow

### Payment Flow (One-time Purchase)

1. User selects a plan on `/checkout`
2. Frontend calls `POST /api/razorpay/checkout` with `planSlug`
3. Server creates a Razorpay Order, stores it as `Order` (status: PENDING)
4. Frontend opens Razorpay checkout modal
5. On success, Razorpay sends `payment.captured` webhook
6. Server verifies signature, marks Order as PAID
7. Credits added to user's `CreditLedger`
8. Payment confirmation notification queued

### Payment Flow (Subscription)

1. User selects a batch on `/pranayama`
2. Frontend calls `POST /api/razorpay/subscription` with `batchSlug`
3. Server creates Razorpay Subscription, stores `Membership` (status: PENDING)
4. Razorpay sends `subscription.activated` webhook
5. Server activates Membership with period dates
6. Monthly: `subscription.charged` webhook renews the period

### Booking Flow

1. User views available sessions on `/app/book`
2. `POST /api/bookings` checks credits or active membership
3. If credit-based: deducts 1 credit from ledger
4. If membership: verifies active membership for the batch
5. Creates Booking record, decrements available capacity
6. Session reminder cron sends notifications before session

### WhatsApp Messaging

1. Application queues a message in `MessageLog` (status: QUEUED)
2. WA Bot polls every 5 seconds for QUEUED messages
3. Bot verifies user opt-in (`whatsappOptIn = true`)
4. Bot checks rate limits (per-minute, per-day)
5. Sends via whatsapp-web.js, updates status to SENT/FAILED
6. Heartbeat written to `Setting` table every 30 seconds

## Database Schema

Key models (see `packages/db/prisma/schema.prisma`):

- **User** - Clerk-synced user with role (USER/COACH/OPS/ADMIN)
- **Product** - FACE_YOGA or PRANAYAMA
- **Plan** - Pricing plans (one-time credit packs)
- **Batch** - Recurring session groups with schedule
- **Session** - Individual class instances
- **Booking** - User-session join with status
- **Order** - Payment records linked to Razorpay
- **Membership** - Subscription records for batch access
- **CreditLedger** - Append-only credit transaction log
- **MessageLog** - Multi-channel message queue
- **MessageTemplate** - Configurable notification templates
- **Setting** - Key-value app configuration
- **AuditLog** - Admin action audit trail
- **WebhookEvent** - Idempotent webhook processing log

## Security

- **Authentication**: Clerk with JWT session tokens
- **Authorization**: Role-based (USER < COACH < OPS < ADMIN)
- **API Security**: Zod validation on all inputs, CORS whitelist, rate limiting
- **Payment Security**: Razorpay webhook signature verification, idempotency keys
- **CSP**: Strict Content-Security-Policy headers
- **WhatsApp**: Opt-in only, rate limited, audit logged

## Performance

- **3D Landing Page**: Progressive enhancement with WebGL tier detection
  - High: Full 3D scene, post-processing, 300 particles
  - Medium: Reduced effects, 150 particles
  - Low/No WebGL: CSS fallback animations
- **Server Components**: Most pages are server-rendered
- **Caching**: ISR for blog posts, static generation for marketing pages
- **Database**: Indexed queries, connection pooling via Prisma
