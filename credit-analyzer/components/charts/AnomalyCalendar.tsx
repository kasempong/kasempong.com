"use client"
import { useMemo, useState } from "react"
import { formatCurrency } from "@/lib/utils"
function getColor(amount: number, max: number): string {
  if (amount === 0) return "#f9fafb"
  const i = Math.min(amount / max, 1)
  if (i < 0.25) return "#dbeafe"
  if (i < 0.5) return "#93c5fd"
  if (i < 0.75) return "#3b82f6"
  return "#1d4ed8"
}
export function AnomalyCalendar({ dailyTotals, anomalousDays = new Set() }: { dailyTotals: Record<string, number>; anomalousDays?: Set<string> }) {
  const [tooltip, setTooltip] = useState<{ date: string; amount: number } | null>(null)
  const months = useMemo(() => {
    const dates = Object.keys(dailyTotals).sort()
    if (!dates.length) return []
    const start = new Date(dates[0]); start.setDate(1)
    const end = new Date(dates[dates.length - 1])
    const result: Array<{ label: string; weeks: Array<Array<{ date: string; amount: number } | null>> }> = []
    while (start <= end) {
      const year = start.getFullYear(), month = start.getMonth()
      const label = start.toLocaleString("default", { month: "long", year: "numeric" })
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const firstDow = new Date(year, month, 1).getDay()
      const cells: Array<{ date: string; amount: number } | null> = []
      for (let i = 0; i < firstDow; i++) cells.push(null)
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
        cells.push({ date, amount: dailyTotals[date] ?? 0 })
      }
      const weeks: typeof result[0]["weeks"] = []
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
      result.push({ label, weeks }); start.setMonth(month + 1)
    }
    return result
  }, [dailyTotals])
  const maxAmount = Math.max(...Object.values(dailyTotals), 1)
  if (!months.length) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No spending data yet</div>
  return (
    <div className="space-y-6">
      {months.map((m) => (
        <div key={m.label}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{m.label}</h4>
          <div className="grid gap-1">
            <div className="grid grid-cols-7 gap-1 mb-1">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="text-center text-xs text-gray-400">{d}</div>)}</div>
            {m.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((cell, di) => !cell ? <div key={di} /> : (
                  <div key={cell.date} className="relative aspect-square rounded cursor-pointer transition-transform hover:scale-110" style={{ backgroundColor: getColor(cell.amount, maxAmount), outline: anomalousDays.has(cell.date) ? "2px solid #ef4444" : undefined }} onMouseEnter={() => setTooltip(cell)} onMouseLeave={() => setTooltip(null)}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 font-medium">{new Date(cell.date + "T12:00:00").getDate()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      {tooltip && tooltip.amount > 0 && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg pointer-events-none z-50 shadow-lg">{tooltip.date}: {formatCurrency(tooltip.amount)}</div>}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Low</span>
        {["#dbeafe","#93c5fd","#3b82f6","#1d4ed8"].map((c) => <div key={c} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />)}
        <span>High</span>
        <span className="ml-4 flex items-center gap-1"><div className="w-4 h-4 rounded border-2 border-red-500" /> Anomaly</span>
      </div>
    </div>
  )
}
