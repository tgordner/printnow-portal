import { z } from "zod/v4"

import { logActivity } from "@/lib/activity"
import { deleteStorageFiles } from "@/lib/storage"
import { protectedProcedure, router } from "@/lib/trpc/server"

export const attachmentRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        name: z.string(),
        url: z.string(),
        storagePath: z.string(),
        size: z.number().int(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.prisma.attachment.create({
        data: {
          cardId: input.cardId,
          name: input.name,
          url: input.url,
          storagePath: input.storagePath,
          size: input.size,
          mimeType: input.mimeType,
        },
      })

      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        select: { column: { select: { boardId: true } } },
      })
      if (card) {
        logActivity(ctx.prisma, {
          boardId: card.column.boardId,
          userId: ctx.dbUser.id,
          action: "ATTACHMENT_ADDED",
          entityType: "Attachment",
          entityId: attachment.id,
          metadata: { name: input.name, cardId: input.cardId },
        })
      }

      return attachment
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.prisma.attachment.delete({
        where: { id: input.id },
        include: { card: { select: { column: { select: { boardId: true } } } } },
      })

      deleteStorageFiles([attachment.storagePath])

      logActivity(ctx.prisma, {
        boardId: attachment.card.column.boardId,
        userId: ctx.dbUser.id,
        action: "ATTACHMENT_REMOVED",
        entityType: "Attachment",
        entityId: input.id,
        metadata: { name: attachment.name, cardId: attachment.cardId },
      })

      return attachment
    }),
})
