"use client"

import { useEffect, useState, useCallback } from "react"
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, GitMerge, BarChart2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Insight } from "@/lib/db/schema"

const TYPE_ICONS: Record<string, React.ReactNode> = {
  anomaly: <AlertTriangle className="w-4 h-4 text-red-500" />,
  missing_record: <GitMerge className="w-4 h-4 text-yellow-500" />,
  pattern: <BarChart2 className="w-4 h-4 text-blue-500" />,
  trend: <TrendingUp className="w-4 h-4 text-indigo-500" />,
}

const SEVERITY_VARIANTS: Record<string, "danger" | "warning" | "default"> = {
  critical: "danger",
  warning: "warning",
  info: "default",
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchInsights = useCallback(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => setInsights(d.insights ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/insights", { method: "POST" })
      const data = await res.json()
      setInsights(data.insights ?? [])
    } finally {
      setGenerating(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
        <Button onClick={handleGenerate} disabled={generating} variant="primary">
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Refresh Insights
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : !insights.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No insights yet.</p>
            <p className="text-sm text-gray-400">Upload statements, run Analyze, then click Refresh Insights.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card className={
      insight.severity === "critical"
        ? "border-red-200 bg-red-50"
        : insight.severity === "warning"
        ? "border-yellow-200 bg-yellow-50"
        : ""
    }>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{TYPE_ICONS[insight.type] ?? <TrendingUp className="w-4 h-4" />}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{insight.title}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={SEVERITY_VARIANTS[insight.severity] ?? "default"}>
                  {insight.severity}
                </Badge>
                <Badge variant="secondary">{insight.type.replace("_", " ")}</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{insight.body}</p>
            {(insight.date_start || insight.date_end) && (
              <p className="text-xs text-gray-400 mt-2">
                {insight.date_start}
                {insight.date_end && insight.date_end !== insight.date_start
                  ? ` – ${insight.date_end}`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
