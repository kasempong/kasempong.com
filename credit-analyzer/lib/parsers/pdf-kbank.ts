import type { ParsedStatement, ParsedTransaction } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

// KBank (Kasikornbank) credit card statement parser
export function parseKBank(pages: string[]): ParsedStatement {
  const transactions: ParsedTransaction[] = []
  const fullText = pages.join("\n")

  // KBank period: วันที่ DD/MM/YYYY ถึง DD/MM/YYYY
  const periodMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*ถึง\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    ?? fullText.match(/(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/)
  let period_start: string | null = null
  let period_end: string | null = null
  if (periodMatch) {
    period_start = parseDateToISO(periodMatch[1])
    period_end = parseDateToISO(periodMatch[2])
  }

  // KBank row: DD/MM/YYYY  DESCRIPTION  AMOUNT
  const txnPattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/gim
  for (const match of fullText.matchAll(txnPattern)) {
    const date = parseDateToISO(match[1])
    if (!date) continue
    const description = match[2].trim().replace(/\s+/g, " ")
    const amount = parseAmount(match[3])
    if (isNaN(amount) || amount === 0) continue
    if (/ยอดรวม|ชำระ|payment|total|balance|minimum|due/i.test(description)) continue
    transactions.push({ date, description, amount, currency: "THB" })
  }

  return { bank: "KBANK", period_start, period_end, transactions }
}
