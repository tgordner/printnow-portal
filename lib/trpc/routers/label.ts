import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const labelRouter = router({
  list: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.label.findMany({
        where: { boardId: input.boardId },
        orderBy: { createdAt: "asc" },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        name: z.string().min(1).max(50),
        color: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.label.create({
        data: {
          boardId: input.boardId,
          name: input.name,
          color: input.color,
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
      return ctx.prisma.label.update({
        where: { id },
        data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.label.delete({
        where: { id: input.id },
      })
    }),

  addToCard: protectedProcedure
    .input(
      z.object({
        labelId: z.string(),
        cardId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          labels: {
            connect: { id: input.labelId },
          },
        },
      })
    }),

  removeFromCard: protectedProcedure
    .input(
      z.object({
        labelId: z.string(),
        cardId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          labels: {
            disconnect: { id: input.labelId },
          },
        },
      })
    }),
})
