import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const cardRouter = router({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.card.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          assignees: true,
          labels: true,
          comments: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
          },
          creator: true,
          attachments: true,
        },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lastCard = await ctx.prisma.card.findFirst({
        where: { columnId: input.columnId },
        orderBy: { position: "desc" },
      })

      return ctx.prisma.card.create({
        data: {
          columnId: input.columnId,
          creatorId: ctx.dbUser.id,
          title: input.title,
          description: input.description,
          position: lastCard ? lastCard.position + 1 : 0,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().nullable().optional(),
        dueDate: z.date().nullable().optional(),
        priority: z
          .enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.card.update({
        where: { id },
        data,
      })
    }),

  move: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        columnId: z.string(),
        position: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          columnId: input.columnId,
          position: input.position,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.delete({
        where: { id: input.id },
      })
    }),

  addAssignee: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          assignees: {
            connect: { id: input.userId },
          },
        },
      })
    }),

  removeAssignee: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          assignees: {
            disconnect: { id: input.userId },
          },
        },
      })
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: {
          cardId: input.cardId,
          userId: ctx.dbUser.id,
          content: input.content,
        },
        include: { user: true },
      })
    }),
})
