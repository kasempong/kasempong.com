async function storeMessage(kv, source, userText, reply) {
  if (!kv) return;
  const ts = Date.now();
  const key = `msg:${ts}`;
  await kv.put(key, JSON.stringify({ source, text: userText, reply, ts }), {
    expirationTtl: 60 * 60 * 24 * 90, // keep 90 days
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  const botToken = env.TELEGRAM_BOT_TOKEN;
  const anthropicKey = env.ANTHROPIC_API_KEY;

  if (!botToken || !anthropicKey) {
    return new Response('not configured', { status: 500 });
  }

  if (request.method !== 'POST') {
    return new Response('ok');
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const message = update.message;
  if (!message?.text || !message?.chat?.id) {
    return new Response('ok');
  }

  const chatId = message.chat.id;
  const userText = message.text;

  let reply = 'Sorry, I ran into an error. Please try again.';
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
        system:
          'You are Hermes, a helpful and friendly assistant. Keep responses concise and conversational.',
        messages: [{ role: 'user', content: userText }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      reply = data.content?.[0]?.text ?? reply;
    }
  } catch (_) {}

  await Promise.all([
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    }),
    storeMessage(env.HERMES_KV, 'telegram', userText, reply),
  ]);

  return new Response('ok');
}
