# CLAUDE.md - Project Instructions for Claude Code

## Project Overview

This is **PrintNow Internal Tools Portal**, a Kanban-based project management system built with Next.js 15, Supabase, and modern React patterns. You are building this from scratch following the specification in `printnow-portal-spec.md`.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | Framework (App Router) |
| TypeScript | 5.x | Language |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | latest | UI Components |
| @hello-pangea/dnd | latest | Drag and drop |
| Supabase | latest | Database, Auth, Realtime |
| Prisma | latest | ORM |
| tRPC | 11.x | Type-safe API |
| pnpm | latest | Package manager |

---

## Key Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm prisma generate  # Generate Prisma client after schema changes
pnpm prisma db push   # Push schema to database (dev)
pnpm prisma migrate dev # Create migration (when ready for prod)
pnpm prisma studio    # Open database GUI

# shadcn/ui
pnpm dlx shadcn@latest add [component]  # Add new component

# Deployment
vercel                # Deploy to preview
vercel --prod         # Deploy to production
```

---

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Main app (boards, settings)
│   ├── customer/          # Customer portal
│   └── api/               # API routes (tRPC)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── board/             # Kanban board components
│   ├── layout/            # Layout components
│   └── shared/            # Shared/common components
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── trpc/              # tRPC setup and routers
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
└── prisma/
    └── schema.prisma      # Database schema
```

---

## Coding Standards

### File Naming
- Components: `PascalCase.tsx` (e.g., `BoardView.tsx`)
- Utilities/hooks: `kebab-case.ts` (e.g., `use-board.ts`)
- Pages: `page.tsx` (Next.js convention)

### Component Pattern
```tsx
// Always use this pattern for components
"use client" // Only if needed (interactivity, hooks, browser APIs)

import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends ComponentProps<"div"> {
  title: string
  // ... other props
}

export function Card({ title, className, ...props }: CardProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {title}
    </div>
  )
}
```

### Server vs Client Components
- **Default to Server Components** - no directive needed
- **Add `"use client"` only when:**
  - Using hooks (useState, useEffect, etc.)
  - Using browser APIs
  - Adding event handlers (onClick, onChange, etc.)
  - Using @hello-pangea/dnd (requires client)

### TypeScript
- **No `any` types** - use proper typing or `unknown`
- **Use Prisma-generated types** for database entities
- **Use Zod for validation** - integrates with tRPC

### Imports
```tsx
// Order: external, internal, relative, styles
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/trpc/client"

import { BoardCard } from "./board-card"
```

---

## Database Patterns

### Prisma Client
```tsx
// lib/prisma.ts - singleton pattern
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### Queries in Server Components
```tsx
// Fetch directly in server components
import { prisma } from "@/lib/prisma"

export default async function BoardsPage() {
  const boards = await prisma.board.findMany({
    where: { organizationId: "..." },
    include: { columns: true }
  })
  
  return <BoardList boards={boards} />
}
```

### Mutations via tRPC
```tsx
// Client-side mutations
"use client"

import { api } from "@/lib/trpc/client"

function CreateBoardButton() {
  const utils = api.useUtils()
  const createBoard = api.board.create.useMutation({
    onSuccess: () => {
      utils.board.list.invalidate() // Refetch list
    }
  })
  
  return (
    <Button onClick={() => createBoard.mutate({ name: "New Board" })}>
      Create Board
    </Button>
  )
}
```

---

## Supabase Patterns

### Client-Side Auth
```tsx
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server-Side Auth
```tsx
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

### Middleware Auth Check
```tsx
// middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // ... check auth, redirect if needed
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

---

## Drag and Drop (@hello-pangea/dnd)

### Basic Setup
```tsx
"use client"

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

function Board() {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result
    
    if (!destination) return
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) return
    
    if (type === "column") {
      // Reorder columns
    } else {
      // Move card
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" type="column" direction="horizontal">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {columns.map((column, index) => (
              <Column key={column.id} column={column} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
```

### Optimistic Updates
```tsx
// Update UI immediately, then sync with server
const handleDragEnd = async (result: DropResult) => {
  // 1. Optimistically update local state
  setColumns(reorderedColumns)
  
  // 2. Sync with server (don't await in the handler)
  moveCard.mutate({
    cardId: result.draggableId,
    columnId: result.destination.droppableId,
    position: result.destination.index,
  })
}
```

---

## Common Patterns

### Loading States
```tsx
// Use Suspense for server components
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function Page() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board />
    </Suspense>
  )
}
```

### Error Handling
```tsx
// Use error.tsx for route errors
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### Toast Notifications
```tsx
// Use sonner (already in shadcn)
import { toast } from "sonner"

// In mutation
onSuccess: () => {
  toast.success("Board created!")
},
onError: (error) => {
  toast.error(error.message)
}
```

---

## Build Order

Follow this order when building:

1. **Project Setup**
   - Initialize Next.js with TypeScript
   - Install all dependencies
   - Configure Tailwind and shadcn/ui
   - Set up Prisma with schema

2. **Authentication**
   - Supabase client setup
   - Middleware for protected routes
   - Login/signup pages
   - User context/hook

3. **Layout**
   - Dashboard layout with sidebar
   - Header with user menu
   - Navigation

4. **Boards List**
   - Board list page
   - Create board modal
   - Board cards (grid view)

5. **Kanban Board**
   - Board view page
   - Columns component
   - Cards component
   - Drag and drop functionality

6. **Card Details**
   - Card modal
   - Edit title/description
   - Due date picker
   - Priority selector
   - Assignees
   - Comments

7. **Realtime**
   - Supabase realtime subscriptions
   - Auto-refresh on changes

8. **Deploy**
   - Environment variables in Vercel
   - Production build
   - Domain setup

---

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server only)
- `DATABASE_URL` - PostgreSQL connection (pooled)
- `DIRECT_URL` - PostgreSQL direct connection

---

## Troubleshooting

### Prisma Issues
```bash
# Reset and regenerate
pnpm prisma generate
pnpm prisma db push --force-reset  # WARNING: destroys data
```

### Supabase Auth Not Working
- Check environment variables are set
- Ensure email provider is enabled in Supabase dashboard
- Check middleware is configured correctly

### Drag and Drop Glitchy
- Ensure parent has explicit height
- Check for StrictMode issues (may need to disable in dev)
- Verify unique draggableId and droppableId

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [@hello-pangea/dnd Docs](https://github.com/hello-pangea/dnd)
- [tRPC Docs](https://trpc.io/docs)
