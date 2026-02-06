"use client"

import { useParams } from "next/navigation"

import { BoardView } from "@/components/board/board-view"
import { api } from "@/lib/trpc/client"

export default function BoardPage() {
  const params = useParams<{ boardId: string }>()
  const { data: board, isLoading } = api.board.get.useQuery({
    id: params.boardId,
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    )
  }

  return <BoardView board={board} />
}
