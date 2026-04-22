# Contributing

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose
- Clerk account (free tier)
- Razorpay account (test mode)

### Getting Started

```bash
# Clone the repo
git clone <repo-url> && cd ru

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Ghost, Listmonk)
docker compose up -d

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Start development
pnpm dev
```

## Code Conventions

### TypeScript

- **Strict mode enabled** (`strict: true` in tsconfig.base.json)
- Use explicit types for function parameters and return values
- Prefer `interface` over `type` for object shapes
- Use `as const` for literal constants

### File Organization

- Components: `src/components/<feature>/`
- API routes: `app/api/<resource>/route.ts`
- Hooks: `src/hooks/use-<name>.ts`
- Utilities: `src/lib/<name>.ts`

### Naming

- Files: `kebab-case.ts` or `kebab-case.tsx`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database fields: `camelCase` (Prisma convention)
- URL paths: `kebab-case`

### API Routes

- All inputs validated with Zod schemas (defined in `packages/config/src/schemas.ts`)
- Use `validateRequest()` helper for consistent error responses
- Protect routes with `getCurrentUser()` and role checks
- Log with `createLogger("api:<route-name>")`

### Styling

- Tailwind CSS v4 with design tokens in `packages/ui/src/globals.css`
- Design system colors: gold (#C4883A), indigo (#2E5DA8), ivory (#F0E8D8), vermillion (#E83A2D)
- Typography: Cormorant Garamond (display) + DM Sans (body)
- Dark-only theme on pure black (#000000) background
- Use `void-card` class for card surfaces with craquelure borders

## Package Development

### Adding a New Package

1. Create directory under `packages/<name>/`
2. Add `package.json` with `"name": "@ru/<name>"`
3. Add `tsconfig.json` extending `../../tsconfig.base.json`
4. Add to `apps/web/next.config.ts` `transpilePackages`
5. Add path alias in `apps/web/tsconfig.json`

### Database Changes

```bash
# Edit the schema
# packages/db/prisma/schema.prisma

# Generate client types
pnpm db:generate

# Push to dev database (no migration file)
pnpm db:push

# For production: create migration
pnpm --dir packages/db exec prisma migrate dev --name <description>
```

## Testing

```bash
# Run tests
pnpm test

# Type check
pnpm tsc --noEmit -p apps/web/tsconfig.json

# Lint
pnpm lint
```

## API Documentation

- OpenAPI spec: `GET /api/docs` (JSON)
- Swagger UI: `GET /api/docs/ui` (interactive)

## Deployment Checklist

1. Ensure all env vars are set in production
2. Run database migrations
3. Verify Razorpay webhook URL and events
4. Configure Clerk production instance
5. Set up Sentry DSN for error monitoring
6. Verify CORS_ALLOWED_ORIGINS
7. Test health endpoints: `/api/health`, `/api/health/db`, `/api/health/services`
