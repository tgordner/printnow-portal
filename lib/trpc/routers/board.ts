import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const boardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.dbUser.id },
      select: { organizationId: true },
    })

    const orgIds = memberships.map((m) => m.organizationId)

    return ctx.prisma.board.findMany({
      where: {
        organizationId: { in: orgIds },
        isArchived: false,
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.board.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          columns: {
            orderBy: { position: "asc" },
            include: {
              cards: {
                orderBy: { position: "asc" },
                include: {
                  assignees: {
                    select: { id: true, name: true, avatarUrl: true },
                  },
                  labels: true,
                  _count: {
                    select: { comments: true },
                  },
                },
              },
            },
          },
        },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the user's first organization
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.dbUser.id },
        select: { organizationId: true },
      })

      if (!membership) {
        throw new Error("User has no organization")
      }

      return ctx.prisma.board.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: membership.organizationId,
          columns: {
            create: [
              { name: "To Do", position: 0, color: "#6366f1" },
              { name: "In Progress", position: 1, color: "#f97316" },
              { name: "Done", position: 2, color: "#22c55e" },
            ],
          },
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.board.update({
        where: { id },
        data,
      })
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.update({
        where: { id: input.id },
        data: { isArchived: true },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.delete({
        where: { id: input.id },
      })
    }),
})
