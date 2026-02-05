import { z } from "zod/v4"

import { logActivity } from "@/lib/activity"
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

      // Fire-and-forget: delete from Supabase Storage
      // Done server-side via service role for reliability
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      supabase.storage
        .from("attachments")
        .remove([attachment.storagePath])
        .catch(() => {})

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
