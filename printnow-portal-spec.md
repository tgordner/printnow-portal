# PrintNow Internal Tools Portal - Project Specification

## Project Overview

Build an internal tools portal for PrintNow, starting with a Kanban-style project management system. This portal will eventually house multiple internal applications for employees and customer-facing project boards.

**Primary Use Cases:**
1. Internal team project management (replacing Asana)
2. Customer project tracking boards (customers can view their project status)
3. Foundation for future internal tools

**Key Requirements:**
- Modern, clean UI
- Real-time updates (when someone moves a card, others see it instantly)
- Multi-board support (internal boards + customer-specific boards)
- Simple authentication (team members + customer access)
- Mobile-friendly

---

## Tech Stack (Locked In)

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 15 (App Router) | Latest stable, using App Router |
| **Language** | TypeScript | Strict mode enabled |
| **Styling** | Tailwind CSS 4 | Utility-first |
| **UI Components** | shadcn/ui | Copy components into project |
| **Drag & Drop** | @hello-pangea/dnd | Fallback from pragmatic-drag-and-drop for simplicity |
| **Database** | Supabase (PostgreSQL) | Hosted, includes auth |
| **Auth** | Supabase Auth | Built-in, supports RLS |
| **ORM** | Prisma | Type-safe database access |
| **Realtime** | Supabase Realtime | For live board updates |
| **Hosting** | Vercel | Free tier, automatic deploys |
| **Package Manager** | pnpm | Faster than npm |

---

## Database Schema

### Core Tables

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// USERS & ORGANIZATIONS
// ============================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique  // for URLs: /org/printnow
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   OrganizationMember[]
  boards    Board[]
  customers Customer[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           MemberRole   @default(MEMBER)
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?
  supabaseId    String   @unique  // links to Supabase Auth
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships   OrganizationMember[]
  assignedCards Card[]               @relation("CardAssignees")
  createdCards  Card[]               @relation("CardCreator")
  comments      Comment[]
}

// ============================================
// CUSTOMERS (for customer-facing boards)
// ============================================

model Customer {
  id             String       @id @default(cuid())
  organizationId String
  name           String
  email          String
  accessCode     String       @unique  // simple access for customers
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  boards         Board[]      @relation("CustomerBoards")
}

// ============================================
// BOARDS, COLUMNS, CARDS
// ============================================

model Board {
  id             String       @id @default(cuid())
  organizationId String
  customerId     String?      // null = internal board, set = customer board
  name           String
  description    String?
  isArchived     Boolean      @default(false)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer?    @relation("CustomerBoards", fields: [customerId], references: [id], onDelete: SetNull)
  columns        Column[]
}

model Column {
  id        String   @id @default(cuid())
  boardId   String
  name      String
  position  Int      // for ordering columns
  color     String?  // hex color for visual distinction
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards     Card[]
}

model Card {
  id          String    @id @default(cuid())
  columnId    String
  creatorId   String
  title       String
  description String?
  position    Int       // for ordering within column
  dueDate     DateTime?
  priority    Priority  @default(NONE)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  column      Column    @relation(fields: [columnId], references: [id], onDelete: Cascade)
  creator     User      @relation("CardCreator", fields: [creatorId], references: [id])
  assignees   User[]    @relation("CardAssignees")
  comments    Comment[]
  labels      Label[]   @relation("CardLabels")
  attachments Attachment[]
}

enum Priority {
  NONE
  LOW
  MEDIUM
  HIGH
  URGENT
}

// ============================================
// SUPPORTING ENTITIES
// ============================================

model Label {
  id        String   @id @default(cuid())
  boardId   String
  name      String
  color     String   // hex color
  createdAt DateTime @default(now())

  cards     Card[]   @relation("CardLabels")
}

model Comment {
  id        String   @id @default(cuid())
  cardId    String
  userId    String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}

model Attachment {
  id        String   @id @default(cuid())
  cardId    String
  name      String
  url       String   // Supabase Storage URL
  size      Int      // bytes
  mimeType  String
  createdAt DateTime @default(now())

  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
}

// ============================================
// ACTIVITY LOG (for audit trail)
// ============================================

model Activity {
  id           String   @id @default(cuid())
  boardId      String
  userId       String?
  action       String   // "card.created", "card.moved", "comment.added", etc.
  entityType   String   // "card", "column", "board"
  entityId     String
  metadata     Json?    // additional context
  createdAt    DateTime @default(now())
}
```

### Supabase Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Board" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Column" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Example: Users can only see boards in their organization
CREATE POLICY "Users can view org boards" ON "Board"
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM "OrganizationMember"
      WHERE user_id = auth.uid()
    )
  );

-- Example: Customers can only see their assigned boards
CREATE POLICY "Customers can view their boards" ON "Board"
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM "Customer"
      WHERE access_code = current_setting('app.customer_access_code', true)
    )
  );
```

---

## Application Structure

```
printnow-portal/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header layout
│   │   ├── page.tsx                # Dashboard home / board list
│   │   │
│   │   ├── boards/
│   │   │   ├── page.tsx            # All boards list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create new board
│   │   │   └── [boardId]/
│   │   │       ├── page.tsx        # Kanban board view
│   │   │       └── settings/
│   │   │           └── page.tsx    # Board settings
│   │   │
│   │   ├── customers/
│   │   │   ├── page.tsx            # Customer list
│   │   │   └── [customerId]/
│   │   │       └── page.tsx        # Customer details + boards
│   │   │
│   │   └── settings/
│   │       ├── page.tsx            # Organization settings
│   │       ├── members/
│   │       │   └── page.tsx        # Team members
│   │       └── profile/
│   │           └── page.tsx        # User profile
│   │
│   ├── customer/                   # Customer portal (separate layout)
│   │   ├── layout.tsx
│   │   ├── [accessCode]/
│   │   │   └── page.tsx            # Customer's board view
│   │   └── page.tsx                # Access code entry
│   │
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts        # tRPC API handler
│   │
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Landing / redirect
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── avatar.tsx
│   │   └── ... (other shadcn components)
│   │
│   ├── board/
│   │   ├── board-view.tsx          # Main Kanban board
│   │   ├── column.tsx              # Single column
│   │   ├── card.tsx                # Card component
│   │   ├── card-modal.tsx          # Card detail modal
│   │   ├── add-card-form.tsx
│   │   ├── add-column-form.tsx
│   │   └── board-header.tsx
│   │
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── nav-item.tsx
│   │   └── user-menu.tsx
│   │
│   └── shared/
│       ├── loading.tsx
│       ├── empty-state.tsx
│       └── error-boundary.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── middleware.ts           # Auth middleware
│   │
│   ├── trpc/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── routers/
│   │       ├── index.ts
│   │       ├── board.ts
│   │       ├── card.ts
│   │       ├── column.ts
│   │       └── user.ts
│   │
│   ├── prisma.ts                   # Prisma client instance
│   ├── utils.ts                    # Utility functions (cn, etc.)
│   └── constants.ts
│
├── hooks/
│   ├── use-board.ts                # Board data + realtime
│   ├── use-user.ts
│   └── use-realtime.ts             # Supabase realtime subscription
│
├── types/
│   └── index.ts                    # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # Seed data for dev
│
├── public/
│   └── ...
│
├── .env.local                      # Environment variables
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Key Features - MVP

### 1. Authentication
- [x] Email/password signup & login (Supabase Auth)
- [x] Magic link login option
- [x] Protected routes (middleware)
- [x] User profile (name, avatar)

### 2. Organization
- [x] Single organization per deployment (simple mode)
- [x] Invite team members by email
- [x] Member roles (Owner, Admin, Member)

### 3. Boards
- [x] Create new board
- [x] Board list view (grid of boards)
- [x] Archive/delete board
- [x] Board-level settings (name, description)

### 4. Kanban Board
- [x] Columns with drag-and-drop reordering
- [x] Cards with drag-and-drop (within and between columns)
- [x] Add/edit/delete columns
- [x] Column color coding
- [x] Real-time sync across users

### 5. Cards
- [x] Card title (required)
- [x] Card description (markdown support)
- [x] Due date
- [x] Priority (None, Low, Medium, High, Urgent)
- [x] Assignees (multiple users)
- [x] Labels (colored tags)
- [x] Comments
- [x] Card modal for full details

### 6. Customer Portal (Phase 2 - after MVP)
- [ ] Customer access via unique code
- [ ] Read-only board view for customers
- [ ] Customer can add comments

---

## UI/UX Guidelines

### Design Principles
1. **Clean and minimal** - No clutter, focus on content
2. **Fast interactions** - Optimistic updates, smooth animations
3. **Responsive** - Works on desktop, tablet, mobile
4. **Accessible** - Keyboard navigation, screen reader support

### Color Palette (Tailwind)
```typescript
// Use shadcn/ui default theme with these accent colors
const colors = {
  // Priority colors
  priority: {
    none: 'slate-400',
    low: 'blue-500',
    medium: 'yellow-500',
    high: 'orange-500',
    urgent: 'red-500',
  },
  // Column default colors
  columns: [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f43f5e', // rose
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
  ]
}
```

### Component Behavior

**Drag and Drop:**
- Smooth 200ms animation on drop
- Visual indicator (blue border) for drop zones
- Ghost/preview of dragged item
- Scroll container when dragging near edges

**Cards:**
- Hover: subtle shadow elevation
- Click: opens card modal
- Show: title, labels (chips), due date (if set), assignee avatars

**Modals:**
- Keyboard: Escape to close
- Click outside to close
- Slide-in animation from right

---

## API Structure (tRPC)

### Board Router
```typescript
// lib/trpc/routers/board.ts
export const boardRouter = router({
  // Queries
  list: protectedProcedure.query(/* list all boards for org */),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(/* get single board with columns and cards */),
  
  // Mutations
  create: protectedProcedure.input(createBoardSchema).mutation(/* create board */),
  update: protectedProcedure.input(updateBoardSchema).mutation(/* update board */),
  archive: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* archive board */),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* delete board */),
});
```

### Column Router
```typescript
// lib/trpc/routers/column.ts
export const columnRouter = router({
  create: protectedProcedure.input(createColumnSchema).mutation(/* add column */),
  update: protectedProcedure.input(updateColumnSchema).mutation(/* update column */),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* delete column */),
  reorder: protectedProcedure.input(reorderColumnsSchema).mutation(/* reorder columns */),
});
```

### Card Router
```typescript
// lib/trpc/routers/card.ts
export const cardRouter = router({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(/* get card details */),
  create: protectedProcedure.input(createCardSchema).mutation(/* create card */),
  update: protectedProcedure.input(updateCardSchema).mutation(/* update card */),
  move: protectedProcedure.input(moveCardSchema).mutation(/* move card to column/position */),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* delete card */),
  
  // Assignees
  addAssignee: protectedProcedure.input(assigneeSchema).mutation(/* add assignee */),
  removeAssignee: protectedProcedure.input(assigneeSchema).mutation(/* remove assignee */),
  
  // Comments
  addComment: protectedProcedure.input(commentSchema).mutation(/* add comment */),
});
```

---

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-side only

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or production URL
```

---

## Realtime Implementation

```typescript
// hooks/use-realtime.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBoardRealtime(boardId: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Card',
          filter: `column.board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log('Card change:', payload)
          onUpdate() // Trigger refetch
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Column',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log('Column change:', payload)
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, onUpdate])
}
```

---

## Setup Instructions (for Claude Code)

### Initial Setup

```bash
# 1. Create Next.js project
pnpm create next-app@latest printnow-portal --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

cd printnow-portal

# 2. Install dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @prisma/client
pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next
pnpm add @tanstack/react-query
pnpm add @hello-pangea/dnd
pnpm add zod
pnpm add date-fns
pnpm add lucide-react
pnpm add clsx tailwind-merge

pnpm add -D prisma

# 3. Initialize Prisma
pnpm prisma init

# 4. Add shadcn/ui
pnpm dlx shadcn@latest init

# 5. Add shadcn components
pnpm dlx shadcn@latest add button card dialog dropdown-menu input label avatar badge textarea select separator sheet tabs tooltip
```

### Supabase Setup

1. Create project at supabase.com
2. Get API keys from Settings > API
3. Enable Email auth in Authentication > Providers
4. Copy connection string from Settings > Database

### Deploy to Vercel

```bash
# Connect to Vercel
pnpm i -g vercel
vercel

# Set environment variables in Vercel dashboard
# Deploy
vercel --prod
```

---

## Development Workflow

1. **Start dev server:** `pnpm dev`
2. **Database changes:** Edit `schema.prisma`, run `pnpm prisma db push`
3. **Generate Prisma client:** `pnpm prisma generate`
4. **View database:** `pnpm prisma studio`

---

## Success Criteria

The MVP is complete when:

1. ✅ User can sign up and log in
2. ✅ User can create a new board
3. ✅ User can add columns to a board
4. ✅ User can add cards to columns
5. ✅ User can drag cards between columns
6. ✅ User can drag to reorder columns
7. ✅ User can click a card to see/edit details
8. ✅ User can set due date and priority on cards
9. ✅ User can assign team members to cards
10. ✅ Changes sync in real-time across browser tabs/users
11. ✅ App works on mobile (responsive)
12. ✅ App is deployed and accessible via URL

---

## Future Enhancements (Post-MVP)

- Customer portal with access codes
- File attachments on cards
- Card templates
- Board templates
- Activity log / audit trail
- Email notifications
- Calendar view
- Reporting / analytics
- Integration with n8n workflows
- Integration with GoHighLevel

---

## Notes for Claude Code

1. **Use the App Router** - All pages in `app/` directory, not `pages/`
2. **Server Components by default** - Only add `"use client"` when needed (interactivity, hooks)
3. **Optimistic updates** - Update UI immediately, sync with server in background
4. **Error handling** - Use error boundaries and toast notifications
5. **Loading states** - Use Suspense and skeleton loaders
6. **Type everything** - No `any` types, use Prisma-generated types
7. **Test drag-and-drop** - Make sure it works smoothly on both desktop and mobile

Start by scaffolding the basic structure, then implement authentication, then the board UI.
