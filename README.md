# Mukha Mudra Platform (1.0.4)

A production-ready online yoga platform with Face Yoga (1:1 sessions) and Pranayama (group subscriptions).

## Tech Stack

- **Frontend**: Next.js 16.1.1, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth**: Clerk (RBAC: USER/ADMIN/OPS/COACH)
- **Payments**: Razorpay (one-time + subscriptions)
- **Blog**: Ghost CMS (self-hosted)
- **Email**: Listmonk (self-hosted)
- **WhatsApp**: whatsapp-web.js (opt-in only)
- **Analytics**: PostHog

## Monorepo Structure

```
/apps
  /web                  # Next.js app
/apps-infra
  /ghost                # Ghost CMS docker config
  /listmonk             # Listmonk docker config
/services
  /wa-bot               # WhatsApp bot service
/packages
  /ui                   # Shared UI components (@ru/ui)
  /db                   # Prisma schema + client (@ru/db)
  /config               # Env validation + constants (@ru/config)
  /ghost-client         # Ghost API client (@ru/ghost-client)
  /listmonk-client      # Listmonk API client
  /notifications        # Email/WhatsApp providers
/tooling
  /scripts              # Seed scripts
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Razorpay account (test mode for dev)
- Clerk account

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Docker Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Ghost CMS (port 2368)
- Listmonk (port 9000)

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://ru_admin:ru_secret_password@localhost:5432/ru_yoga"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Ghost
GHOST_URL=http://localhost:2368
GHOST_CONTENT_API_KEY=xxx  # Get from Ghost Admin > Integrations

# Listmonk
LISTMONK_URL=http://localhost:9000
LISTMONK_API_USER=admin
LISTMONK_API_PASSWORD=admin_password_change_me

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed initial data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## Ghost CMS Setup

1. Access Ghost admin: http://localhost:2368/ghost
2. Complete the setup wizard
3. Go to Settings > Integrations > Add custom integration
4. Copy the Content API Key to `GHOST_CONTENT_API_KEY`

## Listmonk Setup

1. Access Listmonk: http://localhost:9000
2. Login with admin/admin_password_change_me
3. Create a public list named "Newsletter"
4. Configure SMTP settings for sending emails

## Razorpay Setup

### Test Mode

1. Get test credentials from Razorpay Dashboard
2. Create a subscription plan for Pranayama:
   - Go to Dashboard > Subscriptions > Plans
   - Create a plan (999/month)
   - Copy the plan ID to the database `plans.razorpayPlanId`

### Webhook Setup

1. Go to Dashboard > Settings > Webhooks
2. Add webhook URL: `https://your-domain.com/api/razorpay/webhook`
3. Select events:
   - payment.captured
   - subscription.activated
   - subscription.charged
   - subscription.cancelled
   - payment.failed
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

### Testing Webhooks Locally

Use ngrok or similar:

```bash
ngrok http 3000
```

Then update Razorpay webhook URL with the ngrok URL.

## WhatsApp Bot Setup

### Important Notes

- This bot uses whatsapp-web.js (unofficial client)
- **ONLY for opt-in messaging** - users must have `whatsappOptIn=true`
- Rate limited to prevent abuse
- Provide QR code for operator to link WhatsApp

### Running the Bot

```bash
pnpm dev:wa-bot
```

1. A QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code
5. The bot will start processing queued messages

### Opt-in Policy

Users must explicitly opt-in to receive WhatsApp messages:
- UI must have clear checkbox: "I agree to receive WhatsApp updates"
- Store consent in `users.whatsappOptIn`
- Never send messages to users who haven't opted in

## User Roles

| Role  | Access |
|-------|--------|
| USER  | Member portal only |
| COACH | View batches, sessions |
| OPS   | Manage bookings, sessions |
| ADMIN | Full admin access |

## Key Routes

### Marketing
- `/` - Landing page
- `/face-yoga` - Face Yoga plans
- `/pranayama` - Pranayama batches
- `/blog` - Blog listing
- `/blog/[slug]` - Blog post

### Member
- `/app` - Dashboard
- `/app/schedule` - Sessions
- `/app/book` - Book slots
- `/app/billing` - Payments

### Admin
- `/admin` - Dashboard
- `/admin/users` - Manage users
- `/admin/webhooks` - Webhook logs
- `/admin/messages` - Templates

## Scripts

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to DB
pnpm db:seed      # Seed database
pnpm dev:wa-bot   # Start WhatsApp bot
```

## Deployment

1. Build the app: `pnpm build`
2. Deploy `apps/web` to Vercel/Railway/etc
3. Set environment variables
4. Deploy Ghost + Listmonk via Docker
5. Configure Razorpay production webhooks
6. Run database migrations: `pnpm db:push`

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design, data flows, database schema
- [Contributing](docs/CONTRIBUTING.md) - Development setup, code conventions, testing
- [API Docs](http://localhost:3000/api/docs/ui) - Interactive Swagger UI (run dev server first)

## License

Private - All rights reserved.
