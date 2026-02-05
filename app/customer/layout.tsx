import Link from "next/link"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-4">
        <Link href="/customer" className="text-lg font-semibold hover:opacity-80">
          PrintNow - Project Status
        </Link>
      </header>
      <main>{children}</main>
    </div>
  )
}
