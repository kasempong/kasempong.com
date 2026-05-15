import { callOpenRouter } from "./openrouter"

interface VendorInfo {
  vendor_name: string
  category: string
  description: string
}

export async function researchVendor(
  rawDescription: string,
  apiKey: string
): Promise<VendorInfo> {
  const prompt = `Find what type of business or service this transaction is from: "${rawDescription}"

This may be a merchant code, abbreviation, or partial name on a Thai credit card statement.
Use web search to identify it if needed.

Return ONLY this JSON (no markdown):
{"vendor_name":"<clean name>","category":"<Food & Dining|Transport|Shopping|Health & Medical|Entertainment|Bills & Utilities|Travel|Education|Personal Care|Other>","description":"<1 sentence about this business>"}`

  try {
    const response = await callOpenRouter({
      apiKey,
      model: "anthropic/claude-3.5-haiku",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "openrouter:web_search" }],
      temperature: 0.1,
      maxTokens: 512,
    })

    const cleaned = response.trim().replace(/^```json\n?|\n?```$/g, "")
    const parsed = JSON.parse(cleaned)
    return {
      vendor_name: String(parsed.vendor_name ?? rawDescription),
      category: String(parsed.category ?? "Other"),
      description: String(parsed.description ?? ""),
    }
  } catch {
    return {
      vendor_name: rawDescription,
      category: "Other",
      description: "",
    }
  }
}
