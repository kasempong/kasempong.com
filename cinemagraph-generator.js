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

let imageBase64 = null;
let imageMime   = null;
let imageW = 0, imageH = 0;

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const imageCard     = document.getElementById('imageCard');
const imageThumb    = document.getElementById('imageThumb');
const imgFilename   = document.getElementById('imgFilename');
const imgMeta       = document.getElementById('imgMeta');
const loadingBox    = document.getElementById('loadingBox');
const loadingMsg    = document.getElementById('loadingMsg');
const errorBox      = document.getElementById('errorBox');
const errorMsg      = document.getElementById('errorMsg');
const results       = document.getElementById('results');
const analyzeBtn    = document.getElementById('analyzeBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const newImageBtn   = document.getElementById('newImageBtn');
const apiRow        = document.querySelector('.api-row');
const themeBtn      = document.getElementById('themeBtn');
const themeIcon     = document.getElementById('themeIcon');
const settingsBtn   = document.getElementById('settingsBtn');
const pasteZone     = document.getElementById('pasteZone');
const pasteLabel    = document.getElementById('pasteLabel');

// Key is handled server-side via /api/minimax proxy
apiRow.classList.add('hidden');
settingsBtn.addEventListener('click', () => apiRow.classList.toggle('hidden'));

// Theme
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

// Drop zone click
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', async e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) { loadFile(e.dataTransfer.files[0]); return; }
  const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  if (url && /^https?:\/\//.test(url)) await processUrl(url.trim());
});

// Paste
document.addEventListener('paste', async e => {
  const items = Array.from(e.clipboardData?.items || []);
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) { loadFile(file); return; }
    }
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
          loadFile(new File([blob], 'paste.' + (imgType.split('/')[1] || 'png'), { type: imgType }));
          return;
        }
      }
    } catch(err) {}
  }
});

// Paste zone
pasteZone.addEventListener('click', async () => {
  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          loadFile(new File([blob], 'paste.' + (imgType.split('/')[1] || 'png'), { type: imgType }));
          return;
        }
      }
    } catch(err) {}
  }
  pasteZone.classList.add('waiting');
  pasteLabel.innerHTML = 'Ready -- now press Ctrl+V';
  pasteZone.focus();
});
pasteZone.addEventListener('blur', () => {
  pasteZone.classList.remove('waiting');
  pasteLabel.innerHTML = 'Click here then press Ctrl+V -- or click to read clipboard directly';
});
pasteZone.addEventListener('paste', e => {
  e.preventDefault();
  const items = Array.from(e.clipboardData?.items || []);
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) { pasteZone.blur(); loadFile(file); return; }
    }
  }
});

// File helpers
async function processUrl(url) {
  setLoading('Fetching image from URL...');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const name = url.split('/').pop().split('?')[0] || 'image.jpg';
    setLoading(null);
    loadFile(new File([blob], name, { type: blob.type }));
  } catch (err) {
    setLoading(null);
    showError('Could not fetch image: ' + err.message);
  }
}

function guessMime(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
           webp:'image/webp', gif:'image/gif', bmp:'image/bmp',
           avif:'image/avif', tiff:'image/tiff' }[ext] || 'image/jpeg';
}

function loadFile(file) {
  if (!file) return;
  const mime = file.type || guessMime(file.name);
  if (!mime.startsWith('image/')) { showError('Please provide an image file.'); return; }
  clearError();
  const reader = new FileReader();
  reader.onerror = () => showError('Could not read file. Try a different image.');
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const comma = dataUrl.indexOf(',');
    imageMime   = mime;
    imageBase64 = dataUrl.slice(comma + 1);
    const tmp = new Image();
    tmp.onload = function() { imageW = tmp.naturalWidth; imageH = tmp.naturalHeight; };
    tmp.src = dataUrl;
    imageThumb.src          = dataUrl;
    imgFilename.textContent = file.name || 'pasted image';
    imgMeta.textContent     = Math.round(file.size / 1024) + ' KB - ' + mime;
    dropZone.classList.add('hidden');
    pasteZone.classList.add('hidden');
    imageCard.classList.remove('hidden');
    results.classList.add('hidden');
    setLoading(null);
    clearError();
    fileInput.value = '';
  };
  reader.readAsDataURL(file);
}

// Generate
analyzeBtn.addEventListener('click', generate);
regenerateBtn.addEventListener('click', generate);

function generate() {
  if (!imageBase64) { showError('No image loaded.'); return; }
  clearError();
  results.classList.add('hidden');
  setLoading('Analyzing image with MiniMax M3...');
  analyzeBtn.disabled = true;
  regenerateBtn.disabled = true;

  fetch('/api/minimax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64, detail: 'default' } },
          { type: 'text', text: 'Analyze this image and generate a cinemagraph prompt following the exact output format.' }
        ]}
      ]
    })
  })
  .then(function(res) {
    if (!res.ok) return res.json().then(function(d) { throw new Error(d.error?.message || 'API error ' + res.status); });
    return res.json();
  })
  .then(function(data) {
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from API.');
    renderResults(text);
  })
  .catch(function(err) {
    showError(err.message || 'Request failed. Please try again.');
  })
  .finally(function() {
    setLoading(null);
    analyzeBtn.disabled = false;
    regenerateBtn.disabled = false;
  });
}

function renderResults(text) {
  function get(re) { var m = text.match(re); return m ? m[1].trim() : ''; }
  document.getElementById('elementText').textContent  = get(/\*\*Element to animate:\*\*\s*(.+)/) || '--';
  document.getElementById('motionText').textContent   = get(/\*\*Motion style:\*\*\s*(.+)/) || '--';
  document.getElementById('promptText').textContent   = get(/\*\*Cinemagraph prompt:\*\*\s*([\s\S]+?)(?=\*\*Kling)/) || '--';
  document.getElementById('negativeText').textContent = get(/\*\*Kling \/ Runway negative prompt:\*\*\s*([\s\S]+?)(?=\*\*Motion strength)/) || '--';
  var pct = Math.min(100, Math.max(1, parseInt(get(/\*\*Motion strength setting:\*\*\s*(.+)/)) || 15));
  document.getElementById('strengthTag').textContent  = pct + '%';
  document.getElementById('strengthFill').style.width = pct + '%';
  document.getElementById('arTag').textContent = (imageW > 0 && imageW / imageH >= 1.1) ? '16:9' : '9:16';
  results.classList.remove('hidden');
}

// New image
newImageBtn.addEventListener('click', function() {
  imageBase64 = null; imageMime = null; imageW = 0; imageH = 0;
  imageThumb.src = '';
  imageCard.classList.add('hidden');
  results.classList.add('hidden');
  dropZone.classList.remove('hidden');
  pasteZone.classList.remove('hidden');
  clearError();
});

// Copy buttons
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-copy]');
  if (!btn) return;
  var el = document.getElementById(btn.dataset.copy);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(function() {
    var orig = btn.innerHTML;
    btn.innerHTML = '<svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied';
    btn.classList.add('copied');
    setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
});

function setLoading(msg) {
  if (msg) { loadingMsg.textContent = msg; loadingBox.classList.remove('hidden'); }
  else loadingBox.classList.add('hidden');
}
function showError(msg) { errorMsg.textContent = msg; errorBox.classList.remove('hidden'); }
function clearError() { errorBox.classList.add('hidden'); }
