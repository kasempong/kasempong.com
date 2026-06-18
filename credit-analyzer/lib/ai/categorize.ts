import { callOpenRouter } from "./openrouter"
import { CATEGORIES } from "../db/schema"

interface TxnInput { id: string; description: string; amount: number }
interface CategorizeResult { id: string; category: string; vendor_name: string }

const SYSTEM_PROMPT = `You are a Thai credit card transaction categorizer.
Given a list of transaction descriptions (often in English, Thai, or mixed),
classify each into exactly one of these categories:
${CATEGORIES.join(", ")}

Rules:
- Restaurants, cafes, food delivery = "Food & Dining"
- Grab/taxi/BTS/MRT/fuel = "Transport"
- 7-11, department stores, online shops = "Shopping"
- Hospitals, pharmacies, clinics = "Health & Medical"
- Cinema, streaming, games = "Entertainment"
- Phone/internet/electricity/insurance = "Bills & Utilities"
- Airlines, hotels, tourism = "Travel"
- Schools, courses, books = "Education"
- Salons, spa, gym = "Personal Care"
- Everything else = "Other"

Also provide a clean vendor_name (e.g. "Grab Food" not "GRAB*FOOD0012345").

Respond with ONLY valid JSON array:
[{"id":"...","category":"...","vendor_name":"..."}]`

export async function categorizeBatch(transactions: TxnInput[], apiKey: string): Promise<CategorizeResult[]> {
  if (transactions.length === 0) return []
  const results: CategorizeResult[] = []
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50)
    try {
      const response = await callOpenRouter({
        apiKey,
        model: "google/gemini-flash-1.5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(batch.map((t) => ({ id: t.id, description: t.description, amount: t.amount }))) },
        ],
        temperature: 0.1,
        maxTokens: 2048,
        responseFormat: { type: "json_object" },
      })
      const parsed = JSON.parse(response.trim().replace(/^```json\n?|\n?```$/g, ""))
      const arr = Array.isArray(parsed) ? parsed : parsed.transactions ?? []
      results.push(...arr)
    } catch (err) {
      console.error("Categorization batch error:", err)
      for (const t of batch) results.push({ id: t.id, category: "Other", vendor_name: t.description })
    }
  }
  return results
}
