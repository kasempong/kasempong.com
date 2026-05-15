"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { CATEGORY_COLORS } from "@/lib/db/schema"

interface MonthlyData {
  month: string
  [category: string]: number | string
}

interface MonthlyTrendsProps {
  data: MonthlyData[]
  categories: string[]
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-")
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString("default", { month: "short", year: "2-digit" })
}

function formatThb(value: number) {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`
}

export function MonthlyTrends({ data, categories }: MonthlyTrendsProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No data yet — upload statements to see trends
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data.map((d) => ({ ...d, month: formatMonth(d.month as string) }))} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatThb(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {categories.map((cat) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={CATEGORY_COLORS[cat] ?? "#94a3b8"}
            radius={categories.indexOf(cat) === categories.length - 1 ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
