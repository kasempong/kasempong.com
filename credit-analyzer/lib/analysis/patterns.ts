import type { Transaction } from "../db/schema"

export interface RecurringPattern {
  description: string
  vendor_name: string | null
  category: string | null
  occurrences: number
  avg_amount: number
  months: string[]
  likely_subscription: boolean
}

export function detectPatterns(transactions: Transaction[]): RecurringPattern[] {
  const groups: Record<string, Transaction[]> = {}
  for (const t of transactions) {
    const key = t.description.toUpperCase().replace(/\d{4,}/g, "").replace(/\s+/g, " ").trim().substring(0, 40)
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return Object.values(groups).filter((txns) => txns.length >= 2).map((txns) => {
    const months = [...new Set(txns.map((t) => t.date.substring(0, 7)))].sort()
    const amounts = txns.map((t) => t.amount)
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const amountVariance = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount < 0.05)
    const likelySubscription = amountVariance && months.length >= 2 && isMonthlyPattern(months)
    return { description: txns[0].description, vendor_name: txns[0].vendor_name, category: txns[0].category, occurrences: txns.length, avg_amount: avgAmount, months, likely_subscription: likelySubscription }
  }).sort((a, b) => b.occurrences - a.occurrences)
}

function isMonthlyPattern(months: string[]): boolean {
  if (months.length < 2) return false
  for (let i = 1; i < months.length; i++) {
    const [y1, m1] = months[i - 1].split("-").map(Number)
    const [y2, m2] = months[i].split("-").map(Number)
    if ((y2 - y1) * 12 + (m2 - m1) > 2) return false
  }
  return true
}

export function dailyTotals(transactions: Transaction[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    totals[t.date] = (totals[t.date] ?? 0) + t.amount
  }
  return totals
}

export function monthlyByCategory(transactions: Transaction[]): Array<{ month: string; [category: string]: number | string }> {
  const data: Record<string, Record<string, number>> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const month = t.date.substring(0, 7)
    const cat = t.category ?? "Other"
    if (!data[month]) data[month] = {}
    data[month][cat] = (data[month][cat] ?? 0) + t.amount
  }
  return Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([month, cats]) => ({ month, ...cats }))
}
