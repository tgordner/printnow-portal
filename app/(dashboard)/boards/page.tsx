"use client"

import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/lib/trpc/client"

export default function BoardsPage() {
  const { data: boards, isLoading } = api.board.list.useQuery()

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Boards</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-4 w-48 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Boards</h1>
        <Link href="/boards/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </Link>
      </div>

      {boards && boards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <CardHeader className="text-center">
            <CardTitle>No boards yet</CardTitle>
            <CardDescription>
              Create your first board to get started.
            </CardDescription>
          </CardHeader>
          <Link href="/boards/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards?.map((board) => (
            <Link key={board.id} href={`/boards/${board.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  {board.description && (
                    <CardDescription>{board.description}</CardDescription>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {board.columns.length} columns
                    {" · "}
                    {board.columns.reduce(
                      (acc, col) => acc + col._count.cards,
                      0
                    )}{" "}
                    cards
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
