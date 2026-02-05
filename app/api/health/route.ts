import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const boardCount = await prisma.board.count()
    const orgCount = await prisma.organization.count()

    return NextResponse.json({
      status: "ok",
      database: "connected",
      counts: { users: userCount, boards: boardCount, organizations: orgCount },
      env: {
        PRISMA_DATABASE_URL_set: !!process.env.PRISMA_DATABASE_URL,
        DATABASE_URL_set: !!process.env.DATABASE_URL,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    )
  }
}
