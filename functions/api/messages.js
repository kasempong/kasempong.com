export async function onRequest(context) {
  const { request, env } = context;

  const token = env.DASHBOARD_TOKEN;
  if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const kv = env.HERMES_KV;
  if (!kv) {
    return Response.json({ messages: [] });
  }

  const list = await kv.list({ prefix: 'msg:' });
  const entries = await Promise.all(
    list.keys
      .sort((a, b) => b.name.localeCompare(a.name)) // newest first
      .slice(0, 100)
      .map(async ({ name }) => {
        const raw = await kv.get(name);
        try { return JSON.parse(raw); } catch { return null; }
      })
  );

  return Response.json({ messages: entries.filter(Boolean) });
}
