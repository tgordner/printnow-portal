"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/trpc/client"

interface SavedContact {
  contactId: string
  email: string
  name: string
}

function loadSavedContact(accessCode: string): SavedContact | null {
  try {
    const raw = localStorage.getItem(`portal-contact-${accessCode}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function CustomerProfilePage() {
  const params = useParams<{ accessCode: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<SavedContact | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = loadSavedContact(params.accessCode)
    if (!saved) {
      router.replace(`/customer/${params.accessCode}`)
      return
    }
    setContact(saved)
    setLoaded(true)
  }, [params.accessCode, router])

  if (!loaded || !contact) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <ProfileForm
        accessCode={params.accessCode}
        contact={contact}
        onUpdate={(updated) => setContact(updated)}
      />
    </div>
  )
}

function ProfileForm({
  accessCode,
  contact,
  onUpdate,
}: {
  accessCode: string
  contact: SavedContact
  onUpdate: (contact: SavedContact) => void
}) {
  const [draftName, setDraftName] = useState(contact.name)

  useEffect(() => {
    setDraftName(contact.name)
  }, [contact.name])

  const updateProfile = api.customer.updateContactProfile.useMutation({
    onSuccess: (_data, variables) => {
      const updated = { ...contact, name: variables.name }
      localStorage.setItem(`portal-contact-${accessCode}`, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent("portal-contact-change"))
      onUpdate(updated)
      toast.success("Profile updated")
    },
    onError: (error) => toast.error(error.message),
  })

  const hasChanges = draftName.trim() !== contact.name

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input value={contact.email} disabled />
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
            disabled={!draftName.trim() || updateProfile.isPending}
            onClick={() =>
              updateProfile.mutate({
                accessCode,
                contactId: contact.contactId,
                name: draftName.trim(),
              })
            }
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraftName(contact.name)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
