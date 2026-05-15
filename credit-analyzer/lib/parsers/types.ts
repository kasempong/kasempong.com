export interface ParsedTransaction {
  date: string       // ISO date YYYY-MM-DD
  description: string
  amount: number     // positive = expense, negative = refund/credit
  currency: string
}

export interface ParsedStatement {
  bank: string
  period_start: string | null
  period_end: string | null
  transactions: ParsedTransaction[]
}
