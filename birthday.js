'use strict';

// ── Answer messages ───────────────────────────────────────────────
const MESSAGES = {
  1: 'ไม่ว่าจะเหม็นแค่ไหน ก็ยังน่ารักในใจเราเสมอเลยนะ 🐾',
  2: 'กลมก็คือน่ารัก นั่นคือกฎของจักรวาล 🌍✨',
  3: 'หนึ่งก็อยากให้ต้นรู้สึกอบอุ่นเสมอนะ 🏠🤍',
  4: 'ตอบถูกแล้ว! ทั้งคู่น่ารักที่สุดในโลกเลย 💕',
  5: 'ต้นน่ารักมากกกก หนึ่งรักต้นที่สุดเลย 🥹💗',
};

// ── State ─────────────────────────────────────────────────────────
let currentIdx  = 0;   // which screen is showing
let heartStep   = 0;   // 0=start island, 1-4=plats, 5=goal

// ── DOM ───────────────────────────────────────────────────────────
const allScreens   = Array.from(document.querySelectorAll('.screen'));
const progressWrap = document.getElementById('progressWrap');
const heartSprite  = document.getElementById('heartSprite');
const plats        = Array.from(document.querySelectorAll('.plat'));   // 4 elements
const conns        = Array.from(document.querySelectorAll('.prog-conn')); // 5 elements
const progStart    = document.getElementById('progStart');
const progGoal     = document.getElementById('progGoal');
const popup        = document.getElementById('popup');
const popupText    = document.getElementById('popupText');
const startBtn     = document.getElementById('startBtn');

// ── Screen transitions ────────────────────────────────────────────
var screensContainer = document.getElementById('screensContainer');

function goTo(nextIdx) {
  var cur  = allScreens[currentIdx];
  var next = allScreens[nextIdx];

  cur.classList.add('exit');
  cur.classList.remove('active');

  setTimeout(function () {
    cur.classList.remove('exit');
    next.classList.add('active');
    currentIdx = nextIdx;
  }, 380);
}

// Core backwards navigation — handles single step and platform jumps
function jumpBackTo(targetIdx) {
  if (targetIdx >= currentIdx || targetIdx < 0) return;

  // Dismiss any open popup without triggering the next-screen callback
  pendingAfterHide = null;
  popup.classList.remove('show');

  // ── Reset final screen if we're jumping from it ─────────────────
  if (currentIdx === 6) {
    resetScratch();
    var msg = document.getElementById('finalMsg');
    if (msg) msg.classList.remove('visible');
  }

  // ── Reset choices for all screens from targetIdx up to current ───
  // (re-enable every question we're jumping past / back to)
  for (var s = targetIdx; s < currentIdx; s++) {
    var grp = document.getElementById('choices' + s);
    if (grp) {
      grp.querySelectorAll('.choice').forEach(function (c) {
        c.classList.remove('locked', 'chosen');
      });
    }
  }

  // ── Undo heart progress to targetIdx - 1 ────────────────────────
  // screen 1 (Q1) → heartStep becomes 0 (start island, no plats done)
  // screen 2 (Q2) → heartStep becomes 1 (plat0 done)
  var newHeartStep = Math.max(0, targetIdx - 1);
  heartStep = newHeartStep;

  // Un-mark platforms
  for (var p = newHeartStep; p < plats.length; p++) {
    plats[p].classList.remove('done');
  }
  // Un-mark connectors
  for (var c = newHeartStep; c < conns.length; c++) {
    conns[c].classList.remove('done');
  }
  // Un-mark goal
  if (newHeartStep < 5) {
    progGoal.classList.remove('reached');
    progGoal.style.cursor = 'default';
  }

  // Hide progress bar only when returning to the welcome screen
  if (targetIdx === 0) {
    progressWrap.classList.add('hidden');
  } else {
    progressWrap.classList.remove('hidden');
    heartSprite.style.left = getHeartTargetX(newHeartStep) + 'px';
  }

  // ── Animate backwards ───────────────────────────────────────────
  screensContainer.classList.add('going-back');

  var cur    = allScreens[currentIdx];
  var target = allScreens[targetIdx];

  cur.classList.add('exit');
  cur.classList.remove('active');

  setTimeout(function () {
    cur.classList.remove('exit');
    target.classList.add('active');
    currentIdx = targetIdx;

    setTimeout(function () {
      screensContainer.classList.remove('going-back');
    }, 50);
  }, 380);
}

// Back button: go one step back
function goBack() {
  jumpBackTo(currentIdx - 1);
}

// ── Progress heart ────────────────────────────────────────────────
// step 0 = start island, 1-4 = plat[0-3], 5 = goal
function getHeartTargetX(step) {
  var wrapRect = progressWrap.getBoundingClientRect();
  var el;
  if (step === 0)      el = progStart;
  else if (step >= 5)  el = progGoal;
  else                 el = plats[step - 1];
  var r = el.getBoundingClientRect();
  return r.left + r.width / 2 - wrapRect.left;
}

function advanceHeart(step) {
  // Mark platforms done: steps 1-4 fill plat[0-3]; step 5 fills all
  var platsDone = Math.min(step, plats.length);
  for (var i = 0; i < platsDone; i++) plats[i].classList.add('done');

  // Mark connectors done: conn[j] done when step > j
  for (var j = 0; j < conns.length; j++) {
    conns[j].classList.toggle('done', step > j);
  }

  // Activate goal on final step
  if (step >= 5) {
    progGoal.classList.add('reached');
    progGoal.style.cursor = 'pointer';
  }

  heartSprite.style.left = getHeartTargetX(step) + 'px';

  // Bounce animation
  heartSprite.classList.remove('bounce');
  void heartSprite.offsetWidth;
  heartSprite.classList.add('bounce');
  heartSprite.addEventListener('animationend', function handler() {
    heartSprite.classList.remove('bounce');
    heartSprite.removeEventListener('animationend', handler);
  });
}

function showProgress() {
  progressWrap.classList.remove('hidden');
  // Snap heart to start island
  heartSprite.style.left = getHeartTargetX(0) + 'px';
}

// ── Popup ─────────────────────────────────────────────────────────
var popupTimer      = null;   // kept for jumpBackTo cleanup compat
var pendingAfterHide = null;
var nextBtn          = document.getElementById('nextBtn');

function showPopup(text, afterHide) {
  popupText.textContent = text;
  pendingAfterHide      = afterHide;
  popup.classList.add('show');
}

function dismissPopup() {
  popup.classList.remove('show');
  var cb = pendingAfterHide;
  pendingAfterHide = null;
  if (cb) setTimeout(cb, 350);
}

nextBtn.addEventListener('click', dismissPopup);

// ── Answer handler ────────────────────────────────────────────────
document.querySelectorAll('.choice').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var q = parseInt(this.dataset.q, 10);

    // Lock all choices in this question
    var group = document.getElementById('choices' + q);
    group.querySelectorAll('.choice').forEach(function (c) {
      c.classList.add('locked');
    });
    this.classList.add('chosen');

    heartStep++;
    advanceHeart(heartStep);

    var msg = MESSAGES[q];
    showPopup(msg, function () {
      if (q < 5) {
        goTo(q + 1);
      } else {
        goTo(6);
        setTimeout(launchConfetti, 700);
        setTimeout(initScratch, 900);
      }
    });
  });
});

// ── Start button ──────────────────────────────────────────────────
startBtn.addEventListener('click', function () {
  showProgress();
  goTo(1);
});

// ── Back buttons ──────────────────────────────────────────────────
document.querySelectorAll('.btn-back').forEach(function (btn) {
  btn.addEventListener('click', goBack);
});

// ── Progress bar clicks ────────────────────────────────────────────
// plat[i] done → clicking goes back to screen i+1 (Q i+1)
plats.forEach(function (plat, i) {
  plat.addEventListener('click', function () {
    var targetScreen = i + 1;
    if (plat.classList.contains('done') && targetScreen < currentIdx) {
      jumpBackTo(targetScreen);
    }
  });
});

// Goal reached → clicking goes back to Q5 (screen 5)
progGoal.addEventListener('click', function () {
  if (progGoal.classList.contains('reached') && currentIdx > 5) {
    jumpBackTo(5);
  }
});

// ── Confetti ──────────────────────────────────────────────────────
var confettiCanvas = document.getElementById('confetti-canvas');
var ctx            = confettiCanvas.getContext('2d');
var particles      = [];
var rafId          = null;

function resizeConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

var COLORS = [
  '#ff6fa3', '#c77dff', '#ffb3d1', '#e0b0ff',
  '#ff99cc', '#d4a0ff', '#ffccee', '#ffc2e0', '#ddb0ff',
];

function createParticle() {
  return {
    x:     Math.random() * confettiCanvas.width,
    y:     -(Math.random() * confettiCanvas.height * 0.6),
    r:     Math.random() * 7 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vy:    Math.random() * 3.5 + 1.5,
    vx:    (Math.random() - 0.5) * 2.5,
    spin:  (Math.random() - 0.5) * 0.18,
    angle: Math.random() * Math.PI * 2,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    alpha: 1,
  };
}

function drawParticle(p) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.alpha);
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.color;
  if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
  }
  ctx.restore();
}

function updateParticle(p) {
  p.y     += p.vy;
  p.x     += p.vx;
  p.angle += p.spin;
  // Fade out near bottom
  if (p.y > confettiCanvas.height * 0.75) {
    p.alpha -= 0.018;
  }
}

function tickConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles = particles.filter(function (p) { return p.alpha > 0; });
  particles.forEach(function (p) {
    updateParticle(p);
    drawParticle(p);
  });
  if (particles.length > 0) {
    rafId = requestAnimationFrame(tickConfetti);
  }
}

function launchConfetti() {
  // Spawn 240 particles
  for (var i = 0; i < 240; i++) {
    particles.push(createParticle());
  }
  if (rafId) cancelAnimationFrame(rafId);
  tickConfetti();

  // Second wave for extra joy
  setTimeout(function () {
    for (var i = 0; i < 120; i++) {
      var p = createParticle();
      p.y = -(Math.random() * 80);
      particles.push(p);
    }
  }, 900);
}

// ── Scratch card ───────────────────────────────────────────────────
function resetScratch() {
  var sc = document.getElementById('scratchCanvas');
  if (!sc) return;
  // Clear the canvas and remove the revealed class so it can be re-scratched
  sc.classList.remove('revealed');
  var sctx = sc.getContext('2d');
  sctx.clearRect(0, 0, sc.width, sc.height);
}

function initScratch() {
  var card      = document.getElementById('scratchCard');
  var sc        = document.getElementById('scratchCanvas');
  var finalMsg  = document.getElementById('finalMsg');
  if (!card || !sc) return;

  var size     = card.offsetWidth;
  sc.width     = size;
  sc.height    = size;

  var sctx     = sc.getContext('2d');
  var isDown   = false;
  var hasScratch = false;
  var checkTimer = null;

  // ── Draw the scratch layer ───────────────────────────────────────
  // Background gradient
  var grad = sctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0,   '#f0a0d0');
  grad.addColorStop(0.5, '#d070e8');
  grad.addColorStop(1,   '#b060ff');
  sctx.fillStyle = grad;
  sctx.beginPath();
  sctx.roundRect(0, 0, size, size, 28);
  sctx.fill();

  // Sparkle dots pattern
  sctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (var i = 0; i < 60; i++) {
    var dx = Math.random() * size;
    var dy = Math.random() * size;
    var dr = Math.random() * 3 + 1;
    sctx.beginPath();
    sctx.arc(dx, dy, dr, 0, Math.PI * 2);
    sctx.fill();
  }

  // Stars ✦
  sctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  sctx.font = 'bold 16px sans-serif';
  var stars = ['✦','✧','⋆','✦','✧','⋆','✦','✧'];
  stars.forEach(function (s) {
    sctx.fillText(s,
      Math.random() * (size - 30) + 8,
      Math.random() * (size - 30) + 24
    );
  });

  // Center hint text
  sctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  sctx.font = 'bold ' + Math.round(size * 0.085) + 'px sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('ขูดเลย!', size / 2, size / 2 - size * 0.08);
  sctx.font = Math.round(size * 0.12) + 'px sans-serif';
  sctx.fillText('✨', size / 2, size / 2 + size * 0.1);

  // ── Scratch erase helpers ────────────────────────────────────────
  function scratchAt(x, y) {
    sctx.globalCompositeOperation = 'destination-out';
    sctx.beginPath();
    sctx.arc(x, y, size * 0.12, 0, Math.PI * 2);
    sctx.fill();
    sctx.globalCompositeOperation = 'source-over';

    if (!hasScratch) {
      hasScratch = true;
    }

    // Throttled completion check every 200 ms
    if (!checkTimer) {
      checkTimer = setTimeout(function () {
        checkTimer = null;
        checkReveal();
      }, 200);
    }
  }

  function getPos(e) {
    var rect = sc.getBoundingClientRect();
    var src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (size / rect.width),
      y: (src.clientY - rect.top)  * (size / rect.height),
    };
  }

  function checkReveal() {
    var pixels  = sctx.getImageData(0, 0, size, size).data;
    var total   = size * size;
    var erased  = 0;
    for (var i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) erased++;
    }
    if (erased / total > 0.6) {
      autoReveal();
    }
  }

  function autoReveal() {
    sc.classList.add('revealed');          // fade canvas to opacity 0
    sc.removeEventListener('pointerdown',  onDown);
    sc.removeEventListener('pointermove',  onMove);
    sc.removeEventListener('pointerup',    onUp);
    sc.removeEventListener('pointercancel',onUp);

    // Show final message after canvas fades
    setTimeout(function () {
      if (finalMsg) finalMsg.classList.add('visible');
    }, 650);
  }

  // ── Pointer / touch events ───────────────────────────────────────
  function onDown(e) {
    isDown = true;
    var pos = getPos(e);
    scratchAt(pos.x, pos.y);
    e.preventDefault();
  }
  function onMove(e) {
    if (!isDown) return;
    var pos = getPos(e);
    scratchAt(pos.x, pos.y);
    e.preventDefault();
  }
  function onUp() {
    isDown = false;
  }

  sc.addEventListener('pointerdown',   onDown,  { passive: false });
  sc.addEventListener('pointermove',   onMove,  { passive: false });
  sc.addEventListener('pointerup',     onUp);
  sc.addEventListener('pointercancel', onUp);
}

// ── Background Music (Web Audio API ambient pad + melody) ─────────
(function () {
  var audioCtx   = null;
  var masterGain = null;
  var reverbIn   = null;   // input node for the reverb/delay network
  var musicReady = false;
  var musicMuted = false;
  var musicBtn   = document.getElementById('musicBtn');

  // C major pentatonic, two octaves
  var PENTA = [261.63, 293.66, 329.63, 392.00, 440.00,
               523.25, 587.33, 659.25, 783.99, 880.00];
  // Walking pattern — indices into PENTA
  var PATTERN = [0, 2, 4, 2, 5, 3, 7, 4, 6, 3, 5, 2, 4, 1, 3, 0];
  var patStep = 0;

  // ── Build the audio graph ──────────────────────────────────────
  function buildAudio() {
    if (musicReady) return;
    musicReady = true;

    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    // Slow 3-second fade-in so it doesn't startle
    masterGain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 3.0);
    masterGain.connect(audioCtx.destination);

    // Simple dual-delay reverb network
    var d1  = audioCtx.createDelay(4); d1.delayTime.value  = 0.38;
    var d2  = audioCtx.createDelay(4); d2.delayTime.value  = 0.57;
    var fb  = audioCtx.createGain();   fb.gain.value        = 0.30;
    var wet = audioCtx.createGain();   wet.gain.value       = 0.35;
    d1.connect(d2); d2.connect(fb);
    fb.connect(d1); fb.connect(wet);
    wet.connect(masterGain);
    reverbIn = d1;

    // Pad — 5 low-register sine oscillators forming a C-G-C-E-G chord
    var padFreqs  = [65.41, 98.00, 130.81, 164.81, 196.00];
    var padLevels = [0.55,  0.35,  0.30,   0.20,   0.18];

    padFreqs.forEach(function (freq, i) {
      // Tiny LFO for subtle warmth / movement
      var lfo     = audioCtx.createOscillator();
      var lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.07 + i * 0.015;
      lfoGain.gain.value  = 0.35;
      lfo.connect(lfoGain);
      lfo.start();

      var osc    = audioCtx.createOscillator();
      var filt   = audioCtx.createBiquadFilter();
      var gain   = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq + (i % 2 === 0 ? 0.25 : -0.25);
      lfoGain.connect(osc.frequency);

      filt.type = 'lowpass';
      filt.frequency.value = 380 + i * 110;
      filt.Q.value = 0.35;

      gain.gain.value = padLevels[i] * 0.17;

      osc.connect(filt);
      filt.connect(gain);
      gain.connect(masterGain);
      gain.connect(reverbIn);
      osc.start();
    });

    // Kick off the gentle melody
    scheduleNote();
  }

  // ── Pentatonic melody — one note at a time, long decay ────────
  function scheduleNote() {
    if (!audioCtx) return;

    var freq = PENTA[PATTERN[patStep % PATTERN.length]];
    patStep++;

    var osc  = audioCtx.createOscillator();
    var env  = audioCtx.createGain();
    var filt = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;

    filt.type = 'lowpass';
    filt.frequency.value = freq * 2.8;
    filt.Q.value = 1.2;

    var now = audioCtx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.13, now + 0.07);    // fast attack
    env.gain.exponentialRampToValueAtTime(0.0001, now + 3.6); // long decay

    osc.connect(filt);
    filt.connect(env);
    env.connect(masterGain);
    env.connect(reverbIn);
    osc.start(now);
    osc.stop(now + 4.0);

    // Next note in 1.8 – 4 s (varied for natural feel)
    setTimeout(scheduleNote, 1800 + Math.random() * 2200);
  }

  // ── Trigger on first user interaction anywhere ─────────────────
  function onFirstInteraction() {
    buildAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    document.removeEventListener('click',      onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
  }

  document.addEventListener('click',      onFirstInteraction);
  document.addEventListener('touchstart', onFirstInteraction, { passive: true });

  // ── Mute / unmute toggle ───────────────────────────────────────
  musicBtn.addEventListener('click', function (e) {
    e.stopPropagation(); // don't double-trigger first-interaction

    // If user taps the button before anything else, start music
    if (!musicReady) {
      buildAudio();
      document.removeEventListener('click',      onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    musicMuted = !musicMuted;

    if (masterGain) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      if (musicMuted) {
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.45);
        musicBtn.textContent = '🔇';
        musicBtn.setAttribute('aria-label', 'เปิดเสียงดนตรี');
      } else {
        masterGain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 0.6);
        musicBtn.textContent = '🔊';
        musicBtn.setAttribute('aria-label', 'ปิดเสียงดนตรี');
      }
    }
  });
}());
