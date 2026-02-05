"use client"

import { formatDistanceToNow } from "date-fns"
import { Activity, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/trpc/client"

interface ActivityPanelProps {
  boardId: string
  onClose: () => void
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  CARD_CREATED: "created a card",
  CARD_UPDATED: "updated a card",
  CARD_MOVED: "moved a card",
  CARD_DELETED: "deleted a card",
  ASSIGNEE_ADDED: "added an assignee",
  ASSIGNEE_REMOVED: "removed an assignee",
  COMMENT_ADDED: "added a comment",
  COLUMN_CREATED: "created a column",
  COLUMN_DELETED: "deleted a column",
  MEMBER_ADDED: "added a member",
  MEMBER_REMOVED: "removed a member",
  LABEL_ADDED: "added a label",
  LABEL_REMOVED: "removed a label",
}

function getDescription(action: string, metadata: Record<string, unknown> | null): string {
  const base = ACTION_DESCRIPTIONS[action] ?? action.toLowerCase().replace(/_/g, " ")

  if (!metadata) return base

  if (action === "CARD_CREATED" || action === "CARD_DELETED") {
    const title = metadata.title as string | undefined
    if (title) return `${base} "${title}"`
  }

  if (action === "CARD_UPDATED") {
    const fields = metadata.fields as string[] | undefined
    if (fields?.length) return `${base} (${fields.join(", ")})`
  }

  if (action === "COLUMN_CREATED" || action === "COLUMN_DELETED") {
    const name = metadata.name as string | undefined
    if (name) return `${base} "${name}"`
  }

  return base
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ActivityPanel({ boardId, onClose }: ActivityPanelProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = api.activity.listByBoard.useInfiniteQuery(
    { boardId, limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  const items = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Activity</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading activity...
            </p>
          )}

          {!isLoading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activity yet
            </p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
            >
              <Avatar size="sm" className="mt-0.5">
                {item.user?.avatarUrl && (
                  <AvatarImage src={item.user.avatarUrl} alt={item.user.name ?? ""} />
                )}
                <AvatarFallback>
                  {getInitials(item.user?.name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">
                    {item.user?.name ?? "Unknown"}
                  </span>{" "}
                  {getDescription(
                    item.action,
                    item.metadata as Record<string, unknown> | null
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}

          {hasNextPage && (
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
