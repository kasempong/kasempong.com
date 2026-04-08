export async function onRequest(context) {
  const key = context.env.IQAIR_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'IQAIR_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://api.airvisual.com/v2/city?city=Bangkok&state=Bangkok&country=Thailand&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
