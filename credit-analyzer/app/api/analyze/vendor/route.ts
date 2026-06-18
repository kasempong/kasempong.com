import { NextRequest } from "next/server"
import { DB } from "@/lib/db/client"
import { researchVendor } from "@/lib/ai/vendor-research"
export const runtime = "edge"
export async function POST(request: NextRequest) {
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"]; OPENROUTER_API_KEY: string }
  const body = await request.json() as { description: string; transaction_id?: string }
  if (!body.description) return Response.json({ error: "description required" }, { status: 400 })
  if (!env.OPENROUTER_API_KEY) return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 })
  const db = new DB(env.FINANCE_DB)
  const cached = await db.getVendorCache(body.description)
  if (cached) return Response.json({ ...cached, from_cache: true })
  const info = await researchVendor(body.description, env.OPENROUTER_API_KEY)
  await db.upsertVendorCache({ pattern: body.description, vendor_name: info.vendor_name, category: info.category, researched_at: new Date().toISOString() })
  if (body.transaction_id) await db.updateTransactionCategory(body.transaction_id, info.category, info.vendor_name)
  return Response.json({ ...info, from_cache: false })
}
