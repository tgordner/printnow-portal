import { z } from "zod/v4"

import { logActivity } from "@/lib/activity"
import { deleteStorageFiles } from "@/lib/storage"
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

      const card = await ctx.prisma.card.create({
        data: {
          columnId: input.columnId,
          creatorId: ctx.dbUser.id,
          title: input.title,
          description: input.description,
          position: lastCard ? lastCard.position + 1 : 0,
        },
      })

      const column = await ctx.prisma.column.findUnique({
        where: { id: input.columnId },
        select: { boardId: true },
      })
      if (column) {
        logActivity(ctx.prisma, {
          boardId: column.boardId,
          userId: ctx.dbUser.id,
          action: "CARD_CREATED",
          entityType: "Card",
          entityId: card.id,
          metadata: { title: input.title },
        })
      }

      return card
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
      const card = await ctx.prisma.card.update({
        where: { id },
        data,
        include: { column: { select: { boardId: true } } },
      })

      const changedFields = Object.keys(data).filter((k) => k !== "id")
      logActivity(ctx.prisma, {
        boardId: card.column.boardId,
        userId: ctx.dbUser.id,
        action: "CARD_UPDATED",
        entityType: "Card",
        entityId: card.id,
        metadata: { fields: changedFields },
      })

      return card
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
      const oldCard = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        select: { columnId: true, column: { select: { boardId: true } } },
      })

      const card = await ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          columnId: input.columnId,
          position: input.position,
        },
      })

      if (oldCard && oldCard.columnId !== input.columnId) {
        logActivity(ctx.prisma, {
          boardId: oldCard.column.boardId,
          userId: ctx.dbUser.id,
          action: "CARD_MOVED",
          entityType: "Card",
          entityId: card.id,
          metadata: {
            fromColumnId: oldCard.columnId,
            toColumnId: input.columnId,
          },
        })
      }

      return card
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Clean up storage files before cascade delete removes the records
      const attachments = await ctx.prisma.attachment.findMany({
        where: { cardId: input.id },
        select: { storagePath: true },
      })
      deleteStorageFiles(attachments.map((a) => a.storagePath))

      const card = await ctx.prisma.card.delete({
        where: { id: input.id },
        include: { column: { select: { boardId: true } } },
      })

      logActivity(ctx.prisma, {
        boardId: card.column.boardId,
        userId: ctx.dbUser.id,
        action: "CARD_DELETED",
        entityType: "Card",
        entityId: input.id,
        metadata: { title: card.title },
      })

      return card
    }),

  addAssignee: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          assignees: {
            connect: { id: input.userId },
          },
        },
        include: { column: { select: { boardId: true } } },
      })

      logActivity(ctx.prisma, {
        boardId: card.column.boardId,
        userId: ctx.dbUser.id,
        action: "ASSIGNEE_ADDED",
        entityType: "Card",
        entityId: input.cardId,
        metadata: { assigneeId: input.userId },
      })

      return card
    }),

  removeAssignee: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          assignees: {
            disconnect: { id: input.userId },
          },
        },
        include: { column: { select: { boardId: true } } },
      })

      logActivity(ctx.prisma, {
        boardId: card.column.boardId,
        userId: ctx.dbUser.id,
        action: "ASSIGNEE_REMOVED",
        entityType: "Card",
        entityId: input.cardId,
        metadata: { assigneeId: input.userId },
      })

      return card
    }),

  search: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        query: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const cards = await ctx.prisma.card.findMany({
        where: {
          column: { boardId: input.boardId },
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } },
            {
              comments: {
                some: {
                  content: { contains: input.query, mode: "insensitive" },
                },
              },
            },
          ],
        },
        select: { id: true },
      })
      return cards.map((c) => c.id)
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.comment.create({
        data: {
          cardId: input.cardId,
          userId: ctx.dbUser.id,
          content: input.content,
        },
        include: { user: true },
      })

      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        select: { column: { select: { boardId: true } } },
      })
      if (card) {
        logActivity(ctx.prisma, {
          boardId: card.column.boardId,
          userId: ctx.dbUser.id,
          action: "COMMENT_ADDED",
          entityType: "Comment",
          entityId: comment.id,
          metadata: { cardId: input.cardId },
        })
      }

      return comment
    }),
})
