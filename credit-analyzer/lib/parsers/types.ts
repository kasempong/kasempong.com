export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  currency: string
}

export interface ParsedStatement {
  bank: string
  period_start: string | null
  period_end: string | null
  transactions: ParsedTransaction[]
}
