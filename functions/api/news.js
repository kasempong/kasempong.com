export async function onRequest(context) {
  const key = context.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }

  const messages = [
    {
      role: 'user',
      content:
        'Search for the 3 most recent Thailand air quality or environment news articles from the past 7 days. ' +
        'Return ONLY a valid JSON array — no markdown, no code blocks, no extra text — in this exact format: ' +
        '[{"title":"...","summary":"one sentence","date":"YYYY-MM-DD"}]',
    },
  ];

  const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

  try {
    // Multi-turn loop: handle tool_use rounds (web_search) then get final text
    for (let turn = 0; turn < 5; turn++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          tools,
          messages,
        }),
      });

      if (!res.ok) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });

      const data = await res.json();

      if (data.stop_reason === 'end_turn') {
        const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '[]';
        return new Response(text, { headers: { 'Content-Type': 'application/json' } });
      }

      if (data.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: data.content });
        const results = data.content
          .filter((c) => c.type === 'tool_use')
          .map((c) => ({
            type: 'tool_result',
            tool_use_id: c.id,
            content: JSON.stringify(c.content ?? c.input ?? ''),
          }));
        messages.push({ role: 'user', content: results });
      }
    }
  } catch (_) {
    // fall through
  }

  return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
}
