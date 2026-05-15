"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnomalyCalendar } from "@/components/charts/AnomalyCalendar"
import { ReconciliationView } from "@/components/charts/ReconciliationView"
import { dailyTotals } from "@/lib/analysis/patterns"
import { detectAnomalousMonths } from "@/lib/analysis/anomaly"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { Transaction } from "@/lib/db/schema"

export default function CalendarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"calendar" | "reconcile">("calendar")

  useEffect(() => {
    fetch("/api/transactions?limit=2000")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading…</div>
  }

  const totals = dailyTotals(transactions)
  const anomalousDays = new Set(
    transactions.filter((t) => t.is_anomalous).map((t) => t.date)
  )
  const anomalousMonths = detectAnomalousMonths(transactions)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Calendar & Reconciliation</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Spending Calendar
        </TabButton>
        <TabButton active={tab === "reconcile"} onClick={() => setTab("reconcile")}>
          Missing Records
        </TabButton>
      </div>

      {tab === "calendar" && (
        <>
          {/* Anomalous months summary */}
          {anomalousMonths.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Unusual Months Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {anomalousMonths.map((m) => (
                    <div key={m.month} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{m.month}</span>
                      <span className="text-gray-600">{m.reason}</span>
                      <Badge variant={m.total > 0 ? "warning" : "success"}>
                        {formatCurrency(m.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Daily Spending Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <AnomalyCalendar dailyTotals={totals} anomalousDays={anomalousDays} />
            </CardContent>
          </Card>
        </>
      )}

      {tab === "reconcile" && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Card vs Money Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <ReconciliationView transactions={transactions} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  )
}
