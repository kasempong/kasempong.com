import { callOpenRouter } from "./openrouter"
import type { Transaction } from "../db/schema"

export interface InsightResult {
  type: "anomaly" | "missing_record" | "pattern" | "trend"
  title: string
  body: string
  severity: "info" | "warning" | "critical"
  date_start?: string
  date_end?: string
  transaction_ids?: string[]
}

export async function generateInsights(transactions: Transaction[], apiKey: string): Promise<InsightResult[]> {
  if (transactions.length === 0) return []
  const summary = buildTransactionSummary(transactions)
  const prompt = `You are a personal finance analyst. Analyze this spending data and identify actionable insights.

${summary}

Identify and return insights as a JSON array. Each insight must have:
- type: "anomaly" | "missing_record" | "pattern" | "trend"
- title: short title (max 60 chars)
- body: 2-3 sentence explanation with specific amounts/dates
- severity: "info" | "warning" | "critical"
- date_start, date_end: YYYY-MM-DD if applicable

Focus on:
1. Months or days with unusually high/low spending
2. Transactions in credit card statements NOT matched in tracking app (possible missing records)
3. Recurring patterns
4. Category trends

Return ONLY the JSON array, no markdown.`

  try {
    const response = await callOpenRouter({
      apiKey,
      model: "anthropic/claude-3.5-sonnet",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 3000,
    })
    const cleaned = response.trim().replace(/^```json\n?|\n?```$/g, "")
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : parsed.insights ?? []
  } catch (err) {
    console.error("Insight generation error:", err)
    return []
  }
}

function buildTransactionSummary(transactions: Transaction[]): string {
  const byMonth: Record<string, { total: number; count: number; byCategory: Record<string, number> }> = {}
  const unreconciled: Transaction[] = []
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const month = t.date.substring(0, 7)
    if (!byMonth[month]) byMonth[month] = { total: 0, count: 0, byCategory: {} }
    byMonth[month].total += t.amount
    byMonth[month].count++
    byMonth[month].byCategory[t.category ?? "Other"] = (byMonth[month].byCategory[t.category ?? "Other"] ?? 0) + t.amount
    if (!t.is_reconciled && t.source === "credit_card") unreconciled.push(t)
  }
  const monthSummaries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => {
    const topCats = Object.entries(data.byCategory).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, amt]) => `${cat}: ฿${amt.toFixed(0)}`).join(", ")
    return `${month}: ฿${data.total.toFixed(0)} total (${data.count} transactions) — ${topCats}`
  })
  const unreconciledSample = unreconciled.slice(0, 20).map((t) => `  ${t.date} ${t.description} ฿${t.amount}`).join("\n")
  return `MONTHLY SPENDING SUMMARY:\n${monthSummaries.join("\n")}\n\nCREDIT CARD TRANSACTIONS NOT IN TRACKING APP (${unreconciled.length} total, first 20):\n${unreconciledSample || "  None"}\n\nTOTAL TRANSACTIONS ANALYZED: ${transactions.length}`
}
