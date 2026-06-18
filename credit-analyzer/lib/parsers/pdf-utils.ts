export function parseDateToISO(dateStr: string): string | null {
  const thaiMonths: Record<string, number> = {
    "ม.ค": 1, "ก.พ": 2, "มี.ค": 3, "เม.ย": 4, "พ.ค": 5, "มิ.ย": 6,
    "ก.ค": 7, "ส.ค": 8, "ก.ย": 9, "ต.ค": 10, "พ.ย": 11, "ธ.ค": 12,
    "มค": 1, "กพ": 2, "มีค": 3, "เมย": 4, "พค": 5, "มิย": 6,
    "กค": 7, "สค": 8, "กย": 9, "ตค": 10, "พย": 11, "ธค": 12,
  }
  const engMonths: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }

  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    let year = parseInt(slashMatch[3])
    if (year < 100) year += year > 50 ? 1900 : 2000
    if (year > 2400) year -= 543
    return `${year}-${String(parseInt(slashMatch[2])).padStart(2, "0")}-${String(parseInt(slashMatch[1])).padStart(2, "0")}`
  }

  const engMatch = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/)
  if (engMatch) {
    const month = engMonths[engMatch[2].toLowerCase()]
    if (month) {
      let year = parseInt(engMatch[3])
      if (year < 100) year += year > 50 ? 1900 : 2000
      return `${year}-${String(month).padStart(2, "0")}-${String(parseInt(engMatch[1])).padStart(2, "0")}`
    }
  }

  return null
}

export function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[,\s฿$]/g, "").replace(/CR$|cr$/i, "")
  const isCr = /CR$/i.test(amountStr)
  const num = parseFloat(cleaned)
  return isCr ? -Math.abs(num) : Math.abs(num)
}

export function detectBank(text: string): string {
  const upper = text.toUpperCase()
  if (upper.includes("KTC") || upper.includes("KRUNGTHAI CARD") || text.includes("บัตรกรุงไทย")) return "KTC"
  if (upper.includes("UOB") || text.includes("ยูโอบี")) return "UOB"
  if (upper.includes("KASIKORNBANK") || upper.includes("KBANK") || text.includes("กสิกรไทย")) return "KBANK"
  if (upper.includes("SCB") || text.includes("ไทยพาณิชย์")) return "SCB"
  if (upper.includes("BANGKOK BANK") || upper.includes("BBL")) return "BBL"
  if (upper.includes("KRUNGSRI") || upper.includes("BAY")) return "KRUNGSRI"
  if (upper.includes("CITI") || upper.includes("CITIBANK")) return "CITI"
  return "OTHER"
}
