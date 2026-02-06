"use client"

import { ArrowLeft, MessageSquare, Paperclip } from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"

import { CustomerCardModal } from "@/components/customer/customer-card-modal"
import { DueDateBadge } from "@/components/shared/due-date-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/trpc/client"
import { PRIORITY_CONFIG } from "@/lib/constants"

function getStorageKey(accessCode: string) {
  return `portal-contact-${accessCode}`
}

function loadSavedContact(accessCode: string): { contactId: string; email: string; name: string } | null {
  try {
    const raw = localStorage.getItem(getStorageKey(accessCode))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveContact(accessCode: string, contact: { contactId: string; email: string; name: string }) {
  localStorage.setItem(getStorageKey(accessCode), JSON.stringify(contact))
}

export default function CustomerBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <CustomerBoardContent />
    </Suspense>
  )
}

function CustomerBoardContent() {
  const params = useParams<{ accessCode: string }>()
  const searchParams = useSearchParams()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [identifiedContact, setIdentifiedContact] = useState<{
    contactId: string
    email: string
    name: string
  } | null>(null)
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [gateChecked, setGateChecked] = useState(false)

  const { data, isLoading } = api.customer.getByAccessCode.useQuery({
    accessCode: params.accessCode,
  })

  const hasContacts = data?.contacts && data.contacts.length > 0

  const identifyByEmail = useCallback(
    (email: string): { contactId: string; email: string; name: string } | null => {
      if (!data?.contacts) return null
      const match = data.contacts.find(
        (c) => c.email.toLowerCase() === email.toLowerCase()
      )
      if (!match) return null
      return { contactId: match.id, email: match.email, name: match.name }
    },
    [data?.contacts]
  )

  // Run gate logic once data is loaded
  useEffect(() => {
    if (!data || gateChecked) return

    if (!hasContacts) {
      setGateChecked(true)
      return
    }

    // 1. Check ?email= URL param
    const emailParam = searchParams.get("email")
    if (emailParam) {
      const match = identifyByEmail(emailParam)
      if (match) {
        saveContact(params.accessCode, match)
        window.dispatchEvent(new CustomEvent("portal-contact-change"))
        setIdentifiedContact(match)
        setGateChecked(true)
        return
      }
    }

    // 2. Check localStorage
    const saved = loadSavedContact(params.accessCode)
    if (saved) {
      // Verify saved contact still exists in data
      const stillValid = data.contacts.some((c) => c.id === saved.contactId)
      if (stillValid) {
        setIdentifiedContact(saved)
        setGateChecked(true)
        return
      }
    }

    // 3. Show email form
    setGateChecked(true)
  }, [data, gateChecked, hasContacts, searchParams, identifyByEmail, params.accessCode])

  // Auto-select board if only one
  useEffect(() => {
    if (!data) return
    if (data.boards.length === 1 && !selectedBoardId && data.boards[0]) {
      setSelectedBoardId(data.boards[0].id)
    }
  }, [data, selectedBoardId])

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError("")
    const match = identifyByEmail(emailInput.trim())
    if (match) {
      saveContact(params.accessCode, match)
      window.dispatchEvent(new CustomEvent("portal-contact-change"))
      setIdentifiedContact(match)
    } else {
      setEmailError("No contact found with that email address.")
    }
  }

  if (isLoading || !gateChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold">Invalid Access Code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The access code you entered was not found. Please check and try
            again.
          </p>
        </div>
      </div>
    )
  }

  // Email gate: show form if has contacts but none identified
  if (hasContacts && !identifiedContact) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div>
            <h2 className="text-xl font-bold">{data.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email to continue
            </p>
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <Input
              autoFocus
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value)
                if (emailError) setEmailError("")
              }}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
            <Button type="submit" className="w-full" disabled={!emailInput.trim()}>
              Continue
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Welcome header
  const welcomeHeader = (
    <div className="mb-6">
      {identifiedContact ? (
        <div>
          <p className="text-sm font-medium">
            Welcome, {identifiedContact.name}
          </p>
          <p className="text-xs text-muted-foreground">{data.name}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Welcome, {data.name}
        </p>
      )}
    </div>
  )

  // No boards
  if (data.boards.length === 0) {
    return (
      <div className="p-6">
        {welcomeHeader}
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            No projects have been shared with you yet.
          </p>
        </div>
      </div>
    )
  }

  // Board picker for multiple boards
  if (data.boards.length > 1 && !selectedBoardId) {
    return (
      <div className="p-6">
        {welcomeHeader}
        <h2 className="mb-4 text-lg font-semibold">Select a project</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.boards.map((board) => (
            <Card
              key={board.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedBoardId(board.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{board.name}</CardTitle>
                {board.description && (
                  <CardDescription>{board.description}</CardDescription>
                )}
                <p className="text-xs text-muted-foreground">
                  {board.columns.length} columns
                  {" · "}
                  {board.columns.reduce((acc, col) => acc + col.cards.length, 0)} cards
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Single board view
  const board = data.boards.find((b) => b.id === selectedBoardId)

  if (!board) {
    return (
      <div className="p-6">
        {welcomeHeader}
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {welcomeHeader}

      {data.boards.length > 1 && (
        <button
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedBoardId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </button>
      )}

      <h2 className="mb-4 text-lg font-semibold">{board.name}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="w-72 shrink-0 rounded-lg border bg-muted/50"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              {column.color && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
              )}
              <h3 className="text-sm font-semibold">{column.name}</h3>
              <span className="text-xs text-muted-foreground">
                {column.cards.length}
              </span>
            </div>
            <div className="space-y-2 px-2 py-1">
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  className="cursor-pointer rounded-md border bg-background p-3 space-y-2 transition-all hover:shadow-md"
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <p className="text-sm font-medium">{card.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.labels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                        style={{
                          backgroundColor: label.color,
                          color: "white",
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                    {card.priority !== "NONE" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        <span
                          className={
                            PRIORITY_CONFIG[card.priority].color
                          }
                        >
                          {PRIORITY_CONFIG[card.priority].label}
                        </span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {card.dueDate && (
                      <DueDateBadge date={card.dueDate} className="text-[10px]" iconSize="h-2.5 w-2.5" />
                    )}
                    {card._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {card._count.comments}
                      </span>
                    )}
                    {card._count.attachments > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Paperclip className="h-2.5 w-2.5" />
                        {card._count.attachments}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {column.cards.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No cards
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedCardId && (
        <CustomerCardModal
          cardId={selectedCardId}
          accessCode={params.accessCode}
          contactId={identifiedContact?.contactId ?? undefined}
          open={!!selectedCardId}
          onOpenChange={(open) => {
            if (!open) setSelectedCardId(null)
          }}
        />
      )}
    </div>
  )
}
