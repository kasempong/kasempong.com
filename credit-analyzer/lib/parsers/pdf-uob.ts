import type { ParsedStatement } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

export function parseUOB(pages: string[]): ParsedStatement {
  const fullText = pages.join("\n")
  const periodMatch = fullText.match(/Statement Period.*?(\d{1,2}\s+\w+\s+\d{4})\s+to\s+(\d{1,2}\s+\w+\s+\d{4})/i)
  let period_start: string | null = null
  let period_end: string | null = null
  if (periodMatch) {
    period_start = parseDateToISO(periodMatch[1])
    period_end = parseDateToISO(periodMatch[2])
  }
  const results: { date: string; description: string; amount: number; currency: string }[] = []
  const txnPattern = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+(.+?)\s+([\d,]+\.\d{2})\s*$/gim
  for (const match of fullText.matchAll(txnPattern)) {
    const date = parseDateToISO(match[1])
    if (!date) continue
    const description = match[2].trim().replace(/\s+/g, " ")
    const amount = parseAmount(match[3])
    if (isNaN(amount) || amount === 0) continue
    if (/payment|thank you|balance|total|minimum/i.test(description)) continue
    results.push({ date, description, amount, currency: "THB" })
  }
  if (results.length === 0) {
    const year = period_end ? period_end.substring(0, 4) : new Date().getFullYear().toString()
    const simplePattern = /(\d{1,2}\s+[A-Za-z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/gim
    for (const match of fullText.matchAll(simplePattern)) {
      const date = parseDateToISO(`${match[1]} ${year}`)
      if (!date) continue
      const description = match[2].trim().replace(/\s+/g, " ")
      const amount = parseAmount(match[3])
      if (isNaN(amount) || amount === 0) continue
      if (/payment|thank you|balance|total|minimum/i.test(description)) continue
      results.push({ date, description, amount, currency: "THB" })
    }
  }
  return { bank: "UOB", period_start, period_end, transactions: results }
}
