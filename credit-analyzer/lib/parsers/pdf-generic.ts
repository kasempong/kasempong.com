import type { ParsedStatement, ParsedTransaction } from "./types"
import { parseDateToISO, parseAmount } from "./pdf-utils"

// Generic PDF parser — tries common patterns before falling back to AI
export function parseGeneric(pages: string[], bank: string): ParsedStatement {
  const transactions: ParsedTransaction[] = []
  const fullText = pages.join("\n")

  // Try DD/MM/YYYY pattern
  const pattern1 = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2}(?:\s*CR)?)\s*$/gim
  // Try DD/MM/YY pattern
  const pattern2 = /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2}(?:\s*CR)?)\s*$/gim
  // Try DD MMM YYYY
  const pattern3 = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2}(?:\s*CR)?)\s*$/gim

  const patterns = [pattern1, pattern2, pattern3]
  for (const pattern of patterns) {
    for (const match of fullText.matchAll(pattern)) {
      const date = parseDateToISO(match[1])
      if (!date) continue
      const description = match[2].trim().replace(/\s+/g, " ")
      const amount = parseAmount(match[3])
      if (isNaN(amount) || amount === 0) continue
      if (/payment|total|balance|minimum|ยอดรวม|ชำระ/i.test(description)) continue
      transactions.push({ date, description, amount, currency: "THB" })
    }
    if (transactions.length > 0) break
  }

  return { bank, period_start: null, period_end: null, transactions }
}

// Returns raw text for AI extraction when structured parsing yields nothing
export function extractRawText(pages: string[]): string {
  return pages.join("\n---PAGE BREAK---\n").substring(0, 8000)
}

// Parse AI-extracted JSON response into transactions
export function parseAIResponse(aiJson: string): ParsedTransaction[] {
  try {
    const data = JSON.parse(aiJson)
    const rows = Array.isArray(data) ? data : data.transactions ?? []
    return rows
      .map((row: Record<string, unknown>) => {
        const date = parseDateToISO(String(row.date ?? ""))
        const amount = parseFloat(String(row.amount ?? "0").replace(/[,฿$]/g, ""))
        if (!date || isNaN(amount)) return null
        return {
          date,
          description: String(row.description ?? "").trim(),
          amount: Math.abs(amount),
          currency: String(row.currency ?? "THB"),
        }
      })
      .filter(Boolean) as ParsedTransaction[]
  } catch {
    return []
  }
}
