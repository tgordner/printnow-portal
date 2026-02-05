"use client"

import { Check, Plus, Tag, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

const LABEL_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
]

interface LabelPickerProps {
  boardId: string
  cardId: string
  cardLabels: Array<{ id: string; name: string; color: string }>
}

export function LabelPicker({ boardId, cardId, cardLabels }: LabelPickerProps) {
  const utils = api.useUtils()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(LABEL_COLORS[0] ?? "#ef4444")

  const { data: boardLabels = [] } = api.label.list.useQuery({ boardId })

  const createLabel = api.label.create.useMutation({
    onSuccess: (label) => {
      setNewName("")
      setIsCreating(false)
      utils.label.list.invalidate({ boardId })
      // Auto-assign the new label to the card
      addToCard.mutate({ labelId: label.id, cardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const addToCard = api.label.addToCard.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeFromCard = api.label.removeFromCard.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteLabel = api.label.delete.useMutation({
    onSuccess: () => {
      utils.label.list.invalidate({ boardId })
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const cardLabelIds = new Set(cardLabels.map((l) => l.id))

  function toggleLabel(labelId: string) {
    if (cardLabelIds.has(labelId)) {
      removeFromCard.mutate({ labelId, cardId })
    } else {
      addToCard.mutate({ labelId, cardId })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Board labels
          </p>

          {/* Existing labels */}
          {boardLabels.length > 0 ? (
            <div className="space-y-1">
              {boardLabels.map((label) => (
                <div key={label.id} className="flex items-center gap-1.5">
                  <button
                    className={cn(
                      "flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm text-white transition-opacity hover:opacity-90",
                    )}
                    style={{ backgroundColor: label.color }}
                    onClick={() => toggleLabel(label.id)}
                  >
                    <span className="flex-1 text-left truncate">
                      {label.name}
                    </span>
                    {cardLabelIds.has(label.id) && (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      if (confirm(`Delete label "${label.name}"?`)) {
                        deleteLabel.mutate({ id: label.id })
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No labels yet. Create one below.
            </p>
          )}

          {/* Create new label */}
          {isCreating ? (
            <div className="space-y-2 border-t pt-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createLabel.mutate({
                      boardId,
                      name: newName.trim(),
                      color: newColor,
                    })
                  }
                  if (e.key === "Escape") {
                    setIsCreating(false)
                    setNewName("")
                  }
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-6 w-6 rounded transition-transform hover:scale-110",
                      newColor === color && "ring-2 ring-ring ring-offset-1 ring-offset-background"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!newName.trim() || createLabel.isPending}
                  onClick={() =>
                    createLabel.mutate({
                      boardId,
                      name: newName.trim(),
                      color: newColor,
                    })
                  }
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsCreating(false)
                    setNewName("")
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
              className="w-full justify-start text-xs text-muted-foreground"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create new label
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
