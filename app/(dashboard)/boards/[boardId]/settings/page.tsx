"use client"

import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { COLUMN_COLORS } from "@/lib/constants"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

const LABEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
]

export default function BoardSettingsPage() {
  const params = useParams<{ boardId: string }>()
  const router = useRouter()
  const utils = api.useUtils()

  const { data: board, isLoading } = api.board.get.useQuery({
    id: params.boardId,
  })
  const { data: labels = [] } = api.label.list.useQuery({
    boardId: params.boardId,
  })

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      utils.board.get.invalidate({ id: params.boardId })
      toast.success("Board updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const archiveBoard = api.board.archive.useMutation({
    onSuccess: () => {
      toast.success("Board archived")
      router.push("/boards")
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteBoard = api.board.delete.useMutation({
    onSuccess: () => {
      toast.success("Board deleted")
      router.push("/boards")
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading || !board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/boards/${params.boardId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Board Settings</h1>
      </div>

      <div className="space-y-8">
        {/* General */}
        <BoardGeneralSection
          boardId={params.boardId}
          name={board.name}
          description={board.description ?? ""}
          onSave={(data) => updateBoard.mutate({ id: params.boardId, ...data })}
          isPending={updateBoard.isPending}
        />

        <Separator />

        {/* Labels */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Labels</h2>
          <p className="text-sm text-muted-foreground">
            Manage labels for this board. Labels can be assigned to cards.
          </p>
          <LabelManager boardId={params.boardId} labels={labels} />
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-destructive">
            Danger Zone
          </h2>
          <div className="rounded-lg border border-destructive/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Archive this board</p>
                <p className="text-xs text-muted-foreground">
                  Hide from the board list. Can be restored later.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Archive this board?")) {
                    archiveBoard.mutate({ id: params.boardId })
                  }
                }}
              >
                Archive
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete this board</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this board and all its data.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      "Permanently delete this board? This cannot be undone."
                    )
                  ) {
                    deleteBoard.mutate({ id: params.boardId })
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BoardGeneralSection({
  boardId,
  name,
  description,
  onSave,
  isPending,
}: {
  boardId: string
  name: string
  description: string
  onSave: (data: { name?: string; description?: string }) => void
  isPending: boolean
}) {
  const [draftName, setDraftName] = useState(name)
  const [draftDesc, setDraftDesc] = useState(description)

  useEffect(() => {
    setDraftName(name)
    setDraftDesc(description)
  }, [name, description])

  const hasChanges = draftName.trim() !== name || draftDesc !== description

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">General</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Board name</label>
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="Optional description..."
            rows={3}
          />
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!draftName.trim() || isPending}
              onClick={() =>
                onSave({
                  name: draftName.trim(),
                  description: draftDesc || undefined,
                })
              }
            >
              Save changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftName(name)
                setDraftDesc(description)
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function LabelManager({
  boardId,
  labels,
}: {
  boardId: string
  labels: Array<{ id: string; name: string; color: string }>
}) {
  const utils = api.useUtils()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(LABEL_COLORS[0] ?? "#ef4444")

  const createLabel = api.label.create.useMutation({
    onSuccess: () => {
      setNewName("")
      setIsCreating(false)
      utils.label.list.invalidate({ boardId })
    },
    onError: (error) => toast.error(error.message),
  })

  const updateLabel = api.label.update.useMutation({
    onSuccess: () => {
      setEditingId(null)
      utils.label.list.invalidate({ boardId })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteLabel = api.label.delete.useMutation({
    onSuccess: () => {
      utils.label.list.invalidate({ boardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => toast.error(error.message),
  })

  function startEditing(label: { id: string; name: string; color: string }) {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  return (
    <div className="space-y-2">
      {labels.map((label) =>
        editingId === label.id ? (
          <div key={label.id} className="space-y-2 rounded-lg border p-3">
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editName.trim()) {
                  updateLabel.mutate({
                    id: label.id,
                    name: editName.trim(),
                    color: editColor,
                  })
                }
                if (e.key === "Escape") setEditingId(null)
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-6 w-6 rounded transition-transform hover:scale-110",
                    editColor === color &&
                      "ring-2 ring-ring ring-offset-1 ring-offset-background"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setEditColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!editName.trim()}
                onClick={() =>
                  updateLabel.mutate({
                    id: label.id,
                    name: editName.trim(),
                    color: editColor,
                  })
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            key={label.id}
            className="flex items-center gap-2 rounded-lg border p-2"
          >
            <div
              className="h-6 flex-1 rounded px-2 py-0.5 text-sm text-white flex items-center"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => startEditing(label)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete label "${label.name}"?`)) {
                  deleteLabel.mutate({ id: label.id })
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      )}

      {isCreating ? (
        <div className="space-y-2 rounded-lg border p-3">
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
                  newColor === color &&
                    "ring-2 ring-ring ring-offset-1 ring-offset-background"
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
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create label
        </Button>
      )}
    </div>
  )
}
