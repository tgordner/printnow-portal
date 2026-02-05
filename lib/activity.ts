import type { Prisma, PrismaClient } from "@prisma/client"

export function logActivity(
  prisma: PrismaClient,
  params: {
    boardId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  // Fire-and-forget — never blocks or fails the calling mutation
  prisma.activity
    .create({
      data: {
        boardId: params.boardId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch(() => {})
}
