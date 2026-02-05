import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  const dbUrl = process.env.DATABASE_URL
  // Log the host (not credentials) for debugging
  try {
    const url = new URL(dbUrl ?? "")
    console.log("[prisma] Connecting to:", url.host)
  } catch {
    console.log("[prisma] DATABASE_URL parse error or missing")
  }
  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl: dbUrl,
  })
}

export const prisma = globalForPrisma.prisma
