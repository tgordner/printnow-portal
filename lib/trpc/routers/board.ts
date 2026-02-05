import { TRPCError } from "@trpc/server"
import { z } from "zod/v4"

import { logActivity } from "@/lib/activity"
import { protectedProcedure, router } from "@/lib/trpc/server"

export const boardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.dbUser.id },
      select: { organizationId: true, role: true },
    })

    const orgIds = memberships.map((m) => m.organizationId)

    // OWNER/ADMIN see all boards; MEMBER only sees boards they're added to
    const isAdminOrOwner = memberships.some(
      (m) => m.role === "OWNER" || m.role === "ADMIN"
    )

    return ctx.prisma.board.findMany({
      where: {
        organizationId: { in: orgIds },
        isArchived: false,
        ...(!isAdminOrOwner && {
          members: { some: { userId: ctx.dbUser.id } },
        }),
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

  // --- Board member management ---

  listMembers: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the board's org
      const board = await ctx.prisma.board.findUniqueOrThrow({
        where: { id: input.boardId },
        select: { organizationId: true },
      })

      // Get all org members with their board membership status
      const orgMembers = await ctx.prisma.organizationMember.findMany({
        where: { organizationId: board.organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      })

      const boardMembers = await ctx.prisma.boardMember.findMany({
        where: { boardId: input.boardId },
        select: { userId: true },
      })

      const boardMemberUserIds = new Set(boardMembers.map((bm) => bm.userId))

      return orgMembers.map((m) => ({
        memberId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        isBoardMember: boardMemberUserIds.has(m.user.id),
      }))
    }),

  addMember: protectedProcedure
    .input(z.object({ boardId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify caller is OWNER/ADMIN
      const board = await ctx.prisma.board.findUniqueOrThrow({
        where: { id: input.boardId },
        select: { organizationId: true },
      })

      const callerMembership = await ctx.prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: ctx.dbUser.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      })

      if (!callerMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can manage board members",
        })
      }

      const member = await ctx.prisma.boardMember.create({
        data: {
          boardId: input.boardId,
          userId: input.userId,
        },
      })

      logActivity(ctx.prisma, {
        boardId: input.boardId,
        userId: ctx.dbUser.id,
        action: "MEMBER_ADDED",
        entityType: "BoardMember",
        entityId: member.id,
        metadata: { memberId: input.userId },
      })

      return member
    }),

  removeMember: protectedProcedure
    .input(z.object({ boardId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify caller is OWNER/ADMIN
      const board = await ctx.prisma.board.findUniqueOrThrow({
        where: { id: input.boardId },
        select: { organizationId: true },
      })

      const callerMembership = await ctx.prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: ctx.dbUser.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      })

      if (!callerMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can manage board members",
        })
      }

      const removed = await ctx.prisma.boardMember.delete({
        where: {
          boardId_userId: {
            boardId: input.boardId,
            userId: input.userId,
          },
        },
      })

      logActivity(ctx.prisma, {
        boardId: input.boardId,
        userId: ctx.dbUser.id,
        action: "MEMBER_REMOVED",
        entityType: "BoardMember",
        entityId: removed.id,
        metadata: { memberId: input.userId },
      })

      return removed
    }),
})
