import type { Transaction } from "../db/schema"

interface AnomalyFlag {
  id: string
  is_anomalous: number
  anomaly_reason: string | null
}

// Flag transactions that are statistical outliers (Z-score > 2 per category)
export function detectAnomalies(transactions: Transaction[]): AnomalyFlag[] {
  // Group amounts by category
  const byCategory: Record<string, number[]> = {}
  const idToTxn: Record<string, Transaction> = {}

  for (const t of transactions) {
    if (t.amount <= 0) continue
    const cat = t.category ?? "Other"
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(t.amount)
    idToTxn[t.id] = t
  }

  // Compute mean + stdev per category
  const stats: Record<string, { mean: number; std: number }> = {}
  for (const [cat, amounts] of Object.entries(byCategory)) {
    if (amounts.length < 3) continue // Need at least 3 data points
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((sum, x) => sum + (x - mean) ** 2, 0) / amounts.length
    stats[cat] = { mean, std: Math.sqrt(variance) }
  }

  const flags: AnomalyFlag[] = []

  for (const t of transactions) {
    const reasons: string[] = []

    // Z-score anomaly
    const catStats = stats[t.category ?? "Other"]
    if (catStats && catStats.std > 0) {
      const z = (t.amount - catStats.mean) / catStats.std
      if (z > 2.5) {
        reasons.push(
          `Amount ฿${t.amount.toFixed(0)} is ${z.toFixed(1)}σ above average for ${t.category ?? "Other"} (avg ฿${catStats.mean.toFixed(0)})`
        )
      }
    }

    // First-time merchant flag (appears only once)
    const sameDesc = transactions.filter(
      (x) => x.description === t.description && x.id !== t.id
    )
    if (sameDesc.length === 0 && t.amount > 1000) {
      reasons.push(`First-time transaction at this merchant (฿${t.amount.toFixed(0)})`)
    }

    flags.push({
      id: t.id,
      is_anomalous: reasons.length > 0 ? 1 : 0,
      anomaly_reason: reasons.length > 0 ? reasons.join("; ") : null,
    })
  }

  return flags
}

// Detect months with abnormal total spending
export function detectAnomalousMonths(
  transactions: Transaction[]
): Array<{ month: string; total: number; reason: string }> {
  const byMonth: Record<string, number> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const month = t.date.substring(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + t.amount
  }

  const totals = Object.values(byMonth)
  if (totals.length < 3) return []

  const mean = totals.reduce((a, b) => a + b, 0) / totals.length
  const std = Math.sqrt(totals.reduce((s, x) => s + (x - mean) ** 2, 0) / totals.length)

  return Object.entries(byMonth)
    .filter(([, total]) => Math.abs(total - mean) > 1.5 * std)
    .map(([month, total]) => ({
      month,
      total,
      reason:
        total > mean
          ? `฿${total.toFixed(0)} spent — ${((total / mean - 1) * 100).toFixed(0)}% above average`
          : `฿${total.toFixed(0)} spent — ${((1 - total / mean) * 100).toFixed(0)}% below average`,
    }))
}
