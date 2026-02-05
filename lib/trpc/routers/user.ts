import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.dbUser
  }),

  listByBoard: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.prisma.board.findUniqueOrThrow({
        where: { id: input.boardId },
        select: { organizationId: true },
      })

      const members = await ctx.prisma.organizationMember.findMany({
        where: { organizationId: board.organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      })

      return members.map((m) => m.user)
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.dbUser.id },
        data: input,
      })
    }),

})
