import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const prismaUrl = process.env.PRISMA_DATABASE_URL
  const dbUrl = process.env.DATABASE_URL

  // Log all env var details
  const info: Record<string, unknown> = {
    PRISMA_DATABASE_URL: prismaUrl ? `set (${prismaUrl.length} chars)` : "MISSING",
    DATABASE_URL: dbUrl ? `set (${dbUrl.length} chars)` : "MISSING",
  }

  // Show hosts
  for (const [name, val] of [["PRISMA_DATABASE_URL", prismaUrl], ["DATABASE_URL", dbUrl]] as const) {
    if (val) {
      try {
        const u = new URL(val)
        info[`${name}_host`] = u.host
        info[`${name}_user`] = u.username
      } catch {
        info[`${name}_host`] = "PARSE_ERROR"
      }
    }
  }

  // Create a FRESH PrismaClient with explicit URL
  const url = prismaUrl || dbUrl
  if (!url) {
    return NextResponse.json({ status: "error", message: "No database URL", info })
  }

  try {
    const freshPrisma = new PrismaClient({
      datasources: { db: { url } },
    })
    const userCount = await freshPrisma.user.count()
    const boardCount = await freshPrisma.board.count()
    await freshPrisma.$disconnect()

    return NextResponse.json({
      status: "ok",
      counts: { users: userCount, boards: boardCount },
      info,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ status: "error", message, info }, { status: 500 })
  }
}
