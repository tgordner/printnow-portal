"use client"

import { Calendar } from "lucide-react"
import { format, isPast, isToday, startOfDay } from "date-fns"

import { cn } from "@/lib/utils"

interface DueDateBadgeProps {
  date: Date | string
  formatStr?: string
  className?: string
  iconSize?: string
}

export function DueDateBadge({
  date,
  formatStr = "MMM d",
  className,
  iconSize = "h-3 w-3",
}: DueDateBadgeProps) {
  const d = new Date(date)
  const dueDateIsToday = isToday(d)
  const overdue = !dueDateIsToday && isPast(startOfDay(d))

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "flex items-center gap-1 rounded px-1 text-xs",
        overdue
          ? "text-red-600 bg-red-50 dark:bg-red-950/50"
          : dueDateIsToday
            ? "text-amber-600 bg-amber-50 dark:bg-amber-950/50"
            : "text-muted-foreground",
        className
      )}
    >
      <Calendar className={iconSize} />
      {format(d, formatStr)}
    </span>
  )
}

/** Returns conditional className for due-date-aware buttons/containers. */
export function dueDateStatusClass(date: Date | string) {
  const d = new Date(date)
  const dueDateIsToday = isToday(d)
  const overdue = !dueDateIsToday && isPast(startOfDay(d))
  if (overdue) return "text-red-600 border-red-200 dark:border-red-900"
  if (dueDateIsToday) return "text-amber-600 border-amber-200 dark:border-amber-900"
  return ""
}
