import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  // Prefer PRISMA_DATABASE_URL (custom, not managed by integrations)
  // Fall back to DATABASE_URL (may be set by Supabase-Vercel integration)
  const dbUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

  // Debug: log which URL source is being used (no password)
  const source = process.env.PRISMA_DATABASE_URL ? "PRISMA_DATABASE_URL" : "DATABASE_URL"
  if (dbUrl) {
    try {
      const url = new URL(dbUrl)
      console.log(`[prisma] Using ${source} ->`, url.username + "@" + url.host + url.pathname + url.search)
    } catch {
      console.log(`[prisma] Using ${source} -> (invalid URL, length: ${dbUrl.length})`)
    }
  } else {
    console.log("[prisma] WARNING: No database URL found (checked PRISMA_DATABASE_URL and DATABASE_URL)")
  }

  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl: dbUrl,
  })
}

export const prisma = globalForPrisma.prisma
