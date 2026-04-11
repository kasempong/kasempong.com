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

  // Canvas is fully painted — now safe to show the photo beneath
  var reveal = card.querySelector('.scratch-reveal');
  if (reveal) reveal.classList.add('ready');

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

// ── Chill Romantic Piano BGM + Button Click Sounds ───────────────
(function () {
  var audioCtx    = null;
  var masterGain  = null;
  var reverbInput = null;
  var musicReady  = false;
  var musicMuted  = false;
  var musicBtn    = document.getElementById('musicBtn');

  // 76 BPM — slow, flowing, romantic
  var BPM = 76;
  var EN  = 60 / BPM / 2;   // 8th-note ~0.395 s

  // ── Note frequencies ──────────────────────────────────────────
  var R  = 0;
  var A2=110.00, B2=123.47;
  var C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, B3=246.94;
  var C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88;
  var C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99;

  // ── 4-bar loop, 8th-note grid (32 steps) ─────────────────────
  // Chord progression  I(C) – vi(Am) – IV(F) – V(G)

  // Right hand — lyrical romantic melody
  var MELODY = [
    E5, G5,  R, G5, E5, C5,  R, E5,   // bar 1 — C
    A4, C5, E5,  R, C5, A4,  R, A4,   // bar 2 — Am
    F4, A4, C5, A4,  R, C5, D5, C5,   // bar 3 — F
    G4, B4, D5,  R, B4, G4,  R, B4,   // bar 4 — G
  ];

  // Left hand — rolling arpeggios (root–5th–3rd–5th per beat)
  var BASS = [
    C3, G3, E3, G3, C3, G3, E3, G3,   // C
    A2, E3, C3, E3, A2, E3, C3, E3,   // Am
    F3, C4, A3, C4, F3, C4, A3, C4,   // F
    G3, D4, B3, D4, G3, D4, B3, D4,   // G
  ];

  var STEPS       = MELODY.length;   // 32
  var currentStep = 0;
  var nextNoteTime = 0;
  var schedTimer   = null;

  // ── Piano tone: triangle fundamental + sine harmonics + ADSR ──
  function piano(freq, t, dur, vol, dest) {
    if (!freq || !dest) return;

    var env = audioCtx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.005);          // snappy attack
    env.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.09); // quick decay
    env.gain.exponentialRampToValueAtTime(vol * 0.18, t + dur);  // sustain tail
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35); // release
    env.connect(dest);

    // Fundamental + 2 soft harmonics = warm piano-like timbre
    var partials = [[1, 'triangle', 0.65], [2, 'sine', 0.25], [3, 'sine', 0.10]];
    partials.forEach(function (p) {
      var osc = audioCtx.createOscillator();
      var hg  = audioCtx.createGain();
      osc.type = p[1];
      osc.frequency.value = freq * p[0];
      hg.gain.value = p[2];
      osc.connect(hg);
      hg.connect(env);
      osc.start(t);
      osc.stop(t + dur + 0.6);
    });
  }

  // ── Scheduler (look-ahead, Web Audio best practice) ──────────
  function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.15) {
      var s = currentStep % STEPS;
      piano(MELODY[s], nextNoteTime, EN * 1.4, 0.13, masterGain);
      piano(MELODY[s], nextNoteTime, EN * 1.4, 0.04, reverbInput); // wet send
      piano(BASS[s],   nextNoteTime, EN * 0.85, 0.09, masterGain);
      piano(BASS[s],   nextNoteTime, EN * 0.85, 0.03, reverbInput);
      currentStep++;
      nextNoteTime += EN;
    }
    schedTimer = setTimeout(scheduler, 25);
  }

  // ── Build audio graph ─────────────────────────────────────────
  function buildAudio() {
    if (musicReady) return;
    musicReady = true;

    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.62, audioCtx.currentTime + 3.0);
    masterGain.connect(audioCtx.destination);

    // Route through MediaStreamDestination → hidden <audio> element so the
    // browser shows the speaker icon in the tab (Web Audio API alone won't do it)
    try {
      var streamDest = audioCtx.createMediaStreamDestination();
      masterGain.connect(streamDest);
      var audioEl = document.createElement('audio');
      audioEl.srcObject = streamDest.stream;
      audioEl.volume = 1;
      document.body.appendChild(audioEl);
      audioEl.play().catch(function () {}); // safe — we're already inside a user gesture
    } catch (e) { /* Safari older fallback — speaker icon won't show but audio still plays */ }

    // Two-tap room reverb for warmth (no feedback runaway)
    var tap1 = audioCtx.createDelay(0.5); tap1.delayTime.value = 0.09;
    var tap2 = audioCtx.createDelay(0.5); tap2.delayTime.value = 0.17;
    var rg1  = audioCtx.createGain();     rg1.gain.value  = 0.22;
    var rg2  = audioCtx.createGain();     rg2.gain.value  = 0.13;
    reverbInput = audioCtx.createGain();
    reverbInput.connect(tap1); reverbInput.connect(tap2);
    tap1.connect(rg1); tap2.connect(rg2);
    rg1.connect(masterGain); rg2.connect(masterGain);

    nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
  }

  // ── Cute button click sound ───────────────────────────────────
  window.playBtnClick = function () {
    if (!audioCtx || musicMuted) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var env = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318, now);              // E6
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06); // down to A5
    env.gain.setValueAtTime(0.18, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  };

  // Attach click sound to all interactive buttons
  document.querySelectorAll('.choice, .btn-go, .btn-next').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.playBtnClick) window.playBtnClick();
    });
  });

  // ── First interaction → start music ──────────────────────────
  function onFirstInteraction() {
    buildAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    document.removeEventListener('click',      onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
  }

  document.addEventListener('click',      onFirstInteraction);
  document.addEventListener('touchstart', onFirstInteraction, { passive: true });

  // ── Music toggle button ───────────────────────────────────────
  musicBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!musicReady) {
      buildAudio();
      document.removeEventListener('click',      onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    musicMuted = !musicMuted;
    if (masterGain) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
      if (musicMuted) {
        masterGain.gain.linearRampToValueAtTime(0,    audioCtx.currentTime + 0.4);
        musicBtn.textContent = '🔇';
        musicBtn.setAttribute('aria-label', 'เปิดเสียงดนตรี');
      } else {
        masterGain.gain.linearRampToValueAtTime(0.62, audioCtx.currentTime + 0.5);
        musicBtn.textContent = '🔊';
        musicBtn.setAttribute('aria-label', 'ปิดเสียงดนตรี');
      }
    }
  });
}());
