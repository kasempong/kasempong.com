"use client"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { CATEGORY_COLORS } from "@/lib/db/schema"
import { formatCurrency } from "@/lib/utils"
interface CategoryData { name: string; value: number }
export function CategoryDonut({ data }: { data: CategoryData[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No category data yet</div>
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? "#94a3b8"} />)}
          </Pie>
          <Tooltip formatter={(value) => { const v = Number(value); return [`${formatCurrency(v)} (${((v / total) * 100).toFixed(1)}%)`, ""] }} />
          <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs text-gray-500">Total</span>
        <span className="text-lg font-bold text-gray-800">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
