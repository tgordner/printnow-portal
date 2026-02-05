import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return NextResponse.json({ allowed: false }, { status: 400 })
    }

    // Check if the email belongs to an existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ allowed: true })
    }

    // Check if there's a pending invite for this email
    const invite = await prisma.invite.findFirst({
      where: { email },
      select: { id: true },
    })

    return NextResponse.json({ allowed: !!invite })
  } catch {
    return NextResponse.json({ allowed: false }, { status: 500 })
  }
}
