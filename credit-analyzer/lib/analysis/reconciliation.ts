import type { Transaction } from "../db/schema"

interface ReconcileFlag { id: string; is_reconciled: number; matched_id: string | null }

export function reconcileTransactions(transactions: Transaction[]): ReconcileFlag[] {
  const creditCard = transactions.filter((t) => t.source === "credit_card" && t.amount > 0)
  const tracking = transactions.filter((t) => t.source === "tracking_app" && t.amount > 0)
  const matched = new Set<string>()
  const flags: ReconcileFlag[] = []
  for (const cc of creditCard) {
    const ccDate = new Date(cc.date).getTime()
    const match = tracking.find((tr) => {
      if (matched.has(tr.id)) return false
      const daysDiff = Math.abs(new Date(tr.date).getTime() - ccDate) / 86400000
      if (daysDiff > 2) return false
      const amtDiff = Math.abs(tr.amount - cc.amount) / cc.amount
      if (amtDiff > 0.05) return false
      return true
    })
    if (match) {
      matched.add(match.id)
      flags.push({ id: cc.id, is_reconciled: 1, matched_id: match.id })
      flags.push({ id: match.id, is_reconciled: 1, matched_id: cc.id })
    } else {
      flags.push({ id: cc.id, is_reconciled: 0, matched_id: null })
    }
  }
  for (const tr of tracking) {
    if (!matched.has(tr.id) && !flags.find((f) => f.id === tr.id)) {
      flags.push({ id: tr.id, is_reconciled: 0, matched_id: null })
    }
  }
  return flags
}

export function reconciliationSummary(transactions: Transaction[]) {
  const ccTotal = transactions.filter((t) => t.source === "credit_card" && t.amount > 0).length
  const tracked = transactions.filter((t) => t.source === "credit_card" && t.is_reconciled === 1).length
  const untracked = ccTotal - tracked
  return { cc_total: ccTotal, tracked, untracked, pct_tracked: ccTotal > 0 ? Math.round((tracked / ccTotal) * 100) : 0 }
}
