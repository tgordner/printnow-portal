"use client"

import { Check, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface AssigneePickerProps {
  boardId: string
  cardId: string
  cardAssignees: Array<{ id: string; name: string | null; email?: string }>
}

export function AssigneePicker({
  boardId,
  cardId,
  cardAssignees,
}: AssigneePickerProps) {
  const utils = api.useUtils()

  const { data: orgMembers = [] } = api.user.listByBoard.useQuery({ boardId })

  const addAssignee = api.card.addAssignee.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeAssignee = api.card.removeAssignee.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const assigneeIds = new Set(cardAssignees.map((a) => a.id))

  function toggleAssignee(userId: string) {
    if (assigneeIds.has(userId)) {
      removeAssignee.mutate({ cardId, userId })
    } else {
      addAssignee.mutate({ cardId, userId })
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return (email[0] ?? "?").toUpperCase()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Assign
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Team members
          </p>

          {orgMembers.length > 0 ? (
            <div className="space-y-0.5">
              {orgMembers.map((user) => (
                <button
                  key={user.id}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    assigneeIds.has(user.id) && "bg-muted"
                  )}
                  onClick={() => toggleAssignee(user.id)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left">
                    {user.name || user.email}
                  </span>
                  {assigneeIds.has(user.id) && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No team members found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
