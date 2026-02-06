import Link from "next/link"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col bg-muted/40">
      <header className="shrink-0 border-b bg-background px-6 py-4">
        <Link href="/customer" className="text-lg font-semibold hover:opacity-80">
          PrintNow - Project Status
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
