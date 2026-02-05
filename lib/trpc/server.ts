import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const createTRPCContext = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    prisma,
    supabase,
    user,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  // Get or create the app user from Prisma (auto-sync from Supabase Auth)
  let dbUser = await ctx.prisma.user.findUnique({
    where: { supabaseId: ctx.user.id },
  })

  if (!dbUser) {
    // First login — create User record
    const email = ctx.user.email ?? ""
    const name =
      ctx.user.user_metadata?.name ??
      ctx.user.user_metadata?.full_name ??
      email.split("@")[0] ??
      ""

    // Check if this email has a pending invite
    const invite = await ctx.prisma.invite.findFirst({
      where: { email },
      include: { boards: { select: { id: true } } },
    })

    if (invite) {
      // Invited user: create user and add to the inviter's org
      const newUser = await ctx.prisma.user.create({
        data: {
          supabaseId: ctx.user.id,
          email,
          name,
          memberships: {
            create: {
              role: invite.role,
              organizationId: invite.organizationId,
            },
          },
        },
      })
      dbUser = newUser

      // Create BoardMember records for boards listed on the invite
      if (invite.boards.length > 0) {
        await ctx.prisma.boardMember.createMany({
          data: invite.boards.map((b) => ({
            boardId: b.id,
            userId: newUser.id,
          })),
        })
      }

      // Consume the invite
      await ctx.prisma.invite.delete({ where: { id: invite.id } })
    } else {
      // No invite — create user with a new default organization
      dbUser = await ctx.prisma.user.create({
        data: {
          supabaseId: ctx.user.id,
          email,
          name,
          memberships: {
            create: {
              role: "OWNER",
              organization: {
                create: {
                  name: "My Organization",
                  slug: `org-${ctx.user.id.slice(0, 8)}`,
                },
              },
            },
          },
        },
      })
    }
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      dbUser,
    },
  })
})
