"use client"

import {
  DragDropContext,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import { Plus, Settings } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { CardModal } from "@/components/board/card-modal"
import { BoardColumn } from "@/components/board/column"
import { Button } from "@/components/ui/button"
import { useBoardRealtime } from "@/hooks/use-realtime"
import { api } from "@/lib/trpc/client"

interface BoardViewProps {
  board: {
    id: string
    name: string
    columns: Array<{
      id: string
      name: string
      position: number
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
        labels: Array<{
          id: string
          name: string
          color: string
        }>
        _count: { comments: number }
      }>
    }>
  }
}

export function BoardView({ board }: BoardViewProps) {
  const utils = api.useUtils()
  const [columns, setColumns] = useState(board.columns)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Sync columns when board data refreshes (e.g. after card update)
  useEffect(() => {
    setColumns(board.columns)
  }, [board.columns])

  const reorderColumns = api.column.reorder.useMutation({
    onError: () => {
      toast.error("Failed to reorder columns")
      utils.board.get.invalidate({ id: board.id })
    },
  })

  const moveCard = api.card.move.useMutation({
    onError: () => {
      toast.error("Failed to move card")
      utils.board.get.invalidate({ id: board.id })
    },
  })

  const handleRefresh = useCallback(() => {
    utils.board.get.invalidate({ id: board.id })
  }, [utils, board.id])

  useBoardRealtime(board.id, handleRefresh)

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result

    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return

    if (type === "column") {
      const newColumns = Array.from(columns)
      const [movedColumn] = newColumns.splice(source.index, 1)
      if (movedColumn) {
        newColumns.splice(destination.index, 0, movedColumn)
        setColumns(newColumns)
        reorderColumns.mutate({
          boardId: board.id,
          columnIds: newColumns.map((c) => c.id),
        })
      }
    } else {
      // Card drag
      const sourceColumn = columns.find(
        (c) => c.id === source.droppableId
      )
      const destColumn = columns.find(
        (c) => c.id === destination.droppableId
      )

      if (!sourceColumn || !destColumn) return

      const newColumns = Array.from(columns)

      if (sourceColumn.id === destColumn.id) {
        // Same column reorder
        const colIndex = newColumns.findIndex(
          (c) => c.id === sourceColumn.id
        )
        if (colIndex === -1) return
        const newCards = Array.from(sourceColumn.cards)
        const [movedCard] = newCards.splice(source.index, 1)
        if (movedCard) {
          newCards.splice(destination.index, 0, movedCard)
          newColumns[colIndex] = { ...sourceColumn, cards: newCards }
        }
      } else {
        // Cross-column move
        const sourceColIndex = newColumns.findIndex(
          (c) => c.id === sourceColumn.id
        )
        const destColIndex = newColumns.findIndex(
          (c) => c.id === destColumn.id
        )
        if (sourceColIndex === -1 || destColIndex === -1) return

        const sourceCards = Array.from(sourceColumn.cards)
        const destCards = Array.from(destColumn.cards)
        const [movedCard] = sourceCards.splice(source.index, 1)
        if (movedCard) {
          destCards.splice(destination.index, 0, movedCard)
          newColumns[sourceColIndex] = {
            ...sourceColumn,
            cards: sourceCards,
          }
          newColumns[destColIndex] = {
            ...destColumn,
            cards: destCards,
          }
        }
      }

      setColumns(newColumns)
      moveCard.mutate({
        cardId: draggableId,
        columnId: destination.droppableId,
        position: destination.index,
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h1 className="truncate text-xl font-semibold">{board.name}</h1>
        <Link href={`/boards/${board.id}/settings`}>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto p-3 sm:p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="board"
            type="column"
            direction="horizontal"
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4"
              >
                {columns.map((column, index) => (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    index={index}
                    boardId={board.id}
                    onCardClick={(cardId) => setSelectedCardId(cardId)}
                  />
                ))}
                {provided.placeholder}
                <div className="w-[17rem] shrink-0 sm:w-72">
                  <AddColumnButton boardId={board.id} />
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={board.id}
          open={!!selectedCardId}
          onOpenChange={(open) => {
            if (!open) setSelectedCardId(null)
          }}
        />
      )}
    </div>
  )
}

function AddColumnButton({ boardId }: { boardId: string }) {
  const utils = api.useUtils()
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")

  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      setName("")
      setIsAdding(false)
      utils.board.get.invalidate({ id: boardId })
      toast.success("Column added!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add column
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <input
        autoFocus
        className="w-full rounded border px-2 py-1 text-sm"
        placeholder="Column name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            createColumn.mutate({ boardId, name: name.trim() })
          }
          if (e.key === "Escape") {
            setIsAdding(false)
            setName("")
          }
        }}
      />
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || createColumn.isPending}
          onClick={() => createColumn.mutate({ boardId, name: name.trim() })}
        >
          Add
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsAdding(false)
            setName("")
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
