"use client"

import { useEffect, useState } from "react"
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

export default function SettingsPage() {
  const { data: org, isLoading: orgLoading } =
    api.organization.getCurrent.useQuery()
  const { data: me } = api.user.me.useQuery()

  if (orgLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Organization not found</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-8">
        {/* Profile */}
        {me && <ProfileSection user={me} />}

        <Separator />

        {/* Organization */}
        <OrgSection
          name={org.name}
          slug={org.slug}
          isAdmin={org.currentUserRole === "OWNER" || org.currentUserRole === "ADMIN"}
        />

        <Separator />

        {/* Members */}
        <MembersSection
          members={org.members}
          currentUserId={me?.id}
          isAdmin={org.currentUserRole === "OWNER" || org.currentUserRole === "ADMIN"}
        />

        {/* Invites (admin only) */}
        {(org.currentUserRole === "OWNER" || org.currentUserRole === "ADMIN") && (
          <>
            <Separator />
            <InviteSection />
          </>
        )}
      </div>
    </div>
  )
}

function ProfileSection({
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
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>
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
    </div>
  )
}

function OrgSection({
  name,
  slug,
  isAdmin,
}: {
  name: string
  slug: string
  isAdmin: boolean
}) {
  const utils = api.useUtils()
  const [draftName, setDraftName] = useState(name)

  useEffect(() => {
    setDraftName(name)
  }, [name])

  const updateOrg = api.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.getCurrent.invalidate()
      toast.success("Organization updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const hasChanges = draftName.trim() !== name

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Organization</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Organization name</label>
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            disabled={!isAdmin}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Slug</label>
          <Input value={slug} disabled />
          <p className="text-xs text-muted-foreground">
            Organization identifier. Cannot be changed.
          </p>
        </div>
        {hasChanges && isAdmin && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!draftName.trim() || updateOrg.isPending}
              onClick={() =>
                updateOrg.mutate({ name: draftName.trim() })
              }
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraftName(name)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MembersSection({
  members,
  currentUserId,
  isAdmin,
}: {
  members: Array<{
    id: string
    role: "OWNER" | "ADMIN" | "MEMBER"
    user: {
      id: string
      name: string | null
      email: string
      avatarUrl: string | null
    }
  }>
  currentUserId?: string
  isAdmin: boolean
}) {
  const utils = api.useUtils()

  const updateRole = api.organization.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.organization.getCurrent.invalidate()
      toast.success("Role updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMember = api.organization.removeMember.useMutation({
    onSuccess: () => {
      utils.organization.getCurrent.invalidate()
      toast.success("Member removed")
    },
    onError: (error) => toast.error(error.message),
  })

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return (email[0] ?? "?").toUpperCase()
  }

  const roleColors = {
    OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    MEMBER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Members</h2>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(member.user.name, member.user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.user.name || member.user.email}
                {member.user.id === currentUserId && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.user.email}
              </p>
            </div>
            {isAdmin && member.user.id !== currentUserId ? (
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    updateRole.mutate({
                      memberId: member.id,
                      role: value as "OWNER" | "ADMIN" | "MEMBER",
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (
                      confirm(
                        `Remove ${member.user.name || member.user.email}?`
                      )
                    ) {
                      removeMember.mutate({ memberId: member.id })
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className={roleColors[member.role]}
              >
                {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function InviteSection() {
  const utils = api.useUtils()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER")

  const { data: invites, isLoading } = api.invite.list.useQuery()

  const createInvite = api.invite.create.useMutation({
    onSuccess: () => {
      utils.invite.list.invalidate()
      setEmail("")
      setRole("MEMBER")
      toast.success("Invite sent")
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteInvite = api.invite.delete.useMutation({
    onSuccess: () => {
      utils.invite.list.invalidate()
      toast.success("Invite cancelled")
    },
    onError: (error) => toast.error(error.message),
  })

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    createInvite.mutate({ email: email.trim(), role })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Invite Members</h2>

      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Select
          value={role}
          onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER")}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={createInvite.isPending}>
          {createInvite.isPending ? "Sending..." : "Invite"}
        </Button>
      </form>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading invites...</p>
      )}

      {invites && invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Pending invites
          </p>
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                  {" \u00b7 "}
                  Invited{" "}
                  {new Date(invite.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => deleteInvite.mutate({ inviteId: invite.id })}
                disabled={deleteInvite.isPending}
              >
                Cancel
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
