"use client"

import { useState, useCallback } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropZone } from "@/components/upload/DropZone"
import { UploadStatus, type UploadItem } from "@/components/upload/UploadStatus"
import { generateId } from "@/lib/utils"
import { parseMmbak, toStandardTransactions } from "@/lib/parsers/mmbak"

async function extractPdfPages(file: File): Promise<string[]> {
  // Dynamically import pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    pages.push(text)
  }

  return pages
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<{
    categorized: number
    reconciled: number
    anomalies_found: number
  } | null>(null)

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)))
  }, [])

  const handleFiles = useCallback(
    async (files: File[]) => {
      const newItems: UploadItem[] = files.map((f) => ({
        id: generateId(),
        filename: f.name,
        type: f.name.endsWith(".mmbak") ? "mmbak" : "pdf",
        state: "pending",
      }))
      setItems((prev) => [...prev, ...newItems])

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const item = newItems[i]

        updateItem(item.id, { state: "processing", message: "Parsing file…" })

        try {
          if (file.name.endsWith(".mmbak")) {
            // Parse SQLite client-side
            updateItem(item.id, { message: "Reading Money Manager database…" })
            const buffer = await file.arrayBuffer()
            const rows = await parseMmbak(buffer)
            const transactions = toStandardTransactions(rows)

            if (!transactions.length) {
              updateItem(item.id, { state: "error", message: "No transactions found in .mmbak file" })
              continue
            }

            updateItem(item.id, { message: `Uploading ${transactions.length} transactions…` })
            const res = await fetch("/api/upload/mmbak", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: file.name, transactions }),
            })

            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: res.statusText }))
              updateItem(item.id, { state: "error", message: err.error ?? "Upload failed" })
              continue
            }

            const data = await res.json()
            updateItem(item.id, {
              state: "success",
              transaction_count: data.transaction_count,
              message: `${data.period_start ?? ""} – ${data.period_end ?? ""}`,
            })
          } else {
            // PDF: extract text client-side, send to API
            updateItem(item.id, { message: "Extracting text from PDF…" })
            const pages = await extractPdfPages(file)

            if (!pages.length) {
              updateItem(item.id, { state: "error", message: "Could not read PDF (may be scanned/image-only)" })
              continue
            }

            updateItem(item.id, { message: "Parsing transactions…" })
            const formData = new FormData()
            formData.append("file", file)
            formData.append("pages", JSON.stringify(pages))

            const res = await fetch("/api/upload/pdf", { method: "POST", body: formData })

            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: res.statusText }))
              updateItem(item.id, { state: "error", message: err.error ?? "Upload failed" })
              continue
            }

            const data = await res.json()
            updateItem(item.id, {
              state: "success",
              transaction_count: data.transaction_count,
              bank: data.bank,
              message: `${data.period_start ?? ""} – ${data.period_end ?? ""}`,
            })
          }
        } catch (err) {
          updateItem(item.id, {
            state: "error",
            message: err instanceof Error ? err.message : "Unexpected error",
          })
        }
      }
    },
    [updateItem]
  )

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    setAnalyzeResult(null)
    try {
      const res = await fetch("/api/analyze/categorize", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAnalyzeResult(data)
      }
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const hasSuccessful = items.some((it) => it.state === "success")
  const isProcessing = items.some((it) => it.state === "processing")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Upload Statements</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone onFiles={handleFiles} disabled={isProcessing} />
          <UploadStatus items={items} />
        </CardContent>
      </Card>

      {hasSuccessful && (
        <Card>
          <CardHeader>
            <CardTitle>Analyze Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Run AI categorization, reconcile credit card vs tracking app, and detect spending anomalies.
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing} className="w-full" size="lg">
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Categorize &amp; Analyze
                </>
              )}
            </Button>

            {analyzeResult && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <ResultTile value={analyzeResult.categorized} label="Categorized" />
                <ResultTile value={analyzeResult.reconciled} label="Reconciled" />
                <ResultTile value={analyzeResult.anomalies_found} label="Anomalies" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResultTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-indigo-50 rounded-lg p-3">
      <div className="text-2xl font-bold text-indigo-700">{value}</div>
      <div className="text-xs text-indigo-600 mt-0.5">{label}</div>
    </div>
  )
}
