"use client"

import { CheckCircle, XCircle, Loader2, FileText, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export type UploadState = "pending" | "processing" | "success" | "error"

export interface UploadItem {
  id: string
  filename: string
  type: "pdf" | "mmbak"
  state: UploadState
  message?: string
  transaction_count?: number
  bank?: string
}

export function UploadStatus({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border text-sm",
            item.state === "success" && "bg-green-50 border-green-200",
            item.state === "error" && "bg-red-50 border-red-200",
            item.state === "processing" && "bg-blue-50 border-blue-200",
            item.state === "pending" && "bg-gray-50 border-gray-200"
          )}
        >
          {item.type === "pdf" ? (
            <FileText className="w-4 h-4 shrink-0 text-gray-500" />
          ) : (
            <Database className="w-4 h-4 shrink-0 text-gray-500" />
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{item.filename}</p>
            {item.message && <p className="text-xs text-gray-500 mt-0.5">{item.message}</p>}
            {item.state === "success" && item.transaction_count !== undefined && (
              <p className="text-xs text-green-700 mt-0.5">
                {item.transaction_count} transactions imported
                {item.bank && item.bank !== "OTHER" ? ` · ${item.bank}` : ""}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {item.state === "processing" && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}
            {item.state === "success" && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {item.state === "error" && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
