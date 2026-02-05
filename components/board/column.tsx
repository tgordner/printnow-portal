"use client"

import { Draggable, Droppable } from "@hello-pangea/dnd"
import { Check, MoreHorizontal, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { BoardCard } from "@/components/board/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { COLUMN_COLORS } from "@/lib/constants"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface ColumnProps {
  column: {
    id: string
    name: string
    color: string | null
    cards: Array<{
      id: string
      title: string
      description: string | null
      position: number
      dueDate: Date | null
      priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      assignees: Array<{
        id: string
        name: string | null
        avatarUrl: string | null
      }>
      labels: Array<{ id: string; name: string; color: string }>
      _count: { comments: number }
    }>
  }
  index: number
  boardId: string
  onCardClick?: (cardId: string) => void
}

export function BoardColumn({ column, index, boardId, onCardClick }: ColumnProps) {
  const utils = api.useUtils()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(column.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftName(column.name)
  }, [column.name])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  const createCard = api.card.create.useMutation({
    onSuccess: () => {
      setNewCardTitle("")
      setIsAddingCard(false)
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateColumn = api.column.update.useMutation({
    onSuccess: () => {
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteColumn = api.column.delete.useMutation({
    onSuccess: () => {
      utils.board.get.invalidate({ id: boardId })
      toast.success("Column deleted")
    },
  })

  function handleNameSave() {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== column.name) {
      updateColumn.mutate({ id: column.id, name: trimmed })
    } else {
      setDraftName(column.name)
    }
    setIsEditingName(false)
  }

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="w-[17rem] shrink-0 sm:w-72"
        >
          <div className="flex max-h-[calc(100vh-12rem)] flex-col rounded-lg border bg-muted/50">
            {/* Column header */}
            <div
              {...provided.dragHandleProps}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Color picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-3 w-3 shrink-0 rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-1"
                      style={{ backgroundColor: column.color || "#94a3b8" }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="grid grid-cols-5 gap-2">
                      {COLUMN_COLORS.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            updateColumn.mutate({ id: column.id, color })
                          }
                        >
                          {column.color === color && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Editable name */}
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleNameSave()
                      }
                      if (e.key === "Escape") {
                        setDraftName(column.name)
                        setIsEditingName(false)
                      }
                    }}
                    className="min-w-0 flex-1 rounded bg-background px-1 py-0.5 text-sm font-semibold outline-none ring-1 ring-ring"
                  />
                ) : (
                  <h3
                    className="cursor-pointer truncate text-sm font-semibold rounded px-1 py-0.5 hover:bg-background/50"
                    onClick={() => setIsEditingName(true)}
                  >
                    {column.name}
                  </h3>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {column.cards.length}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteColumn.mutate({ id: column.id })}
                  >
                    Delete column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Cards */}
            <Droppable droppableId={column.id} type="card">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[2rem] flex-1 space-y-2 overflow-y-auto px-2 py-1 ${
                    snapshot.isDraggingOver ? "bg-primary/5" : ""
                  }`}
                >
                  {column.cards.map((card, cardIndex) => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      onClick={() => onCardClick?.(card.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add card */}
            <div className="p-2">
              {isAddingCard ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    className="w-full resize-none rounded border bg-background px-2 py-1 text-sm"
                    placeholder="Card title..."
                    rows={2}
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && newCardTitle.trim()) {
                        e.preventDefault()
                        createCard.mutate({
                          columnId: column.id,
                          title: newCardTitle.trim(),
                        })
                      }
                      if (e.key === "Escape") {
                        setIsAddingCard(false)
                        setNewCardTitle("")
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!newCardTitle.trim() || createCard.isPending}
                      onClick={() =>
                        createCard.mutate({
                          columnId: column.id,
                          title: newCardTitle.trim(),
                        })
                      }
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCard(false)
                        setNewCardTitle("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setIsAddingCard(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add card
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
