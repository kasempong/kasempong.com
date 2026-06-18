import { DB } from "@/lib/db/client"
export const runtime = "edge"
export async function GET() {
  const env = process.env as unknown as { FINANCE_DB: InstanceType<typeof DB>["d1"] }
  return Response.json({ statements: await new DB(env.FINANCE_DB).getStatements() })
}
