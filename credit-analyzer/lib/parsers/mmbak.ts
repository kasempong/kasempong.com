import type { ParsedTransaction } from "./types"

// Money Manager .mmbak files are SQLite databases
// This parser runs client-side using sql.js (SQLite WASM)
// Returns raw transaction data to be sent to the API

export interface MmbakTransaction {
  date: string        // ISO date
  description: string
  amount: number      // positive = expense, negative = income
  currency: string
  category: string
  account: string
}

export async function parseMmbak(buffer: ArrayBuffer): Promise<MmbakTransaction[]> {
  // Dynamically import sql.js to avoid SSR issues
  const initSqlJs = (await import("sql.js")).default
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/sql.js/${file}`,
  })

  const db = new SQL.Database(new Uint8Array(buffer))

  // Discover available tables
  const tableResult = db.exec(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  )
  const tables: string[] = tableResult[0]?.values.map((r: unknown[]) => String(r[0])) ?? []

  let transactions: MmbakTransaction[] = []

  // Money Manager stores transactions in a table — try common names
  const txnTableName = tables.find((t) =>
    /transaction|record|expense|spending/i.test(t)
  ) ?? tables[0]

  if (!txnTableName) {
    db.close()
    return []
  }

  // Get columns for the transactions table
  const colResult = db.exec(`PRAGMA table_info("${txnTableName}")`)
  const columns: string[] = colResult[0]?.values.map((r: unknown[]) => String(r[1])) ?? []

  // Map column names to our fields (Money Manager uses various naming conventions)
  const dateCol = columns.find((c) => /date|time/i.test(c)) ?? "date"
  const amountCol = columns.find((c) => /amount|money|price|value/i.test(c)) ?? "amount"
  const descCol = columns.find((c) => /memo|note|description|remark/i.test(c)) ?? "memo"
  const categoryCol = columns.find((c) => /category|cat/i.test(c)) ?? "category"
  const accountCol = columns.find((c) => /account|acc/i.test(c)) ?? "account"
  const typeCol = columns.find((c) => /type|kind|income|expense/i.test(c))

  const rows = db.exec(
    `SELECT "${dateCol}", "${amountCol}", "${descCol}", "${categoryCol}", "${accountCol}"${typeCol ? `, "${typeCol}"` : ""} FROM "${txnTableName}" ORDER BY "${dateCol}" DESC`
  )

  if (rows[0]) {
    for (const row of rows[0].values) {
      const [rawDate, rawAmount, rawDesc, rawCat, rawAcc, rawType] = row

      const date = parseMMDate(String(rawDate ?? ""))
      if (!date) continue

      let amount = parseFloat(String(rawAmount ?? "0"))
      if (isNaN(amount)) continue

      // Money Manager marks income as negative in expense context
      // If there's a type column indicating income, flip the sign
      if (rawType && /income|รับ|เข้า/i.test(String(rawType))) {
        amount = -Math.abs(amount)
      } else {
        amount = Math.abs(amount)
      }

      transactions.push({
        date,
        description: String(rawDesc ?? "").trim() || String(rawCat ?? "").trim() || "Unknown",
        amount,
        currency: "THB",
        category: String(rawCat ?? "").trim(),
        account: String(rawAcc ?? "").trim(),
      })
    }
  }

  db.close()
  return transactions
}

function parseMMDate(raw: string): string | null {
  if (!raw) return null

  // Unix timestamp (seconds or milliseconds)
  const num = Number(raw)
  if (!isNaN(num) && num > 0) {
    const ms = num > 9999999999 ? num : num * 1000
    const d = new Date(ms)
    if (d.getFullYear() > 1990) {
      return d.toISOString().substring(0, 10)
    }
  }

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10)

  // DD/MM/YYYY
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    let year = parseInt(match[3])
    if (year > 2400) year -= 543
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
  }

  return null
}

// Convert MmbakTransaction[] to ParsedTransaction[] (strips MM-specific fields)
export function toStandardTransactions(rows: MmbakTransaction[]): (ParsedTransaction & { category: string })[] {
  return rows.map((r) => ({
    date: r.date,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    category: r.category,
  }))
}
