"use client"

import { ArrowLeft, Check, Copy, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const { data: org } = api.organization.getCurrent.useQuery()

  const isAdmin =
    org?.currentUserRole === "OWNER" || org?.currentUserRole === "ADMIN"

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
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
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

        {/* Members (admin only) */}
        {isAdmin && (
          <>
            <Separator />
            <BoardMembersSection boardId={params.boardId} />
          </>
        )}

        {/* Customer Access (admin only) */}
        {isAdmin && (
          <>
            <Separator />
            <CustomerAccessSection
              boardId={params.boardId}
              customer={board.customer}
            />
          </>
        )}

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

function BoardMembersSection({ boardId }: { boardId: string }) {
  const utils = api.useUtils()

  const { data: members, isLoading } = api.board.listMembers.useQuery({
    boardId,
  })

  const addMember = api.board.addMember.useMutation({
    onSuccess: () => {
      utils.board.listMembers.invalidate({ boardId })
      toast.success("Member added to board")
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMember = api.board.removeMember.useMutation({
    onSuccess: () => {
      utils.board.listMembers.invalidate({ boardId })
      toast.success("Member removed from board")
    },
    onError: (error) => toast.error(error.message),
  })

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

  const roleColors = {
    OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    MEMBER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Board Members</h2>
      <p className="text-sm text-muted-foreground">
        Owners and Admins can always see all boards. Toggle access for Member-role users.
      </p>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading members...</p>
      )}

      {members && (
        <div className="space-y-2">
          {members.map((member) => {
            const isPrivileged =
              member.role === "OWNER" || member.role === "ADMIN"
            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name || member.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                {isPrivileged ? (
                  <Badge
                    variant="secondary"
                    className={roleColors[member.role]}
                  >
                    All boards
                  </Badge>
                ) : member.isBoardMember ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={removeMember.isPending}
                    onClick={() =>
                      removeMember.mutate({
                        boardId,
                        userId: member.userId,
                      })
                    }
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={addMember.isPending}
                    onClick={() =>
                      addMember.mutate({
                        boardId,
                        userId: member.userId,
                      })
                    }
                  >
                    Add
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CustomerAccessSection({
  boardId,
  customer,
}: {
  boardId: string
  customer: {
    id: string
    name: string
    accessCode: string
    _count: { contacts: number }
  } | null
}) {
  const utils = api.useUtils()
  const { data: customers = [] } = api.customer.list.useQuery()

  const assignBoard = api.customer.assignBoard.useMutation({
    onSuccess: () => {
      utils.board.get.invalidate({ id: boardId })
      utils.customer.list.invalidate()
      toast.success("Customer assigned")
    },
    onError: (error) => toast.error(error.message),
  })

  const unassignBoard = api.customer.unassignBoard.useMutation({
    onSuccess: () => {
      utils.board.get.invalidate({ id: boardId })
      utils.customer.list.invalidate()
      toast.success("Customer unassigned")
    },
    onError: (error) => toast.error(error.message),
  })

  function copyAccessCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success("Access code copied")
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Customer Access</h2>
      <p className="text-sm text-muted-foreground">
        Assign a customer to give them read-only access to this board via the
        customer portal.
      </p>

      {customer ? (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {customer._count.contacts} contact
                  {customer._count.contacts !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={unassignBoard.isPending}
              onClick={() => {
                if (confirm("Unassign this customer from the board?")) {
                  unassignBoard.mutate({ boardId })
                }
              }}
            >
              Unassign
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Access code:</span>
            <div className="flex items-center gap-1.5 rounded border px-2 py-1">
              <code className="text-xs font-mono">{customer.accessCode}</code>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => copyAccessCode(customer.accessCode)}
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Portal link:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              {typeof window !== "undefined"
                ? `${window.location.origin}/customer/${customer.accessCode}`
                : `/customer/${customer.accessCode}`}
            </code>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No customers exist yet. Create one in the Customers page first.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Select a customer to assign to this board:
              </p>
              <Select
                onValueChange={(customerId) =>
                  assignBoard.mutate({ customerId, boardId })
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
