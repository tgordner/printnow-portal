import Link from "next/link"

import { CustomerUserMenu } from "@/components/customer/customer-user-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col bg-muted/40">
      <header className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4">
        <Link href="/customer" className="text-lg font-semibold hover:opacity-80">
          PrintNow - Project Status
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <CustomerUserMenu />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
