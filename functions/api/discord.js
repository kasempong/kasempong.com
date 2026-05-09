const INTERACTION_TYPE = { PING: 1, APPLICATION_COMMAND: 2 };
const RESPONSE_TYPE = { PONG: 1, CHANNEL_MESSAGE: 4 };

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));
}

async function verifySignature(request, publicKey, rawBody) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(publicKey),
    { name: 'Ed25519' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'Ed25519',
    key,
    hexToBytes(signature),
    new TextEncoder().encode(timestamp + rawBody)
  );
}

async function askHermes(anthropicKey, userText) {
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

  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.[0]?.text ?? null;
}

async function storeMessage(kv, userText, reply) {
  if (!kv) return;
  const ts = Date.now();
  await kv.put(`msg:${ts}`, JSON.stringify({ source: 'discord', text: userText, reply, ts }), {
    expirationTtl: 60 * 60 * 24 * 90,
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  const publicKey = env.DISCORD_PUBLIC_KEY;
  const anthropicKey = env.ANTHROPIC_API_KEY;

  if (!publicKey || !anthropicKey) {
    return new Response('not configured', { status: 500 });
  }

  if (request.method !== 'POST') {
    return new Response('ok');
  }

  const rawBody = await request.text();

  const valid = await verifySignature(request, publicKey, rawBody);
  if (!valid) {
    return new Response('invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === INTERACTION_TYPE.PING) {
    return Response.json({ type: RESPONSE_TYPE.PONG });
  }

  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const userText =
      interaction.data?.options?.find((o) => o.name === 'message')?.value ?? '';

    if (!userText) {
      return Response.json({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: { content: 'Please provide a message.' },
      });
    }

    const reply = await askHermes(anthropicKey, userText);
    await storeMessage(env.HERMES_KV, userText, reply ?? '');

    return Response.json({
      type: RESPONSE_TYPE.CHANNEL_MESSAGE,
      data: { content: reply ?? 'Sorry, I ran into an error. Please try again.' },
    });
  }

  return new Response('unknown interaction type', { status: 400 });
}
