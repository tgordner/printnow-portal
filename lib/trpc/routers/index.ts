import { router } from "@/lib/trpc/server"

import { activityRouter } from "./activity"
import { boardRouter } from "./board"
import { cardRouter } from "./card"
import { columnRouter } from "./column"
import { customerRouter } from "./customer"
import { inviteRouter } from "./invite"
import { labelRouter } from "./label"
import { organizationRouter } from "./organization"
import { userRouter } from "./user"

export const appRouter = router({
  activity: activityRouter,
  board: boardRouter,
  card: cardRouter,
  column: columnRouter,
  customer: customerRouter,
  invite: inviteRouter,
  label: labelRouter,
  organization: organizationRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
