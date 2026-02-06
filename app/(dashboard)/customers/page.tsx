"use client"

import { ChevronDown, ChevronRight, Copy, Link, Mail, Plus, Trash2, Users } from "lucide-react"
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
  const { data: boardData } = api.board.list.useQuery()
  const boards = boardData?.boards ?? []
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
      toast.success("Project assigned")
    },
    onError: (error) => toast.error(error.message),
  })

  const unassignBoard = api.customer.unassignBoard.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      utils.board.list.invalidate()
      toast.success("Project unassigned")
    },
    onError: (error) => toast.error(error.message),
  })

  const addContact = api.customer.addContact.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      toast.success("Contact added")
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteContact = api.customer.deleteContact.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate()
      toast.success("Contact removed")
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
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
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
            <CustomerCard
              key={customer.id}
              customer={customer}
              availableBoards={availableBoards}
              onCopyAccessCode={copyAccessCode}
              onDelete={(id) => deleteCustomer.mutate({ id })}
              onAssignBoard={(customerId, boardId) =>
                assignBoard.mutate({ customerId, boardId })
              }
              onUnassignBoard={(boardId) =>
                unassignBoard.mutate({ boardId })
              }
              onAddContact={(customerId, name, email) =>
                addContact.mutate({ customerId, name, email })
              }
              onDeleteContact={(id) => deleteContact.mutate({ id })}
              isAddingContact={addContact.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerCard({
  customer,
  availableBoards,
  onCopyAccessCode,
  onDelete,
  onAssignBoard,
  onUnassignBoard,
  onAddContact,
  onDeleteContact,
  isAddingContact,
}: {
  customer: {
    id: string
    name: string
    email: string
    accessCode: string
    boards: Array<{ id: string; name: string }>
    contacts: Array<{ id: string; name: string; email: string; isActive: boolean }>
    _count: { contacts: number }
  }
  availableBoards: Array<{ id: string; name: string }>
  onCopyAccessCode: (code: string) => void
  onDelete: (id: string) => void
  onAssignBoard: (customerId: string, boardId: string) => void
  onUnassignBoard: (boardId: string) => void
  onAddContact: (customerId: string, name: string, email: string) => void
  onDeleteContact: (id: string) => void
  isAddingContact: boolean
}) {
  const [contactsExpanded, setContactsExpanded] = useState(false)
  const [isAddingNewContact, setIsAddingNewContact] = useState(false)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")

  return (
    <div className="rounded-lg border p-4 space-y-3">
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
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{customer.name}</p>
              {customer._count.contacts > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <Users className="h-2.5 w-2.5" />
                  {customer._count.contacts}
                </Badge>
              )}
            </div>
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
              onClick={() => onCopyAccessCode(customer.accessCode)}
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete customer "${customer.name}"?`)) {
                onDelete(customer.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Contacts */}
      <div className="space-y-2">
        <button
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setContactsExpanded(!contactsExpanded)}
        >
          {contactsExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Contacts ({customer.contacts.length})
        </button>

        {contactsExpanded && (
          <div className="ml-4 space-y-2">
            {customer.contacts.map((contact) => {
              const portalUrl =
                typeof window !== "undefined"
                  ? `${window.location.origin}/customer/${customer.accessCode}?email=${encodeURIComponent(contact.email)}`
                  : `/customer/${customer.accessCode}?email=${encodeURIComponent(contact.email)}`
              const mailtoHref = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent("You've been invited to view project updates")}&body=${encodeURIComponent(`Hi ${contact.name},\n\nYou've been invited to view project updates for ${customer.name}.\n\nClick the link below to access the portal:\n${portalUrl}\n`)}`

              return (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Send invite email"
                      asChild
                    >
                      <a href={mailtoHref}>
                        <Mail className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy invite link"
                      onClick={() => {
                        navigator.clipboard.writeText(portalUrl)
                        toast.success("Invite link copied")
                      }}
                    >
                      <Link className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove contact "${contact.name}"?`)) {
                          onDeleteContact(contact.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {isAddingNewContact ? (
              <div className="space-y-2 rounded border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    autoFocus
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Contact name"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={
                      !contactName.trim() ||
                      !contactEmail.trim() ||
                      isAddingContact
                    }
                    onClick={() => {
                      onAddContact(
                        customer.id,
                        contactName.trim(),
                        contactEmail.trim()
                      )
                      setContactName("")
                      setContactEmail("")
                      setIsAddingNewContact(false)
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsAddingNewContact(false)
                      setContactName("")
                      setContactEmail("")
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
                className="h-7 text-xs"
                onClick={() => setIsAddingNewContact(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add contact
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Assigned boards */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Assigned projects
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
                onClick={() => onUnassignBoard(board.id)}
              >
                <span className="text-[10px]">x</span>
              </button>
            </Badge>
          ))}
          {availableBoards.length > 0 && (
            <Select
              onValueChange={(boardId) =>
                onAssignBoard(customer.id, boardId)
              }
            >
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="Assign project..." />
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
              No projects available to assign.
            </p>
          )}
      </div>

      {/* Portal link */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        Portal link:{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          {typeof window !== "undefined"
            ? `${window.location.origin}/customer?code=${customer.accessCode}`
            : `/customer?code=${customer.accessCode}`}
        </code>
        <button
          className="text-muted-foreground hover:text-foreground"
          title="Copy portal link"
          onClick={() => {
            const url =
              typeof window !== "undefined"
                ? `${window.location.origin}/customer?code=${customer.accessCode}`
                : `/customer?code=${customer.accessCode}`
            navigator.clipboard.writeText(url)
            toast.success("Portal link copied")
          }}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
