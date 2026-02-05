"use client"

import { format } from "date-fns"
import {
  FileIcon,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useFileUpload } from "@/hooks/use-file-upload"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface Attachment {
  id: string
  name: string
  url: string
  storagePath: string
  size: number
  mimeType: string
  createdAt: Date
}

interface AttachmentsSectionProps {
  cardId: string
  boardId: string
  attachments: Attachment[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

export function AttachmentsSection({
  cardId,
  boardId,
  attachments,
}: AttachmentsSectionProps) {
  const utils = api.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const { uploadFiles, uploading, progress } = useFileUpload({
    cardId,
    boardId,
  })

  const deleteAttachment = api.attachment.delete.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
      toast.success("Attachment deleted")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      uploadFiles(files)
      // Reset input so the same file can be re-selected
      e.target.value = ""
    },
    [uploadFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      uploadFiles(files)
    },
    [uploadFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <label className="text-xs font-medium text-muted-foreground">
            Attachments ({attachments.length})
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-3 w-3" />
          Attach file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload progress */}
      {uploading && (
        <Progress value={progress * 100} className="h-1.5" />
      )}

      {/* Drop zone & attachment list */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-md border border-dashed p-3 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-transparent",
          attachments.length === 0 && !dragOver && "border-muted-foreground/25"
        )}
      >
        {attachments.length === 0 && !uploading ? (
          <p className="text-center text-xs text-muted-foreground py-2">
            Drop files here or click &ldquo;Attach file&rdquo;
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 rounded-md p-1.5 hover:bg-muted/50"
              >
                {/* Thumbnail or icon */}
                {isImage(attachment.mimeType) ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {attachment.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                    {" \u00b7 "}
                    {format(new Date(attachment.createdAt), "MMM d, yyyy")}
                  </p>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (confirm(`Delete "${attachment.name}"?`)) {
                      deleteAttachment.mutate({ id: attachment.id })
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
