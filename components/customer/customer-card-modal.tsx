"use client"

import { format } from "date-fns"
import {
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { DueDateBadge } from "@/components/shared/due-date-badge"
import { PRIORITY_CONFIG } from "@/lib/constants"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface CustomerCardModalProps {
  cardId: string
  accessCode: string
  contactId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerCardModal({
  cardId,
  accessCode,
  contactId,
  open,
  onOpenChange,
}: CustomerCardModalProps) {
  const utils = api.useUtils()

  const { data: card, isLoading } = api.customer.getCard.useQuery(
    { accessCode, cardId },
    { enabled: open }
  )

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
              <h2 className="text-xl font-semibold">{card.title}</h2>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Priority */}
                {card.priority !== "NONE" && (
                  <Badge variant="secondary" className={PRIORITY_CONFIG[card.priority].color}>
                    {PRIORITY_CONFIG[card.priority].label}
                  </Badge>
                )}

                {/* Due date */}
                {card.dueDate && (
                  <DueDateBadge date={card.dueDate} formatStr="MMM d, yyyy" className="px-2 py-0.5" />
                )}

                {/* Column name */}
                <span className="text-xs text-muted-foreground">
                  in {card.column.name}
                </span>
              </div>

              {/* Labels */}
              {card.labels.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Labels</label>
                  <div className="flex flex-wrap gap-1.5">
                    {card.labels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        style={{ backgroundColor: label.color, color: "white" }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignees */}
              {card.assignees.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assignees</label>
                  <div className="flex flex-wrap gap-2">
                    {card.assignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="flex items-center gap-2 rounded-full border px-3 py-1"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {assignee.name
                              ? assignee.name.split(" ").map((n) => n[0]).join("").toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {card.description && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <p className="text-sm whitespace-pre-wrap">{card.description}</p>
                  </div>
                </>
              )}

              {/* Attachments */}
              {card.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs font-medium text-muted-foreground">
                        Attachments ({card.attachments.length})
                      </label>
                    </div>
                    <div className="space-y-1">
                      {card.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{attachment.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(0)} KB
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Comments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <label className="text-xs font-medium text-muted-foreground">
                    Comments ({card.comments.length})
                  </label>
                </div>
                <CustomerCommentSection
                  cardId={cardId}
                  accessCode={accessCode}
                  contactId={contactId}
                  comments={card.comments}
                />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

const VISIBLE_COMMENTS = 5

function isLongComment(content: string) {
  return content.length > 280 || content.split("\n").length > 4
}

function CustomerCommentSection({
  cardId,
  accessCode,
  contactId,
  comments,
}: {
  cardId: string
  accessCode: string
  contactId?: string
  comments: Array<{
    id: string
    content: string
    createdAt: Date
    user: { id: string; name: string | null; email: string } | null
    customer: { id: string; name: string } | null
    customerContact: { id: string; name: string } | null
  }>
}) {
  const utils = api.useUtils()
  const [newComment, setNewComment] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showAllComments, setShowAllComments] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  const addComment = api.customer.addComment.useMutation({
    onSuccess: () => {
      setNewComment("")
      utils.customer.getCard.invalidate({ accessCode, cardId })
      utils.customer.getByAccessCode.invalidate({ accessCode })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleSubmit() {
    if (!newComment.trim()) return
    addComment.mutate({
      accessCode,
      cardId,
      content: newComment.trim(),
      contactId,
    })
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
          className="text-xs font-medium text-blue-500 hover:underline"
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
                  className="text-xs text-blue-500 hover:underline"
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
