"use client"

import { format } from "date-fns"
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { dueDateStatusClass } from "@/components/shared/due-date-badge"
import { AssigneePicker } from "@/components/board/assignee-picker"
import { AttachmentsSection } from "@/components/board/attachments-section"
import { LabelPicker } from "@/components/board/label-picker"
import { useFileUpload } from "@/hooks/use-file-upload"
import { PRIORITY_CONFIG } from "@/lib/constants"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface CardModalProps {
  cardId: string
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CardModal({
  cardId,
  boardId,
  open,
  onOpenChange,
}: CardModalProps) {
  const utils = api.useUtils()

  const { data: card, isLoading } = api.card.get.useQuery(
    { id: cardId },
    { enabled: open }
  )

  const { uploadFiles } = useFileUpload({ cardId, boardId })

  // Clipboard paste handler for images
  useEffect(() => {
    if (!open) return

    function handlePaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items || [])
      const imageItems = items.filter((item) =>
        item.type.startsWith("image/")
      )

      if (imageItems.length === 0) return

      e.preventDefault()

      const files = imageItems
        .map((item) => {
          const file = item.getAsFile()
          if (!file) return null
          const ext = file.type.split("/")[1] || "png"
          const name = `pasted-image-${Date.now()}.${ext}`
          return new File([file], name, { type: file.type })
        })
        .filter((f): f is File => f !== null)

      uploadFiles(files)
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [open, uploadFiles])

  const updateCard = api.card.update.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteCard = api.card.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      utils.board.get.invalidate({ id: boardId })
      toast.success("Card deleted")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-6 sm:max-w-3xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Card Details</SheetTitle>
        </SheetHeader>
        {isLoading || !card ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-6 pb-8">
              {/* Title */}
              <EditableTitle
                value={card.title}
                onSave={(title) =>
                  updateCard.mutate({ id: cardId, title })
                }
              />

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <Select
                    value={card.priority}
                    onValueChange={(value) =>
                      updateCard.mutate({
                        id: cardId,
                        priority: value as "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT",
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className={config.color}>{config.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Due date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        suppressHydrationWarning
                        className={cn(
                          "h-9 w-full justify-start text-left font-normal",
                          !card.dueDate && "text-muted-foreground",
                          card.dueDate && dueDateStatusClass(card.dueDate)
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {card.dueDate
                          ? format(new Date(card.dueDate), "MMM d, yyyy")
                          : "Set date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          card.dueDate
                            ? new Date(card.dueDate)
                            : undefined
                        }
                        onSelect={(date) =>
                          updateCard.mutate({
                            id: cardId,
                            dueDate: date ?? null,
                          })
                        }
                      />
                      {card.dueDate && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() =>
                              updateCard.mutate({
                                id: cardId,
                                dueDate: null,
                              })
                            }
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Labels */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Labels
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {card.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="secondary"
                      style={{ backgroundColor: label.color, color: "white" }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                  <LabelPicker
                    boardId={boardId}
                    cardId={cardId}
                    cardLabels={card.labels}
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Assignees
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {card.assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 rounded-full border px-3 py-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {assignee.name
                            ? assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {assignee.name || assignee.email}
                      </span>
                    </div>
                  ))}
                  <AssigneePicker
                    boardId={boardId}
                    cardId={cardId}
                    cardAssignees={card.assignees}
                  />
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <EditableDescription
                  value={card.description ?? ""}
                  onSave={(description) =>
                    updateCard.mutate({
                      id: cardId,
                      description: description || null,
                    })
                  }
                />
              </div>

              <Separator />

              {/* Attachments */}
              <AttachmentsSection
                cardId={cardId}
                boardId={boardId}
                attachments={card.attachments}
              />

              <Separator />

              {/* Comments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <label className="text-xs font-medium text-muted-foreground">
                    Comments ({card.comments.length})
                  </label>
                </div>
                <CommentSection
                  cardId={cardId}
                  comments={card.comments}
                  boardId={boardId}
                />
              </div>

              <Separator />

              {/* Actions */}
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this card?")) {
                      deleteCard.mutate({ id: cardId })
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete card
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditableTitle({
  value,
  onSave,
}: {
  value: string
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleSave() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSave()
          }
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className="text-xl font-semibold resize-none"
        rows={1}
      />
    )
  }

  return (
    <h2
      className="cursor-pointer text-xl font-semibold hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
      onClick={() => setEditing(true)}
    >
      {value}
    </h2>
  )
}

function EditableDescription({
  value,
  onSave,
}: {
  value: string
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a description..."
          rows={4}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onSave(draft)
              setEditing(false)
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(value)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer rounded border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-muted/50 min-h-[3rem]"
      onClick={() => setEditing(true)}
    >
      {value ? (
        <p className="whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-muted-foreground">Click to add a description...</p>
      )}
    </div>
  )
}

const VISIBLE_COMMENTS = 5

function isLongComment(content: string) {
  return content.length > 280 || content.split("\n").length > 4
}

function CommentSection({
  cardId,
  comments,
  boardId,
}: {
  cardId: string
  comments: Array<{
    id: string
    content: string
    createdAt: Date
    user: { id: string; name: string | null; email: string } | null
    customer?: { id: string; name: string } | null
    customerContact?: { id: string; name: string } | null
  }>
  boardId: string
}) {
  const utils = api.useUtils()
  const [newComment, setNewComment] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showAllComments, setShowAllComments] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  const addComment = api.card.addComment.useMutation({
    onSuccess: () => {
      setNewComment("")
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleSubmit() {
    if (!newComment.trim()) return
    addComment.mutate({ cardId, content: newComment.trim() })
  }

  const hiddenCount = comments.length - VISIBLE_COMMENTS
  const visibleComments =
    showAllComments || comments.length <= VISIBLE_COMMENTS
      ? comments
      : comments.slice(-VISIBLE_COMMENTS)

  function toggleExpanded(id: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {!showAllComments && hiddenCount > 0 && (
        <button
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setShowAllComments(true)}
        >
          {hiddenCount} more comment{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}

      {visibleComments.map((comment) => {
        const isCustomerComment = !comment.user && comment.customer
        const contactName = comment.customerContact?.name
        const displayName = isCustomerComment
          ? contactName || comment.customer!.name
          : comment.user?.name || comment.user?.email || "Unknown"
        const nameForInitials = isCustomerComment
          ? contactName || comment.customer!.name
          : comment.user?.name
        const initials = nameForInitials
          ? nameForInitials.split(" ").map((n) => n[0]).join("").toUpperCase()
          : "?"
        const isExpanded = expandedComments.has(comment.id)
        return (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={cn("text-[10px]", isCustomerComment && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300")}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{displayName}</span>
                {isCustomerComment && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Customer
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap",
                  !isExpanded && isLongComment(comment.content) && "line-clamp-4"
                )}
              >
                {comment.content}
              </p>
              {isLongComment(comment.content) && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => toggleExpanded(comment.id)}
                >
                  {isExpanded ? "See less" : "See more"}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* New comment input */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <Button
          size="icon"
          className="shrink-0 self-end"
          disabled={!newComment.trim() || addComment.isPending}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
