import { DB } from "@/lib/db/client"

interface Env {
  FINANCE_DB: InstanceType<typeof import("@/lib/db/client").DB>["d1"]
}

export const runtime = "edge"

export async function GET() {
  const env = (process.env as unknown as Env)
  const db = new DB(env.FINANCE_DB)
  const statements = await db.getStatements()
  return Response.json({ statements })
}
