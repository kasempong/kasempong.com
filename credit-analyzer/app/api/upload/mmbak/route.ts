import { NextRequest } from "next/server"
import { generateId } from "@/lib/utils"
import { DB } from "@/lib/db/client"
import type { Statement, Transaction } from "@/lib/db/schema"
export const runtime = "edge"
export async function POST(request: NextRequest) {
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"] }
  let body: { filename: string; transactions: Array<{ date: string; description: string; amount: number; currency: string; category: string; account: string }> }
  try { body = await request.json() } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }) }
  if (!body.transactions?.length) return Response.json({ error: "No transactions in payload" }, { status: 400 })
  const db = new DB(env.FINANCE_DB)
  const statementId = generateId(), now = new Date().toISOString()
  const dates = body.transactions.map((t) => t.date).sort()
  const statement: Statement = { id: statementId, source_type: "mmbak", bank: null, period_start: dates[0] ?? null, period_end: dates[dates.length - 1] ?? null, filename: body.filename, uploaded_at: now, processed_at: null }
  await db.createStatement(statement)
  const transactions: Transaction[] = body.transactions.map((t) => ({ id: generateId(), statement_id: statementId, date: t.date, description: t.description, amount: t.amount, currency: t.currency ?? "THB", category: t.category || null, vendor_name: null, source: "tracking_app", bank: null, is_reconciled: 0, matched_id: null, is_anomalous: 0, anomaly_reason: null, created_at: now }))
  await db.createTransactions(transactions)
  await db.markStatementProcessed(statementId)
  return Response.json({ statement_id: statementId, period_start: dates[0] ?? null, period_end: dates[dates.length - 1] ?? null, transaction_count: transactions.length })
}
