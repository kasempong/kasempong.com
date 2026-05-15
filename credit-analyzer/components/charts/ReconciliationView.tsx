"use client"

import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"
import type { Transaction } from "@/lib/db/schema"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface ReconciliationViewProps {
  transactions: Transaction[]
}

export function ReconciliationView({ transactions }: ReconciliationViewProps) {
  const untracked = transactions.filter(
    (t) => t.source === "credit_card" && !t.is_reconciled && t.amount > 0
  )
  const trackingOnly = transactions.filter(
    (t) => t.source === "tracking_app" && !t.is_reconciled && t.amount > 0
  )
  const matched = transactions.filter((t) => t.is_reconciled)

  if (!transactions.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Upload both a credit card PDF and a .mmbak file to see reconciliation
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryTile
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          label="Untracked (credit card only)"
          count={untracked.length}
          color="red"
        />
        <SummaryTile
          icon={<HelpCircle className="w-5 h-5 text-yellow-500" />}
          label="Tracking only (no CC record)"
          count={trackingOnly.length}
          color="yellow"
        />
        <SummaryTile
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Matched"
          count={Math.floor(matched.length / 2)}
          color="green"
        />
      </div>

      {/* Untracked transactions */}
      {untracked.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Credit card charges not in your tracking app ({untracked.length})
          </h4>
          <div className="space-y-1">
            {untracked.slice(0, 50).map((t) => (
              <TransactionRow key={t.id} t={t} badge={<Badge variant="danger">Missing</Badge>} />
            ))}
            {untracked.length > 50 && (
              <p className="text-xs text-gray-500 pl-3">...and {untracked.length - 50} more</p>
            )}
          </div>
        </section>
      )}

      {/* Tracking-only transactions */}
      {trackingOnly.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Tracked expenses not on this credit card ({trackingOnly.length})
          </h4>
          <p className="text-xs text-gray-500 mb-2">May be cash, debit, or a different card.</p>
          <div className="space-y-1">
            {trackingOnly.slice(0, 30).map((t) => (
              <TransactionRow key={t.id} t={t} badge={<Badge variant="warning">Cash/Other</Badge>} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode
  label: string
  count: number
  color: "red" | "yellow" | "green"
}) {
  const bg = { red: "bg-red-50", yellow: "bg-yellow-50", green: "bg-green-50" }[color]
  return (
    <div className={`${bg} rounded-lg p-4 flex items-start gap-3`}>
      {icon}
      <div>
        <div className="text-2xl font-bold text-gray-900">{count}</div>
        <div className="text-xs text-gray-600 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function TransactionRow({ t, badge }: { t: Transaction; badge: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-gray-50 text-sm gap-2">
      <span className="text-gray-500 text-xs w-24 shrink-0">{formatDate(t.date)}</span>
      <span className="flex-1 text-gray-800 truncate">{t.vendor_name ?? t.description}</span>
      <span className="text-gray-700 font-medium shrink-0">{formatCurrency(t.amount)}</span>
      {badge}
    </div>
  )
}
