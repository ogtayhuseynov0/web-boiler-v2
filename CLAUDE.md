# Full-Stack Boilerplate

## Overview
A modern full-stack boilerplate with Next.js 15, NestJS 11, Supabase, Tailwind CSS, shadcn/ui, and Turborepo. Ready to build your next project.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: NestJS 11, BullMQ (job queue), Redis
- **Database**: Supabase (PostgreSQL) with RLS
- **Authentication**: Supabase Auth (Email OTP)
- **Monorepo**: pnpm + Turborepo
- **State Management**: Zustand
- **UI Components**: shadcn/ui

## Project Structure

```
boilerplate/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, signup
│   │   │   ├── (dashboard)/    # Protected routes
│   │   │   │   ├── dashboard/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   └── dashboard/      # Dashboard components
│   │   └── lib/
│   │       ├── supabase/       # Supabase client
│   │       └── api-client.ts   # API client
│   │
│   └── api/                    # NestJS backend
│       └── src/
│           ├── auth/           # JWT auth guard
│           ├── config/         # Environment config
│           ├── health/         # Health check
│           ├── profile/        # User profile
│           ├── queue/          # BullMQ queue service
│           └── supabase/       # Supabase service
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── supabase/
│   └── migrations/             # Database migrations
│
└── deploy/                     # Deployment scripts
```

## Environment Variables

### Backend (`apps/api/.env`)
```env
PORT=4000
NODE_ENV=development

SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## API Endpoints

### Backend (NestJS - port 4000)
```
# Profile
GET    /api/profile            # Get user profile
PATCH  /api/profile            # Update profile

# Health
GET    /api/health             # Health check
```

## Database Schema

```sql
-- profiles table (linked to auth.users)
profiles (
  id, email, full_name, avatar_url, created_at, updated_at
)
```

## Development Commands

```bash
# Root level
pnpm dev              # Run both web and api
pnpm build            # Build both apps
pnpm dev:web          # Frontend only (port 3000)
pnpm dev:api          # Backend only (port 4000)

# Requires Redis running for queue
redis-server          # Start Redis locally
```

## Getting Started

1. Clone this repository
2. Copy `.env.example` files to `.env` in both apps
3. Run `pnpm install`
4. Start Supabase locally: `supabase start`
5. Run migrations: `supabase db push`
6. Start development: `pnpm dev`

## Adding New Features

### Backend Module
```bash
cd apps/api
nest g module your-module
nest g controller your-module
nest g service your-module
```

### Frontend Page
Create new page in `apps/web/app/(dashboard)/your-page/page.tsx`

### Shared Types
Add types in `packages/shared/src/types/`

## Notes
- All APIs should be in `apps/api/` (NestJS), not in Next.js
- Use RLS policies in Supabase for data security
- Queue jobs go through BullMQ + Redis
