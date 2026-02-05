import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  const dbUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL

  // Debug: log URL details (no password)
  console.log("[prisma] NODE_ENV:", process.env.NODE_ENV)
  console.log("[prisma] VERCEL_ENV:", process.env.VERCEL_ENV)
  if (dbUrl) {
    try {
      const url = new URL(dbUrl)
      console.log("[prisma] DATABASE_URL ->", url.username + "@" + url.host + url.pathname + url.search)
    } catch {
      console.log("[prisma] DATABASE_URL -> (invalid URL, length:", dbUrl.length, ")")
    }
  } else {
    console.log("[prisma] DATABASE_URL -> MISSING / undefined")
  }
  if (directUrl) {
    try {
      const url = new URL(directUrl)
      console.log("[prisma] DIRECT_URL ->", url.username + "@" + url.host + url.pathname + url.search)
    } catch {
      console.log("[prisma] DIRECT_URL -> (invalid URL, length:", directUrl.length, ")")
    }
  } else {
    console.log("[prisma] DIRECT_URL -> MISSING / undefined")
  }

  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl: dbUrl,
  })
}

export const prisma = globalForPrisma.prisma
