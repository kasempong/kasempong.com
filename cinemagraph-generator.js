const SYSTEM_PROMPT = `You are a cinemagraph animation expert. Analyze the provided image and generate a production-ready cinemagraph prompt.

Rules:
- Study the scene: lighting, mood, depth, textures, and all potentially animatable elements.
- Select EXACTLY ONE element to animate — the one that creates the most natural, seamless ambient loop.
- NEVER reference people, faces, bodies, skin, or human subjects. Focus strictly on environment, nature, objects, and atmosphere.
- Motion must be subtle and ambient: strength 10-20% only. No dramatic movement.
- The loop must be seamless: the final frame must smoothly match the first frame.
- Aspect ratio: if the image is portrait or square, output 9:16; if landscape, output 16:9.
- Duration: always 8 seconds.
- Write the prompt for Kling AI / Runway Gen-3 / Veo 2 / Sora: descriptive, cinematic, precise.

Respond EXACTLY in this format with no extra text before or after:

**Element to animate:** [single specific element]

**Motion style:** [brief motion description, e.g. "slow upward curl and gentle dispersion"]

**Cinemagraph prompt:** [2-4 sentence production prompt -- no mention of people or faces]

**Kling / Runway negative prompt:** [comma-separated list]

**Motion strength setting:** [number followed by %, e.g. "15%"]`;

// ── API ──────────────────────────────────────────────────────────────────────
const API_KEY = 'sk-cp-LBsfSkPlBozXxy_DdAjnuI0aDPWwJcbqjNeAcGbwZ8Lf7g_BrwaPJVEW_3NPQTiVwyThb-raka4WPQLlROzthFykoaHZnfoyzi_6DSyuKetpy8BOfwvZx04';

// ── STATE ────────────────────────────────────────────────────────────────────
let queue = [];
let stepTimerId = null;
let currentStepIndex = 0;
let cardCounter = 0;

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const pasteZone      = document.getElementById('pasteZone');
const pasteLabel     = document.getElementById('pasteLabel');
const queueStrip     = document.getElementById('queueStrip');
const queueActions   = document.getElementById('queueActions');
const queueCount     = document.getElementById('queueCount');
const clearQueueBtn  = document.getElementById('clearQueueBtn');
const generateAllBtn = document.getElementById('generateAllBtn');
const loadingBox     = document.getElementById('loadingBox');
const errorBox       = document.getElementById('errorBox');
const errorMsg       = document.getElementById('errorMsg');
const resultsContainer = document.getElementById('resultsContainer');
const apiRow         = document.getElementById('apiRow');
const apiKeyInput    = document.getElementById('apiKeyInput');
const apiDot         = document.getElementById('apiDot');
const themeBtn       = document.getElementById('themeBtn');
const themeIcon      = document.getElementById('themeIcon');
const settingsBtn    = document.getElementById('settingsBtn');
const historyBadge   = document.getElementById('historyBadge');
const historyEmpty   = document.getElementById('historyEmpty');
const historyList    = document.getElementById('historyList');
const historyClearRow = document.getElementById('historyClearRow');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// ── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    if (btn.dataset.tab === 'history') { renderHistory(); syncFromDrive(); }
  });
});

// ── THEME ────────────────────────────────────────────────────────────────────
let theme = localStorage.getItem('cgTheme') || 'dark';
applyTheme(theme);
themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cgTheme', theme);
  applyTheme(theme);
});
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeIcon.querySelector('use').setAttribute('href', t === 'dark' ? '#ic-sun' : '#ic-moon');
}

// ── API KEY ──────────────────────────────────────────────────────────────────
settingsBtn.addEventListener('click', () => apiRow.classList.toggle('hidden'));

// ── FILE INPUT ───────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', e => {
  Array.from(e.target.files).forEach(f => addToQueue(f));
  fileInput.value = '';
});
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', async e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) {
    Array.from(e.dataTransfer.files).forEach(f => addToQueue(f));
    return;
  }
  const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  if (url && /^https?:\/\//.test(url)) await processUrl(url.trim());
});

// ── PASTE ────────────────────────────────────────────────────────────────────
document.addEventListener('paste', async e => {
  const items = Array.from(e.clipboardData?.items || []);
  for (const item of items) {
    if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) { addToQueue(f); return; } }
  }
  const text = (e.clipboardData?.getData('text/plain') || '').trim();
  if (/^https?:\/\//.test(text)) { await processUrl(text); return; }
  if (navigator.clipboard?.read) {
    try {
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          addToQueue(new File([blob], 'paste.' + (imgType.split('/')[1] || 'png'), { type: imgType }));
          return;
        }
      }
    } catch {}
  }
});

pasteZone.addEventListener('click', async () => {
  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          addToQueue(new File([blob], 'paste.' + (imgType.split('/')[1] || 'png'), { type: imgType }));
          return;
        }
      }
    } catch {}
  }
  pasteZone.classList.add('waiting');
  pasteLabel.innerHTML = 'Ready — now press <kbd>Ctrl+V</kbd>';
  pasteZone.focus();
});
pasteZone.addEventListener('blur', () => {
  pasteZone.classList.remove('waiting');
  pasteLabel.innerHTML = 'Click here then press <kbd>Ctrl+V</kbd> — or click to read clipboard directly';
});
pasteZone.addEventListener('paste', e => {
  e.preventDefault();
  const items = Array.from(e.clipboardData?.items || []);
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) { pasteZone.blur(); addToQueue(f); return; }
    }
  }
});

// ── QUEUE ────────────────────────────────────────────────────────────────────
function guessMime(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp',
           gif:'image/gif', bmp:'image/bmp', avif:'image/avif', tiff:'image/tiff' }[ext] || 'image/jpeg';
}

function addToQueue(file) {
  if (!file) return;
  const mime = file.type || guessMime(file.name);
  if (!mime.startsWith('image/')) { showError('Not an image: ' + (file.name || 'unknown')); return; }
  clearError();
  const item = { file, mime, name: file.name || 'pasted image', size: file.size, status: 'pending', dataUrl: null, base64: null, w: 0, h: 0 };
  queue.push(item);
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    item.dataUrl = dataUrl;
    item.base64  = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const img = new Image();
    img.onload = () => { item.w = img.naturalWidth; item.h = img.naturalHeight; };
    img.src = dataUrl;
    renderQueueStrip();
  };
  reader.readAsDataURL(file);
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  renderQueueStrip();
  if (queue.length === 0) {
    dropZone.classList.remove('hidden');
    pasteZone.classList.remove('hidden');
    clearError();
  }
}

function renderQueueStrip() {
  if (queue.length === 0) {
    queueStrip.classList.add('hidden');
    queueActions.classList.add('hidden');
    dropZone.classList.remove('hidden');
    pasteZone.classList.remove('hidden');
    return;
  }
  dropZone.classList.add('hidden');
  pasteZone.classList.add('hidden');
  queueStrip.classList.remove('hidden');
  queueActions.classList.remove('hidden');

  const pending = queue.filter(i => i.status === 'pending').length;
  const done    = queue.filter(i => i.status === 'done').length;
  queueCount.textContent = `${queue.length} photo${queue.length !== 1 ? 's' : ''} · ${done} done · ${pending} pending`;
  generateAllBtn.disabled = pending === 0;

  queueStrip.innerHTML = '';
  queue.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'q-item' + (item.status !== 'pending' ? ' ' + item.status : '');

    const thumb = document.createElement('img');
    thumb.className = 'q-thumb';
    thumb.src = item.dataUrl || '';
    thumb.alt = item.name;
    div.appendChild(thumb);

    const overlay = document.createElement('div');
    overlay.className = 'q-overlay';
    if (item.status === 'done')   overlay.textContent = '✓';
    if (item.status === 'error')  overlay.textContent = '✗';
    if (item.status === 'active') overlay.textContent = '…';
    div.appendChild(overlay);

    if (item.status === 'pending') {
      const rm = document.createElement('button');
      rm.className = 'q-remove';
      rm.textContent = '×';
      rm.title = 'Remove';
      rm.addEventListener('click', e => { e.stopPropagation(); removeFromQueue(idx); });
      div.appendChild(rm);
    }
    queueStrip.appendChild(div);
  });

  // Add-more button
  const addBtn = document.createElement('button');
  addBtn.className = 'q-add';
  addBtn.innerHTML = '<svg class="icon"><use href="#ic-plus"/></svg><span>Add</span>';
  addBtn.addEventListener('click', () => fileInput.click());
  queueStrip.appendChild(addBtn);
}

clearQueueBtn.addEventListener('click', () => {
  queue = [];
  renderQueueStrip();
  resultsContainer.innerHTML = '';
  clearError();
});

generateAllBtn.addEventListener('click', generateAll);

async function generateAll() {
  const pending = queue.filter(i => i.status === 'pending');
  if (!pending.length) return;
  generateAllBtn.disabled = true;
  clearQueueBtn.disabled  = true;

  for (const item of pending) {
    if (!item.base64) { item.status = 'error'; renderQueueStrip(); continue; }
    item.status = 'active';
    renderQueueStrip();
    try {
      await generateForItem(item);
      item.status = 'done';
    } catch (err) {
      item.status = 'error';
      showError(item.name + ': ' + (err.message || 'Request failed'));
    }
    renderQueueStrip();
  }

  generateAllBtn.disabled = false;
  clearQueueBtn.disabled  = false;
}

// ── URL FETCH ────────────────────────────────────────────────────────────────
async function processUrl(url) {
  startLoadingAnim();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const name = url.split('/').pop().split('?')[0] || 'image.jpg';
    stopLoadingAnim();
    addToQueue(new File([blob], name, { type: blob.type }));
  } catch (err) {
    stopLoadingAnim();
    showError('Could not fetch image: ' + err.message);
  }
}

// ── GENERATE ─────────────────────────────────────────────────────────────────
async function generateForItem(item) {
  clearError();
  startLoadingAnim();
  const key = apiKeyInput.value.trim() || API_KEY;

  let res;
  try {
    res = await fetch('https://api.minimaxi.chat/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'MiniMax-M3',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: 'data:' + item.mime + ';base64,' + item.base64, detail: 'default' } },
            { type: 'text', text: 'Analyze this image and generate a cinemagraph prompt following the exact output format.' }
          ]}
        ]
      })
    });
  } finally {
    stopLoadingAnim();
  }

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error?.message || 'API error ' + res.status);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from API.');

  renderResultCard(text, item);
  await saveHistory({ text, item });
}

// ── PARSE ────────────────────────────────────────────────────────────────────
function parseResults(text) {
  function get(re) { const m = text.match(re); return m ? m[1].trim() : ''; }
  return {
    element:  get(/\*\*Element to animate:\*\*\s*(.+)/)                                    || '—',
    motion:   get(/\*\*Motion style:\*\*\s*(.+)/)                                          || '—',
    prompt:   get(/\*\*Cinemagraph prompt:\*\*\s*([\s\S]+?)(?=\*\*Kling)/)                 || '—',
    negative: get(/\*\*Kling \/ Runway negative prompt:\*\*\s*([\s\S]+?)(?=\*\*Motion strength)/) || '—',
    strength: Math.min(100, Math.max(1, parseInt(get(/\*\*Motion strength setting:\*\*\s*(.+)/)) || 15)),
  };
}

// ── RESULT CARD ───────────────────────────────────────────────────────────────
function renderResultCard(text, item) {
  const p  = parseResults(text);
  const ar = (item.w > 0 && item.w / item.h >= 1.1) ? '16:9' : '9:16';
  const id = 'r' + (++cardCounter) + '_';
  const now = new Date();

  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-card-header">
      <img class="result-card-thumb" src="${escHtml(item.dataUrl)}" alt="">
      <div class="result-card-info">
        <div class="result-card-filename">${escHtml(item.name)}</div>
        <div class="result-card-time">${fmtTime(now)}</div>
      </div>
      <button class="btn btn-ghost btn-sm regen-btn" title="Regenerate">
        <svg class="icon"><use href="#ic-refresh"/></svg>
      </button>
      <svg class="icon result-card-chevron" style="width:16px;height:16px"><use href="#ic-chevron-down"/></svg>
    </div>
    <div class="result-card-body">
      ${section('ic-target', 'Element to Animate', p.element, id+'el')}
      ${section('ic-wave',   'Motion Style',       p.motion,  id+'mo')}
      ${section('ic-star',   'Cinemagraph Prompt', p.prompt,  id+'pr', 'font-size:0.84rem')}
      ${section('ic-ban',    'Negative Prompt',    p.negative,id+'ng', 'font-size:0.82rem;color:var(--text-muted)')}
      <div class="result-section">
        <div class="result-header">
          <div class="result-label"><svg class="icon"><use href="#ic-sliders"/></svg> Settings</div>
        </div>
        <div class="settings-body">
          <span class="settings-label">Motion strength</span>
          <div class="strength-track"><div class="strength-fill" style="width:${p.strength}%"></div></div>
          <span class="tag">${p.strength}%</span>
          <span class="tag">${ar}</span>
          <span class="tag">8 s</span>
        </div>
      </div>
    </div>
  `;

  // collapse toggle
  const header = card.querySelector('.result-card-header');
  header.addEventListener('click', e => {
    if (e.target.closest('.regen-btn')) return;
    card.classList.toggle('collapsed');
  });

  // regen
  card.querySelector('.regen-btn').addEventListener('click', async () => {
    const btn = card.querySelector('.regen-btn');
    btn.disabled = true;
    const origIdx = queue.indexOf(item);
    if (origIdx >= 0) { item.status = 'active'; renderQueueStrip(); }
    try {
      await generateForItem(item);
      if (origIdx >= 0) { item.status = 'done'; renderQueueStrip(); }
    } catch (err) {
      showError(item.name + ': ' + (err.message || 'Failed'));
      if (origIdx >= 0) { item.status = 'error'; renderQueueStrip(); }
    }
    btn.disabled = false;
  });

  // copy buttons (event delegation)
  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const el = card.querySelector('#' + btn.dataset.copy);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
  });

  resultsContainer.prepend(card);
  setTimeout(() => showSparkles(card), 60);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function section(icon, label, content, id, style) {
  return `
    <div class="result-section">
      <div class="result-header">
        <div class="result-label"><svg class="icon"><use href="#${icon}"/></svg> ${label}</div>
        <button class="copy-btn" data-copy="${id}">
          <svg class="icon"><use href="#ic-copy"/></svg> Copy
        </button>
      </div>
      <div class="result-body" id="${id}"${style ? ` style="${style}"` : ''}>${escHtml(content)}</div>
    </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtTime(d) {
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

// ── SPARKLE ──────────────────────────────────────────────────────────────────
function showSparkles(container) {
  const colors = ['#c4a247','#e8d87a','#fffbe0','#ffffff','#b8a0f0','#f0b8f0'];
  const chars  = ['★','✦','✧','·','✨','✶'];
  for (let i = 0; i < 18; i++) {
    const el  = document.createElement('span');
    el.className = 'sparkle-p';
    const dx  = (Math.random() - 0.5) * 130;
    const dy  = -(Math.random() * 90 + 20);
    const dur = (0.65 + Math.random() * 0.55).toFixed(2) + 's';
    el.style.cssText = [
      `left:${5 + Math.random() * 90}%`,
      `top:${5 + Math.random() * 90}%`,
      `color:${colors[i % colors.length]}`,
      `font-size:${6 + Math.random() * 10}px`,
      `animation-delay:${(Math.random() * 0.45).toFixed(2)}s`,
      `--dur:${dur}`,
      `--dx:${dx.toFixed(0)}px`,
      `--dy:${dy.toFixed(0)}px`,
    ].join(';');
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}

// ── LOADING ANIMATION ────────────────────────────────────────────────────────
function startLoadingAnim() {
  loadingBox.classList.remove('hidden');
  currentStepIndex = 0;
  const steps = loadingBox.querySelectorAll('.loading-step');
  steps.forEach(s => s.classList.remove('active', 'done'));
  if (steps[0]) steps[0].classList.add('active');
  clearInterval(stepTimerId);
  stepTimerId = setInterval(() => {
    const steps = loadingBox.querySelectorAll('.loading-step');
    if (currentStepIndex < steps.length - 1) {
      steps[currentStepIndex].classList.remove('active');
      steps[currentStepIndex].classList.add('done');
      currentStepIndex++;
      steps[currentStepIndex].classList.add('active');
    }
  }, 1400);
}

function stopLoadingAnim() {
  clearInterval(stepTimerId);
  stepTimerId = null;
  loadingBox.classList.add('hidden');
  loadingBox.querySelectorAll('.loading-step').forEach(s => s.classList.remove('active', 'done'));
}

// ── HISTORY ──────────────────────────────────────────────────────────────────
const HIST_KEY = 'cgHistory';
const HIST_MAX = 50;

function createSmallThumb(dataUrl, size = 80) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale  = Math.min(size / img.width, size / img.height);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

async function saveHistory({ text, item }) {
  const p     = parseResults(text);
  const thumb = await createSmallThumb(item.dataUrl);
  const record = {
    id: Date.now(),
    ts: new Date().toISOString(),
    filename: item.name,
    thumbnail: thumb,
    element: p.element,
    motion: p.motion,
    prompt: p.prompt,
    negative: p.negative,
    strength: p.strength,
  };
  let h = loadHistoryData();
  h.unshift(record);
  if (h.length > HIST_MAX) h = h.slice(0, HIST_MAX);

  // If storage is full, drop oldest entries until it fits
  const tryStore = arr => {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(arr)); return true; }
    catch { return false; }
  };
  while (h.length > 0 && !tryStore(h)) h.pop();
  updateHistoryBadge();
  syncToDrive();
}

function loadHistoryData() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch { return []; }
}

function updateHistoryBadge() {
  const count = loadHistoryData().length;
  if (count > 0) {
    historyBadge.textContent = count > 99 ? '99+' : count;
    historyBadge.classList.remove('hidden');
  } else {
    historyBadge.classList.add('hidden');
  }
}

function renderHistory() {
  const history = loadHistoryData();
  historyEmpty.classList.toggle('hidden', history.length > 0);
  historyClearRow.classList.toggle('hidden', history.length === 0);
  historyList.innerHTML = '';

  history.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <img class="history-thumb" src="${escHtml(rec.thumbnail || '')}" alt="${escHtml(rec.filename)}">
      <div class="history-content">
        <div class="history-fname">${escHtml(rec.filename)}</div>
        <div class="history-time">${new Date(rec.ts).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})} · ${new Date(rec.ts).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</div>
        <div class="history-preview">${escHtml(rec.prompt)}</div>
      </div>
      <div class="history-btns">
        <button class="btn btn-ghost btn-sm copy-hist-btn">Copy</button>
        <button class="icon-btn del-hist-btn" title="Delete" style="width:30px;height:30px">
          <svg class="icon" style="width:13px;height:13px"><use href="#ic-trash"/></svg>
        </button>
      </div>
    `;

    card.querySelector('.copy-hist-btn').addEventListener('click', () => {
      const full = [
        'Element: ' + rec.element,
        'Motion: ' + rec.motion,
        '',
        rec.prompt,
        '',
        'Negative: ' + rec.negative,
        'Motion strength: ' + rec.strength + '%',
      ].join('\n');
      navigator.clipboard.writeText(full);
      const btn = card.querySelector('.copy-hist-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });

    card.querySelector('.del-hist-btn').addEventListener('click', () => {
      deleteHistoryItem(rec.id);
      renderHistory();
    });

    historyList.appendChild(card);
  });
}

function deleteHistoryItem(id) {
  let h = loadHistoryData();
  h = h.filter(r => r.id !== id);
  localStorage.setItem(HIST_KEY, JSON.stringify(h));
  updateHistoryBadge();
}

clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Clear all history?')) return;
  localStorage.removeItem(HIST_KEY);
  updateHistoryBadge();
  renderHistory();
});

// ── ERROR ────────────────────────────────────────────────────────────────────
function showError(msg) { errorMsg.textContent = msg; errorBox.classList.remove('hidden'); }
function clearError()   { errorBox.classList.add('hidden'); }

// ── GOOGLE DRIVE ─────────────────────────────────────────────────────────────
const GDRIVE_CLIENT_ID = '502374715368-8a844b7nupf9cd847hq95m7mg5l8ls72.apps.googleusercontent.com';
const GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.appdata';
const GDRIVE_FILENAME  = 'cg_history.json';

let driveToken       = null;
let driveFileId      = null;
let driveTokenClient = null;

window.gisLoaded = function() {
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GDRIVE_CLIENT_ID,
    scope: GDRIVE_SCOPE,
    callback: handleDriveToken,
  });
  driveTokenClient.requestAccessToken({ prompt: '' }); // silent attempt
};

async function handleDriveToken(resp) {
  console.log('[Drive] token callback:', JSON.stringify(resp));
  if (resp.error) {
    console.warn('[Drive] error:', resp.error);
    if (resp.error === 'popup_blocked_by_browser') {
      showError('Google Drive: Popup was blocked — allow popups for this site, then try again.');
    } else if (resp.error === 'access_denied') {
      showError('Google Drive: Access denied. If Google showed an "app isn\'t verified" screen, click Advanced → Continue to grant access.');
    } else if (resp.error !== 'user_closed_window') {
      showError('Google Drive: ' + resp.error);
    }
    updateDriveUI('disconnected');
    return;
  }
  if (!resp.access_token) {
    console.warn('[Drive] no access_token in response:', resp);
    showError('Google Drive: No access token received — please try again.');
    updateDriveUI('disconnected');
    return;
  }
  console.log('[Drive] got token, syncing...');
  driveToken = resp.access_token;
  updateDriveUI('syncing');
  await syncFromDrive();
}

document.getElementById('driveBtn').addEventListener('click', () => {
  if (driveToken) {
    google.accounts.oauth2.revoke(driveToken, () => {});
    driveToken = null; driveFileId = null;
    updateDriveUI('disconnected');
  } else {
    if (!driveTokenClient) {
      showError('Google Sign-In is still loading — wait a moment and try again.');
      return;
    }
    driveTokenClient.requestAccessToken({ prompt: 'consent' });
  }
});

async function driveReq(path, options = {}) {
  const url = path.startsWith('http') ? path : 'https://www.googleapis.com' + path;
  const res = await fetch(url, {
    ...options,
    headers: { 'Authorization': 'Bearer ' + driveToken, ...(options.headers || {}) },
  });
  if (res.status === 401) {
    driveToken = null; updateDriveUI('disconnected');
    throw new Error('Drive token expired — please reconnect.');
  }
  return res;
}

async function findDriveFile() {
  const res  = await driveReq(`/drive/v3/files?spaces=appDataFolder&q=name='${GDRIVE_FILENAME}'&fields=files(id)&pageSize=1`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function syncFromDrive() {
  if (!driveToken) return;
  updateDriveUI('syncing');
  try {
    if (!driveFileId) driveFileId = await findDriveFile();
    if (driveFileId) {
      const res  = await driveReq(`/drive/v3/files/${driveFileId}?alt=media`);
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(HIST_KEY, JSON.stringify(data));
        updateHistoryBadge();
        if (!document.getElementById('tab-history').classList.contains('hidden')) renderHistory();
      }
    }
    updateDriveUI('connected');
  } catch { updateDriveUI('error'); }
}

async function syncToDrive() {
  if (!driveToken) return;
  const body = JSON.stringify(loadHistoryData());
  try {
    if (!driveFileId) driveFileId = await findDriveFile();
    if (driveFileId) {
      await driveReq(`/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const b = 'cgbnd';
      const res = await driveReq('/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${b}` },
        body: [
          `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
          JSON.stringify({ name: GDRIVE_FILENAME, parents: ['appDataFolder'] }),
          `\r\n--${b}\r\nContent-Type: application/json\r\n\r\n`,
          body,
          `\r\n--${b}--`,
        ].join(''),
      });
      const data = await res.json();
      driveFileId = data.id;
    }
    updateDriveUI('connected');
  } catch { updateDriveUI('error'); }
}

function updateDriveUI(state) {
  const dot  = document.getElementById('driveDot');
  const text = document.getElementById('driveStatusText');
  const btn  = document.getElementById('driveBtn');
  if (!dot || !text || !btn) return;
  dot.className = 'drive-dot';
  btn.disabled  = false;
  switch (state) {
    case 'connected':
      dot.classList.add('connected');
      text.textContent = 'Synced with Google Drive';
      btn.textContent  = 'Disconnect';
      break;
    case 'syncing':
      dot.classList.add('syncing');
      text.textContent = 'Syncing…';
      btn.textContent  = 'Syncing…';
      btn.disabled = true;
      break;
    case 'error':
      dot.classList.add('error');
      text.textContent = 'Sync error — reconnect?';
      btn.textContent  = 'Reconnect';
      break;
    default:
      text.textContent = 'Connect to sync history across devices';
      btn.textContent  = 'Connect Drive';
  }
}

// ── INIT ─────────────────────────────────────────────────────────────────────
updateHistoryBadge();
