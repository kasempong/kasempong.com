import type { ParsedStatement } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

export function parseKTC(pages: string[]): ParsedStatement {
  const transactions: ReturnType<typeof parseAmount> extends number ? { date: string; description: string; amount: number; currency: string }[] : never[] = []
  const fullText = pages.join("\n")
  const periodMatch = fullText.match(/(\d{1,2}[\/\s][A-Za-z฀-๿]+[\/\s]\d{2,4})\s*[-–]\s*(\d{1,2}[\/\s][A-Za-z฀-๿]+[\/\s]\d{2,4})/i)
  let period_start: string | null = null
  let period_end: string | null = null
  if (periodMatch) {
    period_start = parseDateToISO(periodMatch[1].trim())
    period_end = parseDateToISO(periodMatch[2].trim())
  }
  const txnPattern = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2}\s*(?:CR)?)\s*$/gim
  const results: { date: string; description: string; amount: number; currency: string }[] = []
  for (const match of fullText.matchAll(txnPattern)) {
    const date = parseDateToISO(match[1])
    if (!date) continue
    const description = match[2].trim().replace(/\s+/g, " ")
    const amount = parseAmount(match[3])
    if (isNaN(amount) || amount === 0) continue
    if (/ยอดรวม|total|balance|payment|ชำระ|minimum/i.test(description)) continue
    results.push({ date, description, amount, currency: "THB" })
  }
  return { bank: "KTC", period_start, period_end, transactions: results }
}
