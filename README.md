# PrintNow Internal Tools Portal

A modern, real-time Kanban board and internal tools platform built with Next.js 15, Supabase, and TypeScript.

![License](https://img.shields.io/badge/license-private-red)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## Features

- 🎯 **Kanban Boards** - Drag-and-drop project management
- ⚡ **Real-time Updates** - See changes instantly across all users
- 🔐 **Authentication** - Secure login with Supabase Auth
- 👥 **Team Collaboration** - Assign tasks, add comments
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean design with shadcn/ui components

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **ORM:** Prisma
- **API:** tRPC
- **Drag & Drop:** @hello-pangea/dnd
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account (free tier works)
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/printnow-portal.git
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
   Then edit `.env.local` with your Supabase credentials.

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
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string |

## Project Structure

```
├── app/                    # Next.js pages and routes
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main application
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── board/            # Kanban board components
│   └── layout/           # Layout components
├── lib/                   # Utilities and configurations
├── hooks/                 # Custom React hooks
├── prisma/               # Database schema
└── types/                # TypeScript types
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma studio` | Open Prisma database GUI |
| `pnpm prisma db push` | Push schema changes to database |

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or deploy via CLI
vercel --prod
```

## Contributing

This is a private internal project. Contact the development team for contribution guidelines.

## License

Private - PrintNow © 2025
