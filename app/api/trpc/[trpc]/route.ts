import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { appRouter } from "@/lib/trpc/routers"
import { createTRPCContext } from "@/lib/trpc/server"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ path, error }) {
      console.error(`[trpc] Error on ${path}:`, error.message)
      if (error.cause) {
        console.error(`[trpc] Cause:`, error.cause)
      }
    },
  })

export { handler as GET, handler as POST }
