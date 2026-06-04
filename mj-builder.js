// ── MJ Prompt Builder ────────────────────────────────────────────────────────

const PRESETS = {
  nature: {
    subject:       'white roses cascading over an ancient stone wall',
    imperfections: 'dewdrops on petals, slightly wilted edges, moss on stone',
    action:        'soft wind motion, petals falling',
    setting:       'European garden courtyard',
    lighting:      'golden hour backlight, soft diffused sunlight',
    camera: 'Sony A7R IV', lens: '85mm', aperture: 'f/2.0',
    mood: 'dreamy, romantic, cinematic still',
    ar: '9:16', stylize: 150,
  },
  portrait: {
    subject:       '55-year-old fisherman, deep facial wrinkles, weathered skin',
    imperfections: 'visible skin pores, salt-and-pepper beard, sun spots',
    action:        'gazing into the distance',
    setting:       'foggy harbor dock at dawn',
    lighting:      'soft diffused overcast morning light',
    camera: 'Sony A7R IV', lens: '85mm', aperture: 'f/2.8',
    mood: 'melancholic, raw, documentary style',
    ar: '3:2', stylize: 180,
  },
  landscape: {
    subject:       'abandoned wooden cabin in a wildflower meadow',
    imperfections: 'worn corrugated roof, broken fence post, overgrown weeds on porch',
    action:        'tall grass swaying in wind',
    setting:       'rolling hills under a vast open sky',
    lighting:      'dramatic golden hour backlight, lens flare through tall grass',
    camera: 'Canon EOS R5', lens: '35mm', aperture: 'f/8',
    mood: 'nostalgic, serene, cinematic wide',
    ar: '16:9', stylize: 120,
  },
  street: {
    subject:       'night market street vendor cooking over open charcoal flame',
    imperfections: 'sweat-stained apron, calloused hands, chipped ceramic bowls, neon reflections on wet pavement',
    action:        'stirring the wok hard, smoke and steam rising',
    setting:       'Bangkok Chinatown, Yaowarat Road at 11pm',
    lighting:      'harsh overhead neon mixed with warm orange fire glow, deep shadows under awning',
    camera: 'Leica Q3', lens: '28mm', aperture: 'f/1.7',
    mood: 'gritty, cinematic, high-contrast documentary',
    ar: '9:16', stylize: 200,
  },
  wildlife: {
    subject:       'male Bengal tiger resting on a rocky outcrop',
    imperfections: 'scarred left ear, muddy paws, flies circling near face, visible ribcage',
    action:        'chest slowly rising with each breath, eyes half-closed in midday heat',
    setting:       'Ranthambore National Park, dry scrubland',
    lighting:      'harsh midday sun with dust haze, long shadows across golden grass',
    camera: 'Nikon Z9', lens: '600mm', aperture: 'f/5.6',
    mood: 'majestic, raw, NatGeo documentary',
    ar: '16:9', stylize: 160,
  },
  architecture: {
    subject:       'abandoned Victorian ballroom, ornate plaster ceiling partially collapsed',
    imperfections: 'peeling gold wallpaper, shattered chandelier on floor, thick dust on every surface, pigeons nesting in broken cornice',
    action:        'perfectly still, dust motes suspended in single light beam',
    setting:       'decayed New Orleans plantation house interior',
    lighting:      'single shaft of pale morning light through boarded window',
    camera: 'Phase One IQ4', lens: '24mm', aperture: 'f/8',
    mood: 'haunting, melancholic, American Gothic',
    ar: '4:5', stylize: 120,
  },
  custom: {
    subject: '', imperfections: '', action: '', setting: '',
    lighting: '', camera: 'Sony A7R IV', lens: '85mm', aperture: 'f/2.8', mood: '',
    ar: null, stylize: null,
  },
};

const fieldIds = ['subject','imperfections','action','setting','lighting','mood','camera','lens','aperture'];

function getField(key) {
  return document.getElementById('f-' + key).value.trim();
}

function getDOF(aperture) {
  var m = aperture.match(/f\/(\d+\.?\d*)/i);
  if (!m) return 'shallow depth of field';
  var f = parseFloat(m[1]);
  return f >= 8 ? 'deep focus, sharp throughout' : 'shallow depth of field';
}

function buildPrompt() {
  const subject       = getField('subject');
  const imperfections = getField('imperfections');
  const action        = getField('action');
  const setting       = getField('setting');
  const lighting      = getField('lighting');
  const mood          = getField('mood');
  const camera        = getField('camera');
  const lens          = getField('lens');
  const aperture      = getField('aperture');
  const version  = document.getElementById('p-version').value;
  const style    = document.getElementById('p-style').value;
  const ar       = document.getElementById('p-ar').value;
  const stylize  = document.getElementById('p-stylize').value;
  const quality  = document.getElementById('p-quality').value;

  const parts = [
    subject,
    imperfections && ('physical details: ' + imperfections),
    action,
    setting && ('in ' + setting),
    lighting,
    mood,
    'Shot on ' + camera + ', ' + lens + ' lens, ' + aperture + ', ' + getDOF(aperture) + ', photorealistic',
  ].filter(Boolean);

  const main   = parts.join(', ');
  const params = '--v ' + version + ' --style ' + style + ' --ar ' + ar + ' --s ' + stylize + ' --q ' + quality;
  return { main, params };
}

function updatePrompt() {
  const { main, params } = buildPrompt();
  document.getElementById('prompt-main').textContent   = main + ' ';
  document.getElementById('prompt-params').textContent = params;
}

function applyPreset(key) {
  var p = PRESETS[key];
  fieldIds.forEach(function(id) {
    var el = document.getElementById('f-' + id);
    if (el) el.value = p[id] || '';
  });
  if (p.ar) {
    document.getElementById('p-ar').value = p.ar;
  }
  if (p.stylize !== null && p.stylize !== undefined) {
    var stylEl = document.getElementById('p-stylize');
    stylEl.value = p.stylize;
    document.getElementById('stylize-val').textContent = p.stylize;
  }
  document.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
  updatePrompt();
}

// Preset buttons
document.getElementById('presetRow').addEventListener('click', function(e) {
  var btn = e.target.closest('.preset-btn');
  if (btn) applyPreset(btn.dataset.preset);
});

// Text inputs — cinemagraph inputs also fire this but updatePrompt only reads MJ IDs
document.querySelectorAll('input.mj[type=text]').forEach(function(el) {
  el.addEventListener('input', updatePrompt);
});

// Selects
['p-version','p-style','p-ar'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', updatePrompt);
});

// Sliders
document.getElementById('p-stylize').addEventListener('input', function() {
  document.getElementById('stylize-val').textContent = this.value;
  updatePrompt();
});
document.getElementById('p-quality').addEventListener('input', function() {
  document.getElementById('quality-val').textContent = this.value;
  updatePrompt();
});

// Main copy button
document.getElementById('copyBtn').addEventListener('click', function() {
  var btn = this;
  var { main, params } = buildPrompt();
  navigator.clipboard.writeText(main + ' ' + params).then(function() {
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'Copy Prompt';
      btn.classList.remove('copied');
    }, 2000);
  });
});

// Example card copy buttons
document.querySelectorAll('.example-card').forEach(function(card, i) {
  card.addEventListener('click', function() {
    var prompt = card.dataset.prompt;
    var label  = document.getElementById('ec-' + i);
    navigator.clipboard.writeText(prompt).then(function() {
      label.textContent = 'Copied!';
      label.classList.add('copied');
      setTimeout(function() {
        label.textContent = 'Copy';
        label.classList.remove('copied');
      }, 2000);
    });
  });
});

// Init MJ builder
applyPreset('nature');


// ── Cinemagraph / I2V Builder ─────────────────────────────────────────────────

// Fallback motion descriptions when user leaves the motion field empty
const CINE_MOTION_HINTS = {
  'smoke drifting upward':              'slowly curling and dispersing into the air above',
  'steam rising slowly':                'rising in thin wispy tendrils, curling gently upward',
  'water surface rippling gently':      'sending soft concentric rings outward across the surface',
  'candle flame flickering softly':     'swaying and dancing with a warm amber glow',
  'leaves swaying in a gentle breeze':  'rustling with a slow, rhythmic sway',
  'petals drifting slowly downward':    'falling in a weightless, unhurried spiral',
  'clouds drifting slowly overhead':    'sliding silently across the sky',
  'tall grass swaying softly':          'bowing and rising in gentle waves',
  'mist shifting across the scene':     'rolling slowly across surfaces',
  'thin curtain billowing gently':      'lifting and settling in the breeze',
  'dust motes floating in the light':   'drifting lazily in a shaft of warm light',
};

function buildCinePrompt() {
  var element  = document.getElementById('f-cine-element').value.trim();
  var motion   = document.getElementById('f-cine-motion').value.trim();
  var scene    = document.getElementById('f-cine-scene').value.trim();
  var ar       = document.getElementById('cine-ar').value;
  var strength = document.getElementById('cine-strength').value;

  var out = document.getElementById('cine-prompt-out');
  var neg = document.getElementById('cine-prompt-neg');

  if (!element) {
    out.textContent = '—';
    neg.textContent = '';
    return;
  }

  var motionDesc = motion || CINE_MOTION_HINTS[element] || 'moving with a slow, natural, subtle flow';

  var sentences = [];
  if (scene) sentences.push(scene + (scene.slice(-1) === '.' ? '' : '.'));
  sentences.push('Only the ' + element + ' is in motion — ' + motionDesc + '.');
  sentences.push('Every other element remains completely frozen: background, surfaces, objects, and atmosphere are perfectly still.');
  sentences.push('Seamless ambient cinemagraph, 8 seconds, ' + ar + '. Motion strength ' + strength + '%.');

  out.textContent = sentences.join(' ');
  neg.textContent = 'Negative: camera movement, camera shake, zoom, pan, tilt, scene cuts, flickering background, unstable elements, walking, running, facial animation, excessive motion, random noise.';
}

// Chip row
document.getElementById('cineChipRow').addEventListener('click', function(e) {
  var chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#cineChipRow .chip').forEach(function(c) { c.classList.remove('active'); });
  chip.classList.add('active');
  document.getElementById('f-cine-element').value = chip.dataset.val;
  buildCinePrompt();
});

// Cinemagraph text inputs
['f-cine-element','f-cine-motion','f-cine-scene'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', function() {
    // deactivate chips if user manually edits element field
    if (id === 'f-cine-element') {
      document.querySelectorAll('#cineChipRow .chip').forEach(function(c) { c.classList.remove('active'); });
    }
    buildCinePrompt();
  });
});

// Cinemagraph selects
['cine-ar','cine-strength'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', buildCinePrompt);
});

// Cinemagraph copy button
document.getElementById('cineCopyBtn').addEventListener('click', function() {
  var btn = this;
  var main = document.getElementById('cine-prompt-out').textContent;
  var negText = document.getElementById('cine-prompt-neg').textContent;
  if (!main || main === '—') return;
  var full = main + (negText ? '\n\n' + negText : '');
  navigator.clipboard.writeText(full).then(function() {
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});
