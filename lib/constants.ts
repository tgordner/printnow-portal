export const COLUMN_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
] as const

export const PRIORITY_CONFIG = {
  NONE: { label: "None", color: "text-slate-400", bg: "bg-slate-100" },
  LOW: { label: "Low", color: "text-blue-500", bg: "bg-blue-100" },
  MEDIUM: { label: "Medium", color: "text-yellow-500", bg: "bg-yellow-100" },
  HIGH: { label: "High", color: "text-orange-500", bg: "bg-orange-100" },
  URGENT: { label: "Urgent", color: "text-red-500", bg: "bg-red-100" },
} as const

export const APP_NAME = "PrintNow Portal"
