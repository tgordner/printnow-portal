import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  const dbUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

  globalForPrisma.prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma
