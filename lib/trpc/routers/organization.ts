import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const organizationRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.dbUser.id },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    })

    if (!membership) {
      throw new Error("User has no organization")
    }

    return {
      ...membership.organization,
      currentUserRole: membership.role,
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        slug: z.string().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.dbUser.id, role: { in: ["OWNER", "ADMIN"] } },
      })

      if (!membership) {
        throw new Error("You don't have permission to update this organization")
      }

      return ctx.prisma.organization.update({
        where: { id: membership.organizationId },
        data: input,
      })
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check the current user is OWNER or ADMIN
      const currentMembership =
        await ctx.prisma.organizationMember.findFirst({
          where: {
            userId: ctx.dbUser.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        })

      if (!currentMembership) {
        throw new Error("You don't have permission to change roles")
      }

      return ctx.prisma.organizationMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentMembership =
        await ctx.prisma.organizationMember.findFirst({
          where: {
            userId: ctx.dbUser.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        })

      if (!currentMembership) {
        throw new Error("You don't have permission to remove members")
      }

      // Don't allow removing yourself
      const target = await ctx.prisma.organizationMember.findUniqueOrThrow({
        where: { id: input.memberId },
      })

      if (target.userId === ctx.dbUser.id) {
        throw new Error("You cannot remove yourself")
      }

      return ctx.prisma.organizationMember.delete({
        where: { id: input.memberId },
      })
    }),
})
