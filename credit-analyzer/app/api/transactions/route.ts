import { NextRequest } from "next/server"
import { DB } from "@/lib/db/client"

interface Env {
  FINANCE_DB: InstanceType<typeof import("@/lib/db/client").DB>["d1"]
}

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const env = (process.env as unknown as Env)
  const { searchParams } = new URL(request.url)

  const db = new DB(env.FINANCE_DB)
  const transactions = await db.getTransactions({
    source: searchParams.get("source") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    startDate: searchParams.get("start") ?? undefined,
    endDate: searchParams.get("end") ?? undefined,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 500,
    offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
  })

  return Response.json({ transactions })
}

export async function PATCH(request: NextRequest) {
  const env = (process.env as unknown as Env)
  const body = await request.json() as { id: string; category: string; vendor_name?: string }

  if (!body.id || !body.category) {
    return Response.json({ error: "id and category required" }, { status: 400 })
  }

  const db = new DB(env.FINANCE_DB)
  await db.updateTransactionCategory(body.id, body.category, body.vendor_name)

  return Response.json({ ok: true })
}
