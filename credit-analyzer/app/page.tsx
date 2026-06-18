"use client"
import { useEffect, useState } from "react"
import { TrendingUp, AlertTriangle, CreditCard, GitMerge } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonthlyTrends } from "@/components/charts/MonthlyTrends"
import { CategoryDonut } from "@/components/charts/CategoryDonut"
import { formatCurrency, formatDate } from "@/lib/utils"
import { monthlyByCategory } from "@/lib/analysis/patterns"
import { reconciliationSummary } from "@/lib/analysis/reconciliation"
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/db/schema"
import type { Transaction } from "@/lib/db/schema"
import Link from "next/link"

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch("/api/transactions?limit=2000").then((r) => r.json()).then((d) => setTransactions(d.transactions ?? [])).finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!transactions.length) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <CreditCard className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500">No data yet.</p>
      <Link href="/upload" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Upload your first statement</Link>
    </div>
  )
  const thisMonth = new Date().toISOString().substring(0, 7)
  const thisMonthTxns = transactions.filter((t) => t.date.startsWith(thisMonth) && t.amount > 0)
  const thisMonthTotal = thisMonthTxns.reduce((s, t) => s + t.amount, 0)
  const catTotals: Record<string, number> = {}
  for (const t of thisMonthTxns) { const c = t.category ?? "Other"; catTotals[c] = (catTotals[c] ?? 0) + t.amount }
  const topCategory = Object.entries(catTotals).sort(([, a], [, b]) => b - a)[0]
  const anomalies = transactions.filter((t) => t.is_anomalous)
  const recon = reconciliationSummary(transactions)
  const monthlyData = monthlyByCategory(transactions)
  const usedCategories = CATEGORIES.filter((c) => monthlyData.some((m) => (m[c] as number) > 0))
  const allCatTotals: Record<string, number> = {}
  for (const t of transactions) { if (t.amount <= 0) continue; const c = t.category ?? "Other"; allCatTotals[c] = (allCatTotals[c] ?? 0) + t.amount }
  const donutData = Object.entries(allCatTotals).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }))
  const recentAnomalies = transactions.filter((t) => t.is_anomalous).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="This Month" value={formatCurrency(thisMonthTotal)} sub={`${thisMonthTxns.length} transactions`} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} />
        <SummaryCard title="Top Category" value={topCategory?.[0] ?? "—"} sub={topCategory ? formatCurrency(topCategory[1]) : "No data"} icon={<div className="w-5 h-5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[topCategory?.[0] ?? ""] ?? "#94a3b8" }} />} />
        <SummaryCard title="Anomalies" value={String(anomalies.length)} sub="unusual transactions" icon={<AlertTriangle className="w-5 h-5 text-red-400" />} variant={anomalies.length > 0 ? "warning" : "default"} />
        <SummaryCard title="Untracked" value={String(recon.untracked)} sub={`${recon.pct_tracked}% of CC tracked`} icon={<GitMerge className="w-5 h-5 text-yellow-500" />} variant={recon.untracked > 0 ? "warning" : "default"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Monthly Spending by Category</CardTitle></CardHeader><CardContent><MonthlyTrends data={monthlyData} categories={usedCategories as string[]} /></CardContent></Card>
        <Card><CardHeader><CardTitle>All-time Breakdown</CardTitle></CardHeader><CardContent><CategoryDonut data={donutData} /></CardContent></Card>
      </div>
      {recentAnomalies.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Recent Anomalies</CardTitle><Link href="/calendar" className="text-sm text-indigo-600 hover:underline">View calendar</Link></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentAnomalies.map((t) => (
                <div key={t.id} className="flex items-start justify-between py-2 px-3 rounded hover:bg-gray-50 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-800 truncate">{t.vendor_name ?? t.description}</span><Badge variant="danger">Anomaly</Badge></div>
                    {t.anomaly_reason && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.anomaly_reason}</p>}
                  </div>
                  <div className="text-right shrink-0"><div className="text-sm font-semibold text-gray-900">{formatCurrency(t.amount)}</div><div className="text-xs text-gray-500">{formatDate(t.date)}</div></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
function SummaryCard({ title, value, sub, icon, variant = "default" }: { title: string; value: string; sub: string; icon: React.ReactNode; variant?: "default" | "warning" }) {
  return (
    <Card className={variant === "warning" ? "border-yellow-200 bg-yellow-50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500 mt-0.5">{sub}</p></div>{icon}</div>
      </CardContent>
    </Card>
  )
}
