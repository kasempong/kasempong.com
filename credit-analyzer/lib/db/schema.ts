export interface Statement {
  id: string
  source_type: "credit_card" | "mmbak"
  bank: string | null
  period_start: string | null
  period_end: string | null
  filename: string
  uploaded_at: string
  processed_at: string | null
}

export interface Transaction {
  id: string
  statement_id: string
  date: string
  description: string
  amount: number
  currency: string
  category: string | null
  vendor_name: string | null
  source: "credit_card" | "tracking_app"
  bank: string | null
  is_reconciled: number
  matched_id: string | null
  is_anomalous: number
  anomaly_reason: string | null
  created_at: string
}

export interface VendorCache {
  pattern: string
  vendor_name: string
  category: string
  researched_at: string
}

export interface Insight {
  id: string
  type: "anomaly" | "missing_record" | "pattern" | "trend"
  title: string
  body: string
  severity: "info" | "warning" | "critical"
  date_start: string | null
  date_end: string | null
  transaction_ids: string
  created_at: string
}

export const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Health & Medical",
  "Entertainment",
  "Bills & Utilities",
  "Travel",
  "Education",
  "Personal Care",
  "Other",
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#f97316",
  Transport: "#3b82f6",
  Shopping: "#a855f7",
  "Health & Medical": "#22c55e",
  Entertainment: "#ec4899",
  "Bills & Utilities": "#64748b",
  Travel: "#06b6d4",
  Education: "#eab308",
  "Personal Care": "#14b8a6",
  Other: "#94a3b8",
}
