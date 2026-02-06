"use client"

import { LogOut, User } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SavedContact {
  contactId: string
  email: string
  name: string
}

export function CustomerUserMenu() {
  const params = useParams<{ accessCode: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<SavedContact | null>(null)

  useEffect(() => {
    if (!params.accessCode) return

    function readContact() {
      try {
        const raw = localStorage.getItem(`portal-contact-${params.accessCode}`)
        if (raw) {
          setContact(JSON.parse(raw))
        } else {
          setContact(null)
        }
      } catch {
        setContact(null)
      }
    }

    readContact()

    function handleChange() {
      readContact()
    }

    window.addEventListener("portal-contact-change", handleChange)
    return () => window.removeEventListener("portal-contact-change", handleChange)
  }, [params.accessCode])

  if (!params.accessCode || !contact) return null

  function handleSignOut() {
    localStorage.removeItem(`portal-contact-${params.accessCode}`)
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push(`/customer/${params.accessCode}/profile`)}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
