"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/trpc/client"

export default function ProfilePage() {
  const { data: me, isLoading } = api.user.me.useQuery()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <ProfileForm user={me} />
    </div>
  )
}

function ProfileForm({
  user,
}: {
  user: { id: string; name: string | null; email: string }
}) {
  const utils = api.useUtils()
  const [draftName, setDraftName] = useState(user.name ?? "")

  useEffect(() => {
    setDraftName(user.name ?? "")
  }, [user.name])

  const updateUser = api.user.update.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate()
      toast.success("Profile updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const hasChanges = draftName.trim() !== (user.name ?? "")

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input value={user.email} disabled />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Display name</label>
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      {hasChanges && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={updateUser.isPending}
            onClick={() =>
              updateUser.mutate({ name: draftName.trim() || undefined })
            }
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraftName(user.name ?? "")}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
