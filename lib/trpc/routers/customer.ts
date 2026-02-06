import { TRPCError } from "@trpc/server"
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
        contacts: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { contacts: true } },
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

  // --- Contact management ---

  listContacts: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customerContact.findMany({
        where: { customerId: input.customerId },
        orderBy: { createdAt: "asc" },
      })
    }),

  addContact: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        name: z.string().min(1).max(100),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customerContact.create({
        data: {
          customerId: input.customerId,
          name: input.name,
          email: input.email,
        },
      })
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.customerContact.update({
        where: { id },
        data,
      })
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customerContact.delete({
        where: { id: input.id },
      })
    }),

  // Public: look up customer by access code (no auth required)
  getByAccessCode: publicProcedure
    .input(z.object({ accessCode: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { accessCode: input.accessCode.toUpperCase() },
        include: {
          contacts: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
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
                      _count: { select: { comments: true, attachments: true } },
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
        contacts: customer.contacts,
      }
    }),

  // Public: update own contact profile (name only)
  updateContactProfile: publicProcedure
    .input(
      z.object({
        accessCode: z.string().min(1),
        contactId: z.string(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { accessCode: input.accessCode.toUpperCase() },
        select: { id: true },
      })

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid access code" })
      }

      const contact = await ctx.prisma.customerContact.findFirst({
        where: { id: input.contactId, customerId: customer.id },
      })

      if (!contact) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Contact not found" })
      }

      return ctx.prisma.customerContact.update({
        where: { id: input.contactId },
        data: { name: input.name },
      })
    }),

  // Public: get card details for customer view
  getCard: publicProcedure
    .input(z.object({ accessCode: z.string().min(1), cardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { accessCode: input.accessCode.toUpperCase() },
        include: { boards: { select: { id: true } } },
      })

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid access code" })
      }

      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        include: {
          column: { select: { boardId: true, name: true } },
          assignees: { select: { id: true, name: true, avatarUrl: true } },
          labels: true,
          comments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              customer: { select: { id: true, name: true } },
              customerContact: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          attachments: true,
        },
      })

      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })
      }

      // Verify card belongs to a board assigned to this customer
      const boardIds = customer.boards.map((b) => b.id)
      if (!boardIds.includes(card.column.boardId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" })
      }

      return card
    }),

  // Public: add a comment as a customer
  addComment: publicProcedure
    .input(
      z.object({
        accessCode: z.string().min(1),
        cardId: z.string(),
        content: z.string().min(1).max(2000),
        contactId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findUnique({
        where: { accessCode: input.accessCode.toUpperCase() },
        include: { boards: { select: { id: true } } },
      })

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid access code" })
      }

      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        include: { column: { select: { boardId: true } } },
      })

      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })
      }

      const boardIds = customer.boards.map((b) => b.id)
      if (!boardIds.includes(card.column.boardId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" })
      }

      // Verify contact belongs to this customer if provided
      if (input.contactId) {
        const contact = await ctx.prisma.customerContact.findFirst({
          where: { id: input.contactId, customerId: customer.id },
        })
        if (!contact) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid contact" })
        }
      }

      return ctx.prisma.comment.create({
        data: {
          cardId: input.cardId,
          customerId: customer.id,
          customerContactId: input.contactId ?? null,
          content: input.content,
        },
        include: {
          customer: { select: { id: true, name: true } },
          customerContact: { select: { id: true, name: true } },
        },
      })
    }),
})
