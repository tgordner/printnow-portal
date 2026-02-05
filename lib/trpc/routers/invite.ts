import { TRPCError } from "@trpc/server"
import { z } from "zod/v4"

import { protectedProcedure, router } from "@/lib/trpc/server"

export const inviteRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.dbUser.id, role: { in: ["OWNER", "ADMIN"] } },
    })

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can view invites",
      })
    }

    return ctx.prisma.invite.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
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
        email: z.email(),
        role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
        boardIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.dbUser.id, role: { in: ["OWNER", "ADMIN"] } },
      })

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite members",
        })
      }

      const email = input.email.trim().toLowerCase()

      // Check if the email is already a member of this org
      const existingMember = await ctx.prisma.organizationMember.findFirst({
        where: {
          organizationId: membership.organizationId,
          user: { email },
        },
      })

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already a member of your organization",
        })
      }

      // Check if there's already a pending invite
      const existingInvite = await ctx.prisma.invite.findUnique({
        where: {
          organizationId_email: {
            organizationId: membership.organizationId,
            email,
          },
        },
      })

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invite has already been sent to this email",
        })
      }

      return ctx.prisma.invite.create({
        data: {
          organizationId: membership.organizationId,
          email,
          role: input.role,
          invitedById: ctx.dbUser.id,
          ...(input.boardIds &&
            input.boardIds.length > 0 && {
              boards: {
                connect: input.boardIds.map((id) => ({ id })),
              },
            }),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.dbUser.id, role: { in: ["OWNER", "ADMIN"] } },
      })

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can cancel invites",
        })
      }

      // Ensure the invite belongs to the same org
      const invite = await ctx.prisma.invite.findUnique({
        where: { id: input.inviteId },
      })

      if (!invite || invite.organizationId !== membership.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        })
      }

      return ctx.prisma.invite.delete({
        where: { id: input.inviteId },
      })
    }),
})
