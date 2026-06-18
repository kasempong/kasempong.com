import { NextRequest } from "next/server"
import { DB } from "@/lib/db/client"
import { generateInsights } from "@/lib/ai/insights"
import { generateId } from "@/lib/utils"
import type { Insight } from "@/lib/db/schema"
export const runtime = "edge"
export async function GET() {
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"] }
  return Response.json({ insights: await new DB(env.FINANCE_DB).getInsights() })
}
export async function POST(request: NextRequest) {
  void request
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"]; OPENROUTER_API_KEY: string }
  if (!env.OPENROUTER_API_KEY) return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 })
  const db = new DB(env.FINANCE_DB)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().substring(0, 10)
  const transactions = await db.getTransactions({ startDate: ninetyDaysAgo, limit: 1000 })
  const results = await generateInsights(transactions, env.OPENROUTER_API_KEY)
  await db.deleteInsights()
  const now = new Date().toISOString()
  const insights: Insight[] = results.map((r) => ({ id: generateId(), type: r.type, title: r.title, body: r.body, severity: r.severity, date_start: r.date_start ?? null, date_end: r.date_end ?? null, transaction_ids: JSON.stringify(r.transaction_ids ?? []), created_at: now }))
  for (const insight of insights) await db.createInsight(insight)
  return Response.json({ count: insights.length, insights })
}
