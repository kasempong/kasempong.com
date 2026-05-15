import type { Statement, Transaction, VendorCache, Insight } from "./schema"

// D1 database binding type
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<D1ExecResult>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  dump(): Promise<ArrayBuffer>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

interface D1ExecResult {
  count: number
  duration: number
}

export class DB {
  constructor(private d1: D1Database) {}

  // Statements
  async createStatement(stmt: Statement): Promise<void> {
    await this.d1
      .prepare(
        `INSERT INTO statements (id, source_type, bank, period_start, period_end, filename, uploaded_at, processed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        stmt.id,
        stmt.source_type,
        stmt.bank,
        stmt.period_start,
        stmt.period_end,
        stmt.filename,
        stmt.uploaded_at,
        stmt.processed_at
      )
      .run()
  }

  async getStatements(): Promise<Statement[]> {
    const result = await this.d1
      .prepare(`SELECT * FROM statements ORDER BY uploaded_at DESC`)
      .all<Statement>()
    return result.results
  }

  async markStatementProcessed(id: string): Promise<void> {
    await this.d1
      .prepare(`UPDATE statements SET processed_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), id)
      .run()
  }

  // Transactions
  async createTransactions(txns: Transaction[]): Promise<void> {
    const stmts = txns.map((t) =>
      this.d1
        .prepare(
          `INSERT OR REPLACE INTO transactions
           (id, statement_id, date, description, amount, currency, category, vendor_name,
            source, bank, is_reconciled, matched_id, is_anomalous, anomaly_reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          t.id,
          t.statement_id,
          t.date,
          t.description,
          t.amount,
          t.currency,
          t.category,
          t.vendor_name,
          t.source,
          t.bank,
          t.is_reconciled,
          t.matched_id,
          t.is_anomalous,
          t.anomaly_reason,
          t.created_at
        )
    )
    // D1 batch max is 100 statements
    for (let i = 0; i < stmts.length; i += 100) {
      await this.d1.batch(stmts.slice(i, i + 100))
    }
  }

  async getTransactions(filters?: {
    source?: string
    category?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<Transaction[]> {
    let query = `SELECT * FROM transactions WHERE 1=1`
    const params: unknown[] = []
    if (filters?.source) {
      query += ` AND source = ?`
      params.push(filters.source)
    }
    if (filters?.category) {
      query += ` AND category = ?`
      params.push(filters.category)
    }
    if (filters?.startDate) {
      query += ` AND date >= ?`
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      query += ` AND date <= ?`
      params.push(filters.endDate)
    }
    query += ` ORDER BY date DESC`
    if (filters?.limit) {
      query += ` LIMIT ?`
      params.push(filters.limit)
    }
    if (filters?.offset) {
      query += ` OFFSET ?`
      params.push(filters.offset)
    }
    const result = await this.d1.prepare(query).bind(...params).all<Transaction>()
    return result.results
  }

  async updateTransactionCategory(id: string, category: string, vendorName?: string): Promise<void> {
    await this.d1
      .prepare(`UPDATE transactions SET category = ?, vendor_name = COALESCE(?, vendor_name) WHERE id = ?`)
      .bind(category, vendorName ?? null, id)
      .run()
  }

  async updateTransactionFlags(id: string, flags: {
    is_reconciled?: number
    matched_id?: string | null
    is_anomalous?: number
    anomaly_reason?: string | null
  }): Promise<void> {
    const sets: string[] = []
    const vals: unknown[] = []
    if (flags.is_reconciled !== undefined) { sets.push("is_reconciled = ?"); vals.push(flags.is_reconciled) }
    if (flags.matched_id !== undefined) { sets.push("matched_id = ?"); vals.push(flags.matched_id) }
    if (flags.is_anomalous !== undefined) { sets.push("is_anomalous = ?"); vals.push(flags.is_anomalous) }
    if (flags.anomaly_reason !== undefined) { sets.push("anomaly_reason = ?"); vals.push(flags.anomaly_reason) }
    if (sets.length === 0) return
    vals.push(id)
    await this.d1.prepare(`UPDATE transactions SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run()
  }

  // Vendor cache
  async getVendorCache(pattern: string): Promise<VendorCache | null> {
    return await this.d1
      .prepare(`SELECT * FROM vendor_cache WHERE pattern = ?`)
      .bind(pattern)
      .first<VendorCache>()
  }

  async upsertVendorCache(entry: VendorCache): Promise<void> {
    await this.d1
      .prepare(
        `INSERT OR REPLACE INTO vendor_cache (pattern, vendor_name, category, researched_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(entry.pattern, entry.vendor_name, entry.category, entry.researched_at)
      .run()
  }

  // Insights
  async createInsight(insight: Insight): Promise<void> {
    await this.d1
      .prepare(
        `INSERT INTO insights (id, type, title, body, severity, date_start, date_end, transaction_ids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        insight.id,
        insight.type,
        insight.title,
        insight.body,
        insight.severity,
        insight.date_start,
        insight.date_end,
        insight.transaction_ids,
        insight.created_at
      )
      .run()
  }

  async getInsights(): Promise<Insight[]> {
    const result = await this.d1
      .prepare(`SELECT * FROM insights ORDER BY created_at DESC LIMIT 50`)
      .all<Insight>()
    return result.results
  }

  async deleteInsights(): Promise<void> {
    await this.d1.prepare(`DELETE FROM insights`).run()
  }
}
