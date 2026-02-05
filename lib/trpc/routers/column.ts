import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const columnRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        name: z.string().min(1).max(50),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lastColumn = await ctx.prisma.column.findFirst({
        where: { boardId: input.boardId },
        orderBy: { position: "desc" },
      })

      return ctx.prisma.column.create({
        data: {
          boardId: input.boardId,
          name: input.name,
          color: input.color,
          position: lastColumn ? lastColumn.position + 1 : 0,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.column.update({
        where: { id },
        data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.column.delete({
        where: { id: input.id },
      })
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        columnIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.columnIds.map((id, index) =>
        ctx.prisma.column.update({
          where: { id },
          data: { position: index },
        })
      )
      await ctx.prisma.$transaction(updates)
    }),
})
