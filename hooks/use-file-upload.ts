"use client"

import { useState } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { api } from "@/lib/trpc/client"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface UseFileUploadOptions {
  cardId: string
  boardId: string
}

export function useFileUpload({ cardId, boardId }: UseFileUploadOptions) {
  const utils = api.useUtils()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 1

  const createAttachment = api.attachment.create.useMutation({
    onSuccess: () => {
      utils.card.get.invalidate({ id: cardId })
      utils.board.get.invalidate({ id: boardId })
    },
  })

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return

    const validFiles = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" exceeds 10MB limit`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setUploading(true)
    setProgress(0)

    const supabase = createClient()
    let completed = 0

    for (const file of validFiles) {
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const uniquePrefix = crypto.randomUUID().slice(0, 8)
      const storagePath = `${boardId}/${cardId}/${uniquePrefix}-${sanitized}`

      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file, { upsert: false })

      if (error) {
        toast.error(`Failed to upload "${file.name}"`)
        continue
      }

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(data.path)

      await createAttachment.mutateAsync({
        cardId,
        name: file.name,
        url: urlData.publicUrl,
        storagePath: data.path,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      })

      completed++
      setProgress(completed / validFiles.length)
    }

    setUploading(false)
    setProgress(0)

    if (completed > 0) {
      toast.success(
        completed === 1
          ? "File uploaded"
          : `${completed} files uploaded`
      )
    }
  }

  return { uploadFiles, uploading, progress }
}
