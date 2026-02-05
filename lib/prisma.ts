import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  // Prefer PRISMA_DATABASE_URL (custom, not managed by integrations)
  // Fall back to DATABASE_URL (may be set by Supabase-Vercel integration)
  const dbUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

  console.log("[prisma] PRISMA_DATABASE_URL set:", !!process.env.PRISMA_DATABASE_URL)
  console.log("[prisma] DATABASE_URL set:", !!process.env.DATABASE_URL)
  if (dbUrl) {
    try {
      const url = new URL(dbUrl)
      console.log("[prisma] Connecting to:", url.host)
    } catch {
      console.log("[prisma] URL parse failed, length:", dbUrl.length)
    }
  } else {
    console.log("[prisma] WARNING: No database URL found!")
  }

  // Use explicit datasources override (more reliable than datasourceUrl)
  globalForPrisma.prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma
