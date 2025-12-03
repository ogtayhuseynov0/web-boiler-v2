# Full-Stack Boilerplate

A modern full-stack boilerplate with Next.js 15, NestJS 11, Supabase, Tailwind CSS 4, shadcn/ui, and Turborepo.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: NestJS 11, BullMQ (job queue), Redis
- **Database**: Supabase (PostgreSQL) with RLS
- **Authentication**: Supabase Auth (Email OTP)
- **Monorepo**: pnpm + Turborepo
- **State Management**: Zustand
- **UI Components**: shadcn/ui
- **Deployment**: PM2

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd boilerplate
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. Start Supabase locally:
   ```bash
   supabase start
   ```

5. Run database migrations:
   ```bash
   supabase db push
   ```

6. Start Redis (for job queue):
   ```bash
   redis-server
   ```

7. Run the development server:
   ```bash
   pnpm dev
   ```

8. Open [http://localhost:3000](http://localhost:3000) for the frontend and [http://localhost:4000/docs](http://localhost:4000/docs) for the API docs.

## Project Structure

```
boilerplate/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # NestJS 11 backend
├── packages/
│   └── shared/       # Shared TypeScript types
├── supabase/
│   └── migrations/   # Database migrations
└── deploy/           # Deployment scripts
```

## Commands

```bash
pnpm dev        # Run both apps in development
pnpm build      # Build both apps
pnpm dev:web    # Run frontend only
pnpm dev:api    # Run backend only
```

## License

MIT
