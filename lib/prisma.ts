import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  const dbUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL
  // Debug: log URL details (no password)
  try {
    const url = new URL(dbUrl ?? "")
    console.log("[prisma] DATABASE_URL ->", url.username + "@" + url.host + url.pathname + url.search)
  } catch {
    console.log("[prisma] DATABASE_URL is:", dbUrl ? `set (${dbUrl.length} chars)` : "MISSING")
  }
  try {
    const url = new URL(directUrl ?? "")
    console.log("[prisma] DIRECT_URL ->", url.username + "@" + url.host + url.pathname + url.search)
  } catch {
    console.log("[prisma] DIRECT_URL is:", directUrl ? `set (${directUrl.length} chars)` : "MISSING")
  }
  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl: dbUrl,
  })
}

export const prisma = globalForPrisma.prisma
