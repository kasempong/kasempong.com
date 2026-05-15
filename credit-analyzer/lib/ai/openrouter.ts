const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface Tool {
  type: string
  [key: string]: unknown
}

export async function callOpenRouter(opts: {
  apiKey: string
  model: string
  messages: Message[]
  tools?: Tool[]
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" }
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
  }
  if (opts.tools) body.tools = opts.tools
  if (opts.responseFormat) body.response_format = opts.responseFormat

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://kasempong.com/finance",
      "X-Title": "Credit Analyzer",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    choices: Array<{
      message: { content: string | null; tool_calls?: Array<{ function: { arguments: string } }> }
    }>
  }

  const choice = data.choices[0]?.message
  if (!choice) throw new Error("No response from OpenRouter")

  // Handle tool call responses (e.g. web search results embedded in tool_calls)
  if (choice.tool_calls?.length) {
    return choice.tool_calls[0].function.arguments
  }

  return choice.content ?? ""
}
