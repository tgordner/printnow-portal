"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <CustomerPortalForm />
    </Suspense>
  )
}

function CustomerPortalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get("code") ?? "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Please enter an access code")
      return
    }
    setError("")
    router.push(`/customer/${trimmed}`)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold">Customer Portal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your access code to view your project status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError("")
            }}
            placeholder="Enter access code"
            className="text-center font-mono text-lg tracking-widest"
            maxLength={8}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            View Project
          </Button>
        </form>
      </div>
    </div>
  )
}
