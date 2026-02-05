import { createClient } from "@supabase/supabase-js"

/**
 * Deletes files from Supabase Storage (fire-and-forget).
 * Uses the service role key for server-side access.
 */
export function deleteStorageFiles(storagePaths: string[]) {
  if (storagePaths.length === 0) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  supabase.storage
    .from("attachments")
    .remove(storagePaths)
    .catch(() => {})
}
