"use client"

import { Copy, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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
import { api } from "@/lib/trpc/client"

export default function CustomersPage() {
  const utils = api.useUtils()
  const { data: customers = [], isLoading } = api.customer.list.useQuery()
  const { data: boards = [] } = api.board.list.useQuery()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")

  const createCustomer = api.customer.create.useMutation({
    onSuccess: () => {
      setNewName("")
      setNewEmail("")
      setIsCreating(false)
      utils.customer.list.invalidate()
      toast.success("Customer created")
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteCustomer = api.customer.delete.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      toast.success("Customer deleted")
    },
    onError: (error) => toast.error(error.message),
  })

  const assignBoard = api.customer.assignBoard.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      utils.board.list.invalidate()
      toast.success("Board assigned")
    },
    onError: (error) => toast.error(error.message),
  })

  const unassignBoard = api.customer.unassignBoard.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      utils.board.list.invalidate()
      toast.success("Board unassigned")
    },
    onError: (error) => toast.error(error.message),
  })

  // Boards not currently assigned to any customer
  const assignedBoardIds = new Set(
    customers.flatMap((c) => c.boards.map((b) => b.id))
  )
  const availableBoards = boards.filter((b) => !assignedBoardIds.has(b.id))

  function copyAccessCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success("Access code copied")
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customers and their board access.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add customer
        </Button>
      </div>

      {isCreating && (
        <div className="mb-6 rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">New Customer</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Email</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="customer@example.com"
                type="email"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={
                !newName.trim() || !newEmail.trim() || createCustomer.isPending
              }
              onClick={() =>
                createCustomer.mutate({
                  name: newName.trim(),
                  email: newEmail.trim(),
                })
              }
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsCreating(false)
                setNewName("")
                setNewEmail("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No customers yet. Add one to share board access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded border px-2 py-1">
                    <code className="text-xs font-mono">
                      {customer.accessCode}
                    </code>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => copyAccessCode(customer.accessCode)}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        confirm(`Delete customer "${customer.name}"?`)
                      ) {
                        deleteCustomer.mutate({ id: customer.id })
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Assigned boards */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Assigned boards
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {customer.boards.map((board) => (
                    <Badge
                      key={board.id}
                      variant="secondary"
                      className="gap-1.5"
                    >
                      {board.name}
                      <button
                        className="ml-0.5 rounded-full hover:bg-background/50"
                        onClick={() =>
                          unassignBoard.mutate({ boardId: board.id })
                        }
                      >
                        <span className="text-[10px]">x</span>
                      </button>
                    </Badge>
                  ))}
                  {availableBoards.length > 0 && (
                    <Select
                      onValueChange={(boardId) =>
                        assignBoard.mutate({
                          customerId: customer.id,
                          boardId,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue placeholder="Assign board..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBoards.map((board) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {customer.boards.length === 0 &&
                  availableBoards.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No boards available to assign.
                    </p>
                  )}
              </div>

              {/* Portal link */}
              <div className="text-xs text-muted-foreground">
                Portal link:{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/customer?code=${customer.accessCode}`
                    : `/customer?code=${customer.accessCode}`}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
