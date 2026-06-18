import { NextRequest } from "next/server"
import { DB } from "@/lib/db/client"
import { categorizeBatch } from "@/lib/ai/categorize"
import { reconcileTransactions } from "@/lib/analysis/reconciliation"
import { detectAnomalies } from "@/lib/analysis/anomaly"
export const runtime = "edge"
export async function POST(request: NextRequest) {
  void request
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"]; OPENROUTER_API_KEY: string }
  if (!env.OPENROUTER_API_KEY) return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 })
  const db = new DB(env.FINANCE_DB)
  const allTxns = await db.getTransactions({ limit: 2000 })
  const uncategorized = allTxns.filter((t) => !t.category)
  if (uncategorized.length > 0) {
    const results = await categorizeBatch(uncategorized.map((t) => ({ id: t.id, description: t.description, amount: t.amount })), env.OPENROUTER_API_KEY)
    for (const r of results) await db.updateTransactionCategory(r.id, r.category, r.vendor_name)
  }
  const reconFlags = reconcileTransactions(allTxns)
  for (const flag of reconFlags) await db.updateTransactionFlags(flag.id, { is_reconciled: flag.is_reconciled, matched_id: flag.matched_id })
  const freshTxns = await db.getTransactions({ limit: 2000 })
  const anomalyFlags = detectAnomalies(freshTxns)
  for (const flag of anomalyFlags) if (flag.is_anomalous) await db.updateTransactionFlags(flag.id, { is_anomalous: flag.is_anomalous, anomaly_reason: flag.anomaly_reason })
  return Response.json({ categorized: uncategorized.length, reconciled: reconFlags.filter((f) => f.is_reconciled).length, anomalies_found: anomalyFlags.filter((f) => f.is_anomalous).length })
}
