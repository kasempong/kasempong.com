"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, Database } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  maxFiles?: number
  disabled?: boolean
}

export function DropZone({ onFiles, accept = ".pdf,.mmbak", maxFiles = 10, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles)
      const valid = files.filter((f) => f.name.endsWith(".pdf") || f.name.endsWith(".mmbak"))
      if (valid.length) onFiles(valid)
    },
    [disabled, maxFiles, onFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).slice(0, maxFiles)
      if (files.length) onFiles(files)
      e.target.value = ""
    },
    [maxFiles, onFiles]
  )

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 bg-gray-50 hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <Upload className="w-10 h-10 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
          <p className="text-xs text-gray-500 mt-1">Supports .pdf (credit statements) and .mmbak (Money Manager)</p>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <FileText className="w-3.5 h-3.5" /> PDF
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Database className="w-3.5 h-3.5" /> .mmbak
          </span>
        </div>
      </div>
      <input
        type="file"
        className="hidden"
        accept={accept}
        multiple
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  )
}
