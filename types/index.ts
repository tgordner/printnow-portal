import type { Board, Card, Column, Comment, Label, User } from "@prisma/client"

export type BoardWithColumns = Board & {
  columns: ColumnWithCards[]
}

export type ColumnWithCards = Column & {
  cards: CardWithRelations[]
}

export type CardWithRelations = Card & {
  assignees: User[]
  labels: Label[]
  comments: Comment[]
  creator: User
}

export type CardSummary = Card & {
  assignees: Pick<User, "id" | "name" | "avatarUrl">[]
  labels: Label[]
  _count: {
    comments: number
  }
}

export type ColumnWithCardSummaries = Column & {
  cards: CardSummary[]
}

export type BoardWithColumnSummaries = Board & {
  columns: ColumnWithCardSummaries[]
}
