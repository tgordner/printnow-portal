"use client"

import { useParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/trpc/client"
import { PRIORITY_CONFIG } from "@/lib/constants"

export default function CustomerBoardPage() {
  const params = useParams<{ accessCode: string }>()
  const { data, isLoading } = api.customer.getByAccessCode.useQuery({
    accessCode: params.accessCode,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold">Invalid Access Code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The access code you entered was not found. Please check and try
            again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Welcome, {data.name}
        </p>
      </div>

      {data.boards.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            No boards have been shared with you yet.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.boards.map((board) => (
            <div key={board.id}>
              <h2 className="mb-4 text-lg font-semibold">{board.name}</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {board.columns.map((column) => (
                  <div
                    key={column.id}
                    className="w-72 shrink-0 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      {column.color && (
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                      )}
                      <h3 className="text-sm font-semibold">{column.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {column.cards.length}
                      </span>
                    </div>
                    <div className="space-y-2 px-2 py-1">
                      {column.cards.map((card) => (
                        <div
                          key={card.id}
                          className="rounded-md border bg-background p-3 space-y-2"
                        >
                          <p className="text-sm font-medium">{card.title}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {card.labels.map((label) => (
                              <Badge
                                key={label.id}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                                style={{
                                  backgroundColor: label.color,
                                  color: "white",
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                            {card.priority !== "NONE" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                <span
                                  className={
                                    PRIORITY_CONFIG[card.priority].color
                                  }
                                >
                                  {PRIORITY_CONFIG[card.priority].label}
                                </span>
                              </Badge>
                            )}
                          </div>
                          {card._count.comments > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {card._count.comments} comment
                              {card._count.comments !== 1 && "s"}
                            </p>
                          )}
                        </div>
                      ))}
                      {column.cards.length === 0 && (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                          No cards
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
