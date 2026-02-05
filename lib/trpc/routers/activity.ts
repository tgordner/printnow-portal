import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const activityRouter = router({
  listByBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        limit: z.number().int().min(1).max(50).optional().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.activity.findMany({
        where: { boardId: input.boardId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const next = items.pop()
        nextCursor = next?.id
      }

      return { items, nextCursor }
    }),
})
