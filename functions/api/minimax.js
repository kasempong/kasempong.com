export async function onRequestPost(context) {
  const body = await context.request.text();
  const res = await fetch('https://api.minimaxi.chat/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-cp-LBsfSkPlBozXxy_DdAjnuI0aDPWwJcbqjNeAcGbwZ8Lf7g_BrwaPJVEW_3NPQTiVwyThb-raka4WPQLlROzthFykoaHZnfoyzi_6DSyuKetpy8BOfwvZx04'
    },
    body
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
