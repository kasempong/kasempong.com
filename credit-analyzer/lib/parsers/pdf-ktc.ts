import type { ParsedStatement, ParsedTransaction } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

// KTC credit card statement parser
// Typical row format: DD/MM/YY  DESCRIPTION  AMOUNT
export function parseKTC(pages: string[]): ParsedStatement {
  const transactions: ParsedTransaction[] = []
  const fullText = pages.join("\n")

  // Extract statement period
  const periodMatch = fullText.match(/(\d{1,2}[\/\s][A-Za-z฀-๿]+[\/\s]\d{2,4})\s*[-–]\s*(\d{1,2}[\/\s][A-Za-z฀-๿]+[\/\s]\d{2,4})/i)
  let period_start: string | null = null
  let period_end: string | null = null
  if (periodMatch) {
    period_start = parseDateToISO(periodMatch[1].trim())
    period_end = parseDateToISO(periodMatch[2].trim())
  }

  // Match transaction rows: date + description + amount (with optional CR suffix)
  // KTC format: DD/MM/YY  MERCHANT NAME  1,234.56 or 1,234.56CR
  const txnPattern = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2}\s*(?:CR)?)\s*$/gim
  for (const match of fullText.matchAll(txnPattern)) {
    const date = parseDateToISO(match[1])
    if (!date) continue
    const description = match[2].trim().replace(/\s+/g, " ")
    const amount = parseAmount(match[3])
    if (isNaN(amount) || amount === 0) continue
    // Skip summary/total lines
    if (/ยอดรวม|total|balance|payment|ชำระ|minimum/i.test(description)) continue
    transactions.push({ date, description, amount, currency: "THB" })
  }

  return { bank: "KTC", period_start, period_end, transactions }
}
