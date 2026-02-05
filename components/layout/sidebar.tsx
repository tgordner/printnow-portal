"use client"

import { LayoutDashboard, Settings, Users, KanbanSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const navigation = [
  { name: "Boards", href: "/boards", icon: KanbanSquare },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({ mobile, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "w-64 shrink-0 border-r bg-sidebar",
        !mobile && "hidden lg:block"
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/boards"
          className="flex items-center gap-2"
          onClick={onNavigate}
        >
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">PrintNow Portal</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
