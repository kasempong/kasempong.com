import type { ParsedStatement, ParsedTransaction } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

// UOB credit card statement parser
// UOB typically uses: DD MMM YYYY  DESCRIPTION  AMOUNT
export function parseUOB(pages: string[]): ParsedStatement {
  const transactions: ParsedTransaction[] = []
  const fullText = pages.join("\n")

  const periodMatch = fullText.match(/Statement Period.*?(\d{1,2}\s+\w+\s+\d{4})\s+to\s+(\d{1,2}\s+\w+\s+\d{4})/i)
  let period_start: string | null = null
  let period_end: string | null = null
  if (periodMatch) {
    period_start = parseDateToISO(periodMatch[1])
    period_end = parseDateToISO(periodMatch[2])
  }

  // UOB row: DD MMM YYYY  DD MMM YYYY  DESCRIPTION  AMOUNT
  // Transaction date + posting date pattern
  const txnPattern = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+(.+?)\s+([\d,]+\.\d{2})\s*$/gim
  for (const match of fullText.matchAll(txnPattern)) {
    const date = parseDateToISO(match[1])
    if (!date) continue
    const description = match[2].trim().replace(/\s+/g, " ")
    const amount = parseAmount(match[3])
    if (isNaN(amount) || amount === 0) continue
    if (/payment|thank you|balance|total|minimum/i.test(description)) continue
    transactions.push({ date, description, amount, currency: "THB" })
  }

  // Simpler fallback: DD MMM  DESCRIPTION  AMOUNT
  if (transactions.length === 0) {
    const year = period_end ? period_end.substring(0, 4) : new Date().getFullYear().toString()
    const simplePattern = /(\d{1,2}\s+[A-Za-z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/gim
    for (const match of fullText.matchAll(simplePattern)) {
      const date = parseDateToISO(`${match[1]} ${year}`)
      if (!date) continue
      const description = match[2].trim().replace(/\s+/g, " ")
      const amount = parseAmount(match[3])
      if (isNaN(amount) || amount === 0) continue
      if (/payment|thank you|balance|total|minimum/i.test(description)) continue
      transactions.push({ date, description, amount, currency: "THB" })
    }
  }

  return { bank: "UOB", period_start, period_end, transactions }
}
