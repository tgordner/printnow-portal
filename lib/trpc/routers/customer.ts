import { z } from "zod/v4"

import { protectedProcedure, publicProcedure, router } from "@/lib/trpc/server"

function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const customerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.dbUser.id },
      select: { organizationId: true },
    })

    if (!membership) return []

    return ctx.prisma.customer.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        boards: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.dbUser.id },
        select: { organizationId: true },
      })

      if (!membership) throw new Error("User has no organization")

      return ctx.prisma.customer.create({
        data: {
          organizationId: membership.organizationId,
          name: input.name,
          email: input.email,
          accessCode: generateAccessCode(),
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.customer.update({
        where: { id },
        data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customer.delete({
        where: { id: input.id },
      })
    }),

  assignBoard: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        boardId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.update({
        where: { id: input.boardId },
        data: { customerId: input.customerId },
      })
    }),

  unassignBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.board.update({
        where: { id: input.boardId },
        data: { customerId: null },
      })
    }),

  // Public: look up customer by access code (no auth required)
  getByAccessCode: publicProcedure
    .input(z.object({ accessCode: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { accessCode: input.accessCode.toUpperCase() },
        include: {
          boards: {
            where: { isArchived: false },
            include: {
              columns: {
                orderBy: { position: "asc" },
                include: {
                  cards: {
                    orderBy: { position: "asc" },
                    include: {
                      labels: true,
                      _count: { select: { comments: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!customer) return null

      return {
        name: customer.name,
        boards: customer.boards,
      }
    }),
})
