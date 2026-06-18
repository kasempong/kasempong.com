"use client"
import { useEffect, useState, useCallback } from "react"
import { Search, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/db/schema"
import type { Transaction } from "@/lib/db/schema"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [researchingId, setResearchingId] = useState<string | null>(null)

  const fetchTransactions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "500" })
    if (sourceFilter) params.set("source", sourceFilter)
    if (categoryFilter) params.set("category", categoryFilter)
    fetch(`/api/transactions?${params}`).then((r) => r.json()).then((d) => setTransactions(d.transactions ?? [])).finally(() => setLoading(false))
  }, [sourceFilter, categoryFilter])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = transactions.filter((t) => !search || [t.description, t.vendor_name ?? "", t.category ?? ""].some((s) => s.toLowerCase().includes(search.toLowerCase())))
  const totalSpend = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  const handleCategoryChange = useCallback(async (id: string, category: string) => {
    await fetch("/api/transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, category }) })
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)))
  }, [])

  const handleResearchVendor = useCallback(async (t: Transaction) => {
    setResearchingId(t.id)
    try {
      const res = await fetch("/api/analyze/vendor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: t.description, transaction_id: t.id }) })
      const data = await res.json()
      setTransactions((prev) => prev.map((tx) => tx.id === t.id ? { ...tx, vendor_name: data.vendor_name, category: data.category } : tx))
    } finally { setResearchingId(null) }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <span className="text-sm text-gray-500">{filtered.length} transactions · {formatCurrency(totalSpend)}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All sources</option><option value="credit_card">Credit Card</option><option value="tracking_app">Money Manager</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : !filtered.length ? <div className="text-center py-12 text-gray-400">No transactions found</div> : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Date","Description","Category","Source","Amount","Status",""].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3"><div className="text-gray-900 font-medium">{t.vendor_name ?? t.description}</div>{t.vendor_name && t.vendor_name !== t.description && <div className="text-xs text-gray-400 truncate max-w-xs">{t.description}</div>}</td>
                    <td className="px-4 py-3">
                      <select value={t.category ?? ""} onChange={(e) => handleCategoryChange(t.id, e.target.value)} className="text-xs px-2 py-1 rounded-full border-0 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer" style={{ backgroundColor: t.category ? `${CATEGORY_COLORS[t.category]}20` : "#f3f4f6", color: t.category ? CATEGORY_COLORS[t.category] : "#6b7280" }}>
                        <option value="">Uncategorized</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><Badge variant={t.source === "credit_card" ? "default" : "secondary"}>{t.source === "credit_card" ? "Credit Card" : "Money Manager"}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{t.amount < 0 ? <span className="text-green-600">{formatCurrency(t.amount)}</span> : formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1">{t.is_anomalous ? <Badge variant="danger">Anomaly</Badge> : null}{t.is_reconciled ? <Badge variant="success">Matched</Badge> : null}</div></td>
                    <td className="px-4 py-3">{!t.vendor_name && t.source === "credit_card" && <button onClick={() => handleResearchVendor(t)} disabled={researchingId === t.id} className="text-gray-400 hover:text-indigo-600 disabled:opacity-50" title="Research vendor"><Globe className={`w-4 h-4 ${researchingId === t.id ? "animate-pulse" : ""}`} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
