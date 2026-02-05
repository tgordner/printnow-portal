"use client"

import { useEffect } from "react"

import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes to Supabase Realtime changes for a board.
 *
 * IMPORTANT: For this to work, you must enable Realtime for the relevant tables
 * in your Supabase dashboard:
 *   Database > Replication > Enable the following tables:
 *   - Card
 *   - Column
 *   - Comment
 *   - Label
 *
 * The hook listens for any INSERT/UPDATE/DELETE on these tables and calls
 * `onUpdate` to trigger a refetch.
 */
export function useBoardRealtime(boardId: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Card",
        },
        () => {
          onUpdate()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Column",
          filter: `boardId=eq.${boardId}`,
        },
        () => {
          onUpdate()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Comment",
        },
        () => {
          onUpdate()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Label",
          filter: `boardId=eq.${boardId}`,
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, onUpdate])
}
