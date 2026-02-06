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

export default function ProjectsPage() {
  const { data, isLoading } = api.board.list.useQuery()

  const boards = data?.boards
  const canCreateBoard = data?.canCreateBoard ?? false

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
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
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        {canCreateBoard && (
          <Link href="/boards/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        )}
      </div>

      {boards && boards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-semibold">No projects yet</h2>
          <p className="mt-2 text-base text-muted-foreground">
            {canCreateBoard
              ? "Create your first project to get started."
              : "No projects have been shared with you yet."}
          </p>
          {canCreateBoard && (
            <Link href="/boards/new" className="mt-6">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            </Link>
          )}
        </div>
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
