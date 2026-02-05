# PrintNow Internal Tools Portal

A real-time Kanban board and internal tools platform built with Next.js 15, Supabase, and TypeScript.

![License](https://img.shields.io/badge/license-private-red)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## Features

- **Kanban Boards** — Drag-and-drop columns and cards with @hello-pangea/dnd
- **Card Details** — Title, description, due date (with overdue indicators), priority, labels, assignees, comments, and file attachments
- **Real-time Updates** — Supabase Realtime subscriptions keep all users in sync
- **File Attachments** — Upload via button, drag-and-drop, or clipboard paste (Supabase Storage)
- **Activity Log** — Board-level audit trail of all changes
- **In-Board Search** — Server-side card search across titles, descriptions, and comments
- **Team Management** — Organization members with Owner/Admin/Member roles, email invites with optional board access
- **Board-Level Access Control** — Board members with role-based visibility
- **Customer Portal** — Customers access shared boards via unique access codes, view card details, and add comments
- **Authentication** — Supabase Auth with email/password and magic link login
- **Dark Mode** — System-aware theme toggle
- **Responsive** — Mobile sidebar drawer, touch-friendly layout

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 15](https://nextjs.org) | Framework (App Router, Turbopack) |
| [TypeScript 5](https://www.typescriptlang.org) | Language |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [shadcn/ui](https://ui.shadcn.com) | UI components (new-york style) |
| [Supabase](https://supabase.com) | Database, Auth, Realtime, Storage |
| [Prisma 6](https://www.prisma.io) | ORM |
| [tRPC 11](https://trpc.io) | Type-safe API layer |
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | Drag and drop |
| [Vercel](https://vercel.com) | Hosting |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tgordner/printnow-portal.git
   cd printnow-portal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials.

4. **Set up the database**
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | PostgreSQL direct connection string |

## Project Structure

```
app/
  (auth)/                 # Login, signup
  (dashboard)/            # Boards, settings, customers
  customer/               # Customer portal (public)
  api/                    # tRPC API routes
components/
  board/                  # Kanban: board-view, column, card, card-modal,
                          #   assignee-picker, label-picker, activity-panel,
                          #   attachments-section
  customer/               # Customer card modal
  layout/                 # Header, sidebar, user-menu, theme-toggle
  shared/                 # Due-date badge, empty-state, loading
  ui/                     # shadcn/ui components
lib/
  trpc/                   # tRPC server, client, and routers
  supabase/               # Supabase client/server helpers
  prisma.ts               # Prisma client singleton
hooks/                    # Custom React hooks
prisma/
  schema.prisma           # Database schema
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma studio` | Open database GUI |
| `pnpm prisma db push` | Push schema changes to database |

## Deployment

Deployed to Vercel with auto-deploy on push to `main`.

```bash
# Or deploy manually via CLI
vercel --prod
```

## License

Private - PrintNow 2025
