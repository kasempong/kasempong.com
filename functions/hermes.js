const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hermes Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f13;
      color: #e8e8f0;
      min-height: 100vh;
    }

    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 28px;
      border-bottom: 1px solid #1e1e2e;
    }

    header h1 {
      font-size: 1.3rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header .subtitle { font-size: 0.78rem; color: #6b7280; margin-top: 2px; }

    .lock-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: 16px;
    }

    .lock-screen h2 { font-size: 1rem; color: #9ca3af; }

    .lock-screen input {
      padding: 10px 16px;
      background: #1a1a26;
      border: 1px solid #2e2e42;
      border-radius: 8px;
      color: #e8e8f0;
      font-size: 0.95rem;
      width: 280px;
      outline: none;
    }

    .lock-screen input:focus { border-color: #7c3aed; }

    .btn {
      padding: 10px 22px;
      background: #7c3aed;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn:hover { background: #6d28d9; }
    .btn:disabled { background: #3b3b55; cursor: default; }

    .btn-ghost {
      background: transparent;
      border: 1px solid #2e2e42;
      color: #9ca3af;
    }

    .btn-ghost:hover { border-color: #7c3aed; color: #a78bfa; background: transparent; }

    main { padding: 24px 28px; max-width: 900px; }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid #1e1e2e;
      padding-bottom: 0;
    }

    .tab {
      padding: 8px 18px;
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 0.9rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }

    .tab.active { color: #a78bfa; border-bottom-color: #a78bfa; }
    .tab:hover:not(.active) { color: #9ca3af; }

    .panel { display: none; }
    .panel.active { display: block; }

    .card {
      background: #16161f;
      border: 1px solid #1e1e2e;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 12px;
    }

    .card .meta {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 8px;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .badge {
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 999px;
      font-weight: 500;
    }

    .badge-telegram { background: #0e3a5c; color: #38bdf8; }
    .badge-discord { background: #1e1a45; color: #818cf8; }

    .card .user-msg { font-size: 0.9rem; margin-bottom: 8px; }
    .card .bot-reply {
      font-size: 0.85rem;
      color: #9ca3af;
      border-left: 2px solid #2e2e42;
      padding-left: 10px;
      white-space: pre-wrap;
    }

    .rec-card {
      background: #16161f;
      border: 1px solid #1e1e2e;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 12px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }

    .priority-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .priority-high { background: #f87171; }
    .priority-medium { background: #fbbf24; }
    .priority-low { background: #34d399; }

    .rec-card .rec-title { font-size: 0.95rem; font-weight: 500; margin-bottom: 4px; }
    .rec-card .rec-why { font-size: 0.82rem; color: #9ca3af; }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .toolbar h2 { font-size: 0.95rem; color: #9ca3af; }

    .empty {
      text-align: center;
      color: #4b5563;
      padding: 48px 0;
      font-size: 0.9rem;
    }

    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #2e2e42;
      border-top-color: #a78bfa;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .loading { text-align: center; padding: 48px 0; }

    .error { color: #f87171; font-size: 0.85rem; margin-top: 8px; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>Hermes</h1>
    <div class="subtitle">Your personal AI assistant dashboard</div>
  </div>
</header>

<div id="lock" class="lock-screen">
  <h2>Enter your dashboard token</h2>
  <input id="token-input" type="password" placeholder="Token" />
  <div id="lock-error" class="error" style="display:none">Invalid token</div>
  <button class="btn" onclick="unlock()">Unlock</button>
</div>

<main id="main" style="display:none">
  <div class="tabs">
    <button class="tab active" onclick="switchTab('history', this)">Message History</button>
    <button class="tab" onclick="switchTab('recs', this)">Recommendations</button>
  </div>

  <div id="tab-history" class="panel active">
    <div class="toolbar">
      <h2 id="msg-count">Loading…</h2>
      <button class="btn btn-ghost" onclick="loadMessages()">Refresh</button>
    </div>
    <div id="messages-list"></div>
  </div>

  <div id="tab-recs" class="panel">
    <div class="toolbar">
      <h2>Based on your patterns</h2>
      <button class="btn" onclick="loadRecs()">Regenerate</button>
    </div>
    <div id="recs-list"></div>
  </div>
</main>

<script>
  let TOKEN = '';

  function getToken() {
    return localStorage.getItem('hermes_token') || '';
  }

  function saveToken(t) {
    localStorage.setItem('hermes_token', t);
    TOKEN = t;
  }

  async function unlock() {
    const val = document.getElementById('token-input').value.trim();
    const res = await fetch('/api/messages', {
      headers: val ? { Authorization: 'Bearer ' + val } : {},
    });
    if (res.status === 401) {
      document.getElementById('lock-error').style.display = 'block';
      return;
    }
    saveToken(val);
    showDashboard();
    const data = await res.json();
    renderMessages(data.messages);
  }

  function showDashboard() {
    document.getElementById('lock').style.display = 'none';
    document.getElementById('main').style.display = 'block';
  }

  function switchTab(name, btn) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
    if (name === 'recs' && document.getElementById('recs-list').innerHTML === '') {
      loadRecs();
    }
  }

  async function loadMessages() {
    document.getElementById('messages-list').innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    const res = await fetch('/api/messages', {
      headers: TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {},
    });
    const data = await res.json();
    renderMessages(data.messages);
  }

  function renderMessages(messages) {
    const el = document.getElementById('messages-list');
    document.getElementById('msg-count').textContent =
      messages.length === 0 ? 'No messages yet' : messages.length + ' messages';

    if (messages.length === 0) {
      el.innerHTML = '<div class="empty">No messages yet — start chatting with Hermes on Telegram or Discord!</div>';
      return;
    }

    el.innerHTML = messages.map(function(m) {
      const date = new Date(m.ts).toLocaleString();
      const badge = m.source === 'telegram'
        ? '<span class="badge badge-telegram">Telegram</span>'
        : '<span class="badge badge-discord">Discord</span>';
      return '<div class="card"><div class="meta">' + badge + '<span>' + date + '</span></div>'
        + '<div class="user-msg">' + escHtml(m.text) + '</div>'
        + '<div class="bot-reply">' + escHtml(m.reply) + '</div></div>';
    }).join('');
  }

  async function loadRecs() {
    document.getElementById('recs-list').innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    const res = await fetch('/api/recommendations', {
      headers: TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {},
    });
    const data = await res.json();
    renderRecs(data.recommendations, data.note);
  }

  function renderRecs(recs, note) {
    const el = document.getElementById('recs-list');
    if (note) { el.innerHTML = '<div class="empty">' + escHtml(note) + '</div>'; return; }
    if (!recs || recs.length === 0) { el.innerHTML = '<div class="empty">No recommendations yet.</div>'; return; }
    el.innerHTML = recs.map(function(r) {
      const cls = r.priority === 'high' ? 'priority-high' : r.priority === 'low' ? 'priority-low' : 'priority-medium';
      return '<div class="rec-card"><div class="priority-dot ' + cls + '"></div>'
        + '<div><div class="rec-title">' + escHtml(r.title) + '</div>'
        + '<div class="rec-why">' + escHtml(r.why) + '</div></div></div>';
    }).join('');
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  TOKEN = getToken();
  if (TOKEN) {
    fetch('/api/messages', { headers: { Authorization: 'Bearer ' + TOKEN } })
      .then(function(r) {
        if (r.status === 401) { localStorage.removeItem('hermes_token'); TOKEN = ''; return null; }
        showDashboard();
        return r.json();
      })
      .then(function(data) { if (data) renderMessages(data.messages); });
  }

  document.getElementById('token-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') unlock();
  });
</script>
</body>
</html>`;

export async function onRequest() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none';",
    },
  });
}
