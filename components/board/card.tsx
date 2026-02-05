"use client"

import { Draggable } from "@hello-pangea/dnd"
import { MessageSquare, Paperclip } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DueDateBadge } from "@/components/shared/due-date-badge"
import { PRIORITY_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface CardProps {
  card: {
    id: string
    title: string
    description: string | null
    dueDate: Date | null
    priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    assignees: Array<{
      id: string
      name: string | null
      avatarUrl: string | null
    }>
    labels: Array<{ id: string; name: string; color: string }>
    _count: { comments: number; attachments: number }
  }
  index: number
  dimmed?: boolean
  onClick?: () => void
}

export function BoardCard({ card, index, dimmed, onClick }: CardProps) {
  const priority = PRIORITY_CONFIG[card.priority]

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            // Don't open modal if we just finished dragging
            if (!snapshot.isDragging && onClick) {
              onClick()
            }
          }}
          className={cn(
            "cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-all hover:shadow-md",
            snapshot.isDragging && "rotate-2 shadow-lg",
            dimmed && "opacity-30 pointer-events-none"
          )}
        >
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <div
                  key={label.id}
                  className="h-2 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-medium">{card.title}</p>

          {/* Meta row */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Due date */}
              {card.dueDate && (
                <DueDateBadge date={card.dueDate} />
              )}
              {/* Comments count */}
              {card._count.comments > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {card._count.comments}
                </span>
              )}
              {/* Attachments count */}
              {card._count.attachments > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {card._count.attachments}
                </span>
              )}
              {/* Priority */}
              {card.priority !== "NONE" && (
                <Badge
                  variant="secondary"
                  className={cn("text-xs", priority.color)}
                >
                  {priority.label}
                </Badge>
              )}
            </div>

            {/* Assignees */}
            {card.assignees.length > 0 && (
              <div className="flex -space-x-1">
                {card.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-6 w-6 border-2 border-card">
                    <AvatarFallback className="text-[10px]">
                      {assignee.name
                        ? assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
