import { NextRequest } from "next/server"
import { generateId } from "@/lib/utils"
import { detectBank } from "@/lib/parsers/pdf-utils"
import { parseKTC } from "@/lib/parsers/pdf-ktc"
import { parseUOB } from "@/lib/parsers/pdf-uob"
import { parseKBank } from "@/lib/parsers/pdf-kbank"
import { parseGeneric, extractRawText, parseAIResponse } from "@/lib/parsers/pdf-generic"
import { callOpenRouter } from "@/lib/ai/openrouter"
import { DB } from "@/lib/db/client"
import type { Statement, Transaction } from "@/lib/db/schema"

interface Env {
  FINANCE_DB: InstanceType<typeof import("@/lib/db/client").DB>["d1"]
  OPENROUTER_API_KEY: string
}

export const runtime = "edge"

export async function POST(request: NextRequest) {
  const env = (process.env as unknown as Env)

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  // Extract text from PDF pages (text already extracted client-side and sent as JSON)
  const pagesJson = formData.get("pages") as string | null
  if (!pagesJson) {
    return Response.json({ error: "No extracted text provided" }, { status: 400 })
  }

  let pages: string[]
  try {
    pages = JSON.parse(pagesJson)
  } catch {
    return Response.json({ error: "Invalid pages JSON" }, { status: 400 })
  }

  const fullText = pages.join("\n")
  const bank = detectBank(fullText)

  // Parse using bank-specific parser
  let parsed
  if (bank === "KTC") parsed = parseKTC(pages)
  else if (bank === "UOB") parsed = parseUOB(pages)
  else if (bank === "KBANK") parsed = parseKBank(pages)
  else parsed = parseGeneric(pages, bank)

  // If structured parsing yielded nothing, fall back to AI extraction
  if (parsed.transactions.length === 0 && env.OPENROUTER_API_KEY) {
    const rawText = extractRawText(pages)
    const aiPrompt = `Extract all credit card transactions from this bank statement text.
Return a JSON array: [{"date":"YYYY-MM-DD","description":"...","amount":number,"currency":"THB"}]
Only include actual purchases/charges, not payments or balance summaries.

Statement text:
${rawText}`

    try {
      const aiResponse = await callOpenRouter({
        apiKey: env.OPENROUTER_API_KEY,
        model: "google/gemini-flash-1.5",
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.1,
        maxTokens: 3000,
      })
      parsed.transactions = parseAIResponse(aiResponse)
    } catch (err) {
      console.error("AI PDF extraction failed:", err)
    }
  }

  if (parsed.transactions.length === 0) {
    return Response.json(
      { error: "Could not extract transactions from PDF. Please ensure it is a text-based PDF (not scanned image)." },
      { status: 422 }
    )
  }

  // Store in D1
  const db = new DB(env.FINANCE_DB)
  const statementId = generateId()
  const now = new Date().toISOString()

  const statement: Statement = {
    id: statementId,
    source_type: "credit_card",
    bank: parsed.bank,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    filename: file.name,
    uploaded_at: now,
    processed_at: null,
  }
  await db.createStatement(statement)

  const transactions: Transaction[] = parsed.transactions.map((t) => ({
    id: generateId(),
    statement_id: statementId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    category: null,
    vendor_name: null,
    source: "credit_card",
    bank: parsed.bank,
    is_reconciled: 0,
    matched_id: null,
    is_anomalous: 0,
    anomaly_reason: null,
    created_at: now,
  }))

  await db.createTransactions(transactions)
  await db.markStatementProcessed(statementId)

  return Response.json({
    statement_id: statementId,
    bank: parsed.bank,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    transaction_count: transactions.length,
    transactions: transactions.slice(0, 5), // preview
  })
}
