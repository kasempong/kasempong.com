export async function onRequest(context) {
  const { request, env } = context;

  const token = env.DASHBOARD_TOKEN;
  if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const kv = env.HERMES_KV;
  const anthropicKey = env.ANTHROPIC_API_KEY;

  if (!kv || !anthropicKey) {
    return Response.json({ recommendations: [] });
  }

  // Fetch recent messages to build personality profile
  const list = await kv.list({ prefix: 'msg:' });
  const entries = await Promise.all(
    list.keys
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 50)
      .map(async ({ name }) => {
        const raw = await kv.get(name);
        try { return JSON.parse(raw); } catch { return null; }
      })
  );

  const messages = entries.filter(Boolean);
  if (messages.length === 0) {
    return Response.json({ recommendations: [], note: 'No messages yet — chat with Hermes first!' });
  }

  const history = messages
    .map((m) => `[${m.source}] ${m.text}`)
    .join('\n');

  const prompt =
    `Based on the following messages and tasks the user gave their AI assistant, ` +
    `analyze their personality, habits, and interests. Then suggest 5 personalized tasks or goals ` +
    `that would genuinely help them based on these patterns. ` +
    `Return ONLY a valid JSON array of objects: [{"title":"...","why":"one sentence","priority":"high|medium|low"}]. ` +
    `No markdown, no code blocks.\n\nUser messages:\n${history}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return Response.json({ recommendations: [] });

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? '[]';
    const recommendations = JSON.parse(text);
    return Response.json({ recommendations });
  } catch {
    return Response.json({ recommendations: [] });
  }
}
