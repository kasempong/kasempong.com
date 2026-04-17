'use strict';

// ── Password gate — self-contained overlay on this page ──────────
// Skip if arriving from the main site gate (bd_access already set)
(function () {
  var SECRET  = '28042001';
  var gate    = document.getElementById('bdGate');
  var display = document.getElementById('bdGateDisplay');
  var input   = document.getElementById('bdGateInput');
  var error   = document.getElementById('bdGateError');

  // Already authenticated via main site — hide gate and clear token
  if (sessionStorage.getItem('bd_access')) {
    sessionStorage.removeItem('bd_access');
    gate.classList.add('hidden');
    return;
  }

  function updateDisplay() {
    var len = input.value.length;
    display.textContent = len === 0 ? '\u{1F497}' : '\u{1F493}'.repeat(len);
    display.style.fontSize    = len <= 4 ? '28px' : len <= 6 ? '24px' : '20px';
    display.style.letterSpacing = len <= 4 ? '4px' : '2px';
  }

  function shake() {
    [6, -6, 5, -5, 3, 0].forEach(function (x, i) {
      setTimeout(function () { display.style.transform = 'translateX(' + x + 'px)'; }, i * 55);
    });
    setTimeout(function () { display.style.transform = ''; }, 350);
  }

  gate.addEventListener('click', function () { input.focus(); });

  input.addEventListener('input', function () {
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
    updateDisplay();
    error.textContent = '';
    if (input.value.length === 8) {
      if (input.value === SECRET) {
        gate.classList.add('hidden');
      } else {
        shake();
        error.textContent = '\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E30 \u{1F494}';
        setTimeout(function () { input.value = ''; updateDisplay(); error.textContent = ''; }, 900);
      }
    }
  });

  setTimeout(function () { input.focus(); }, 120);
})();

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
let heartStep   = 0;   // 0=start island, 1-7=plats, 7=goal

// Screen index → heart step when arriving at that screen
// [s0, s-catch, s1/Q1, s2/Q2, s-feed, s3/Q3, s4/Q4, s5/Q5, s6/final]
var SCREEN_HEART_STEP = [0, 0, 1, 2, 3, 4, 5, 6, 7];

// Question number → next screen index
var Q_NEXT = { 1: 3, 2: 4, 3: 6, 4: 7, 5: 8 };

// ── DOM ───────────────────────────────────────────────────────────
const allScreens   = Array.from(document.querySelectorAll('.screen'));
const progressWrap = document.getElementById('progressWrap');
const heartSprite  = document.getElementById('heartSprite');
const plats        = Array.from(document.querySelectorAll('.plat'));      // 6 elements
const conns        = Array.from(document.querySelectorAll('.prog-conn')); // 7 elements
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

  // Stop game when leaving a game screen
  if (currentIdx === 1) catchGame.stop();
  if (currentIdx === 4) feedGame.stop();

  cur.classList.add('exit');
  cur.classList.remove('active');

  setTimeout(function () {
    cur.classList.remove('exit');
    next.classList.add('active');
    currentIdx = nextIdx;

    // Start game when entering a game screen
    if (nextIdx === 1) catchGame.start();
    if (nextIdx === 4) feedGame.start();
  }, 380);
}

// Core backwards navigation — handles single step and platform jumps
function jumpBackTo(targetIdx) {
  if (targetIdx >= currentIdx || targetIdx < 0) return;

  // Dismiss any open popup without triggering the next-screen callback
  pendingAfterHide = null;
  popup.classList.remove('show');

  // Stop any active game when jumping away
  if (currentIdx === 1) catchGame.stop();
  if (currentIdx === 4) feedGame.stop();

  // ── Reset final screen if we're jumping from it ─────────────────
  if (currentIdx === 8) {
    resetScratch();
    var msg = document.getElementById('finalMsg');
    if (msg) msg.classList.remove('visible');
  }

  // ── Reset choices for all screens from targetIdx up to current ───
  for (var s = targetIdx; s < currentIdx; s++) {
    var scr = allScreens[s];
    if (scr) {
      scr.querySelectorAll('.choice').forEach(function (c) {
        c.classList.remove('locked', 'chosen');
      });
    }
  }

  // ── Undo heart progress using SCREEN_HEART_STEP mapping ─────────
  var newHeartStep = SCREEN_HEART_STEP[targetIdx] !== undefined
    ? SCREEN_HEART_STEP[targetIdx]
    : Math.max(0, targetIdx - 1);
  heartStep = newHeartStep;

  // Un-mark platforms
  for (var p = newHeartStep; p < plats.length; p++) {
    plats[p].classList.remove('done');
  }
  // Un-mark connectors
  for (var ci = newHeartStep; ci < conns.length; ci++) {
    conns[ci].classList.remove('done');
  }
  // Un-mark goal
  if (newHeartStep < 7) {
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

    // Restart game if jumping back to a game screen
    if (targetIdx === 1) catchGame.start();
    if (targetIdx === 4) feedGame.start();

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
// step 0 = start island, 1-6 = plat[0-5], 7 = goal
function getHeartTargetX(step) {
  var wrapRect = progressWrap.getBoundingClientRect();
  var el;
  if (step === 0)      el = progStart;
  else if (step >= 7)  el = progGoal;
  else                 el = plats[step - 1];
  var r = el.getBoundingClientRect();
  return r.left + r.width / 2 - wrapRect.left;
}

function advanceHeart(step) {
  // Mark platforms done: steps 1-6 fill plat[0-5]
  var platsDone = Math.min(step, plats.length);
  for (var i = 0; i < platsDone; i++) plats[i].classList.add('done');

  // Mark connectors done: conn[j] done when step > j
  for (var j = 0; j < conns.length; j++) {
    conns[j].classList.toggle('done', step > j);
  }

  // Activate goal on final step
  if (step >= 7) {
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
        goTo(Q_NEXT[q]);
      } else {
        goTo(8);
        setTimeout(launchConfetti, 700);
        setTimeout(initScratch, 900);
      }
    });
  });
});

// ── Catch the Hearts mini-game ────────────────────────────────────
var catchGame = (function () {
  var canvas, ctx, hearts, caught, total, rafId, active;

  function init() {
    canvas = document.getElementById('catchCanvas');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', function (e) {
      if (!active) return;
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var x = (e.clientX - rect.left) * scaleX;
      var y = (e.clientY - rect.top)  * scaleY;
      onTap(x, y);
    }, { passive: true });
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || 300;
  }

  var HEART_EMOJIS = ['💗','💖','💕','🩷','❤️'];

  function spawnHeart(offsetY) {
    return {
      x:     Math.random() * (canvas.width - 80) + 40,
      y:     -(offsetY || 0) - 40,
      vy:    Math.random() * 1.8 + 1.4,
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
    };
  }

  function tick() {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hearts = hearts.filter(function (h) {
      h.y += h.vy;
      ctx.font = '52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, h.x, h.y);
      return h.y < canvas.height + 60;
    });

    // Keep 3–4 hearts falling at a time (up to remaining uncaught)
    var remaining = total - caught - hearts.length;
    while (hearts.length < 3 && remaining > 0) {
      hearts.push(spawnHeart(Math.random() * 80));
      remaining--;
    }

    rafId = requestAnimationFrame(tick);
  }

  function onTap(x, y) {
    if (!active) return;
    var hitIdx = -1;
    hearts.forEach(function (h, i) {
      var dx = h.x - x, dy = h.y - y;
      if (dx * dx + dy * dy < 1600 && hitIdx === -1) hitIdx = i; // 40px radius
    });
    if (hitIdx === -1) return;

    hearts.splice(hitIdx, 1);
    caught++;
    document.getElementById('catchCounter').textContent = caught + ' / 10';

    if (caught >= total) {
      stop();
      heartStep++;
      advanceHeart(heartStep);
      setTimeout(function () { goTo(2); }, 600);
    }
  }

  function start() {
    if (!canvas) init();
    hearts = [];
    caught = 0;
    total  = 10;
    active = true;
    document.getElementById('catchCounter').textContent = '0 / 10';
    // Defer resize() until the screen is visible — offsetWidth is 0 during transition
    requestAnimationFrame(function () {
      resize();
      for (var i = 0; i < 3; i++) hearts.push(spawnHeart(i * 90));
      if (rafId) cancelAnimationFrame(rafId);
      tick();
    });
  }

  function stop() {
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  return { start: start, stop: stop };
}());

// ── Feed the Pet mini-game ─────────────────────────────────────────
var feedGame = (function () {
  var PETS = [
    { name: 'โมโม่',   img: 'momo.webp'  },
    { name: 'ดิ๊กกี้', img: 'dicky.webp' },
    { name: 'โชยุ',    img: 'shoyu.webp' },
  ];
  // Drag this many pixels over the pet zone to fill the bar fully (~5 sec per pet)
  var FILL_DIST = 2000;
  var FOODS    = ['🍗','🍚','🍖','🐟','🍎','🍊','🍇','🍓','🫐'];
  var SPARKLES = ['💕','✨','🌸','💫','🩷','⭐'];

  var currentPet    = 0;
  var fillPct       = 0;
  var petDone       = false;
  var dragging      = false;
  var lastDragX     = 0, lastDragY = 0;
  var lastSparkle   = 0;
  var lastBump      = 0;
  var petZoneEl     = null;
  var _nextPetTimer = null;
  var _docMove      = null;
  var _docUp        = null;

  // ── Bar ──────────────────────────────────────────────────────
  function setBar(pct) {
    fillPct = Math.min(100, pct);
    document.getElementById('feedBarFill').style.width = fillPct + '%';
    var now = Date.now();
    if (fillPct > 0 && fillPct % 15 < 3 && now - lastBump > 400) {
      lastBump = now;
      var icon = document.getElementById('feedBarEmoji');
      icon.classList.remove('bump');
      void icon.offsetWidth;
      icon.classList.add('bump');
    }
  }

  // ── Floating sparkle at local coords inside pet zone ─────────
  function sparkle(lx, ly) {
    var layer = document.getElementById('feedHeartsLayer');
    if (!layer) return;
    var el = document.createElement('span');
    el.className = 'feed-float-heart';
    el.textContent = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
    el.style.left = (lx + Math.random() * 30 - 15) + 'px';
    el.style.top  = (ly + Math.random() * 20 - 10) + 'px';
    layer.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); }, { once: true });
  }

  // ── Pet satisfied ─────────────────────────────────────────────
  function completePet() {
    if (petDone) return;
    petDone  = true;
    dragging = false;

    var ghost = document.getElementById('feedDragGhost');
    if (ghost) ghost.style.display = 'none';
    if (petZoneEl) petZoneEl.classList.remove('stroking');

    var img = document.getElementById('feedPetImg');
    img.classList.remove('happy');
    void img.offsetWidth;
    img.classList.add('happy');

    // Burst of sparkles across pet zone
    if (petZoneEl) {
      var r = petZoneEl.getBoundingClientRect();
      for (var i = 0; i < 8; i++) {
        (function (delay) {
          setTimeout(function () {
            sparkle(
              r.width  * Math.random(),
              r.height * 0.3 + r.height * 0.5 * Math.random()
            );
          }, delay);
        })(i * 80);
      }
    }

    currentPet++;
    if (currentPet < PETS.length) {
      _nextPetTimer = setTimeout(function () { petDone = false; showPet(); }, 800);
    } else {
      _nextPetTimer = setTimeout(function () {
        heartStep++;
        advanceHeart(heartStep);
        goTo(5);
      }, 800);
    }
  }

  // ── Show current pet ──────────────────────────────────────────
  function showPet() {
    var pet = PETS[currentPet];
    document.getElementById('feedTitle').textContent = 'ให้อาหาร ' + pet.name + '! 🐾';
    var img = document.getElementById('feedPetImg');
    img.src = pet.img;
    img.classList.remove('happy');
    setBar(0);
  }

  // ── Build food shelf — each item is a drag handle ─────────────
  function buildShelf() {
    var shelf = document.getElementById('feedFoodShelf');
    shelf.innerHTML = '';
    FOODS.forEach(function (emoji) {
      var item = document.createElement('div');
      item.className = 'food-item';
      item.textContent = emoji;

      item.addEventListener('pointerdown', function (e) {
        if (petDone) return;
        e.preventDefault();
        try { item.setPointerCapture(e.pointerId); } catch (_) {}

        dragging  = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        // Show ghost at finger position
        var ghost = document.getElementById('feedDragGhost');
        if (ghost) {
          ghost.textContent    = emoji;
          ghost.style.left     = e.clientX + 'px';
          ghost.style.top      = e.clientY + 'px';
          ghost.style.display  = 'block';
        }
        document.getElementById('feedBarEmoji').textContent = emoji;
      });

      shelf.appendChild(item);
    });
  }

  // ── Global pointer listeners (capture drag anywhere on screen) ─
  function attachDocListeners() {
    _docMove = function (e) {
      if (!dragging || petDone) return;

      // Move ghost to finger
      var ghost = document.getElementById('feedDragGhost');
      if (ghost) {
        ghost.style.left = e.clientX + 'px';
        ghost.style.top  = e.clientY + 'px';
      }

      if (!petZoneEl) return;
      var rect    = petZoneEl.getBoundingClientRect();
      var overPet = e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (overPet) {
        petZoneEl.classList.add('stroking');

        // Accumulate drag distance → fill bar
        var dx   = e.clientX - lastDragX;
        var dy   = e.clientY - lastDragY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        setBar(fillPct + (dist / FILL_DIST) * 100);

        // Throttled sparkles at local pet-zone coords
        var now = Date.now();
        if (now - lastSparkle > 100) {
          lastSparkle = now;
          sparkle(e.clientX - rect.left, e.clientY - rect.top);
        }

        if (fillPct >= 100) completePet();
      } else {
        petZoneEl.classList.remove('stroking');
      }

      lastDragX = e.clientX;
      lastDragY = e.clientY;
    };

    _docUp = function () {
      if (!dragging) return;
      dragging = false;
      var ghost = document.getElementById('feedDragGhost');
      if (ghost) ghost.style.display = 'none';
      if (petZoneEl) petZoneEl.classList.remove('stroking');
    };

    document.addEventListener('pointermove',   _docMove);
    document.addEventListener('pointerup',     _docUp);
    document.addEventListener('pointercancel', _docUp);
  }

  function detachDocListeners() {
    if (_docMove) { document.removeEventListener('pointermove',   _docMove); _docMove = null; }
    if (_docUp)   {
      document.removeEventListener('pointerup',     _docUp);
      document.removeEventListener('pointercancel', _docUp);
      _docUp = null;
    }
  }

  // ── Public ────────────────────────────────────────────────────
  function start() {
    petZoneEl   = document.getElementById('feedPetZone');
    fillPct     = 0;
    petDone     = false;
    dragging    = false;
    currentPet  = 0;
    lastBump    = 0;
    lastSparkle = 0;
    buildShelf();
    attachDocListeners();
    showPet();
    document.getElementById('feedBarEmoji').textContent = FOODS[0];
  }

  function stop() {
    detachDocListeners();
    dragging = false;
    if (_nextPetTimer) { clearTimeout(_nextPetTimer); _nextPetTimer = null; }
    var ghost = document.getElementById('feedDragGhost');
    if (ghost) ghost.style.display = 'none';
    if (petZoneEl) petZoneEl.classList.remove('stroking');
    var layer = document.getElementById('feedHeartsLayer');
    if (layer) layer.innerHTML = '';
  }

  return { start: start, stop: stop };
}());

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

// Goal reached → clicking goes back to Q5 (screen 7)
progGoal.addEventListener('click', function () {
  if (progGoal.classList.contains('reached') && currentIdx > 7) {
    jumpBackTo(7);
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
  // Spawn 100 particles (capped for performance on older/low-end devices)
  for (var i = 0; i < 100; i++) {
    particles.push(createParticle());
  }
  if (rafId) cancelAnimationFrame(rafId);
  tickConfetti();

  // Second wave
  setTimeout(function () {
    for (var i = 0; i < 50; i++) {
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
  sc.classList.remove('revealed');
  var sctx = sc.getContext('2d');
  sctx.clearRect(0, 0, sc.width, sc.height);
  // Hide image again so it doesn't flash before initScratch redraws the canvas
  var rev = document.querySelector('.scratch-reveal');
  if (rev) rev.classList.remove('ready');
}

function initScratch() {
  var card      = document.getElementById('scratchCard');
  var sc        = document.getElementById('scratchCanvas');
  var finalMsg  = document.getElementById('finalMsg');
  if (!card || !sc) return;

  var w        = card.offsetWidth;
  var h        = card.offsetHeight;
  sc.width     = w;
  sc.height    = h;

  var sctx     = sc.getContext('2d');
  var isDown   = false;
  var hasScratch = false;
  var checkTimer = null;

  // ── Draw the scratch layer ───────────────────────────────────────
  var reveal = card.querySelector('.scratch-reveal');
  var opaquePixels = 0;  // set after masking

  function drawScratchLayer() {
    sctx.clearRect(0, 0, w, h);

    // Full gradient fill (will be masked to image shape below)
    var grad = sctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0,   '#f0a0d0');
    grad.addColorStop(0.5, '#d070e8');
    grad.addColorStop(1,   '#b060ff');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, w, h);

    // Sparkle dots
    sctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (var i = 0; i < 60; i++) {
      var dx = Math.random() * w;
      var dy = Math.random() * h;
      var dr = Math.random() * 3 + 1;
      sctx.beginPath();
      sctx.arc(dx, dy, dr, 0, Math.PI * 2);
      sctx.fill();
    }

    // Stars ✦
    sctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    sctx.font = 'bold 16px sans-serif';
    ['✦','✧','⋆','✦','✧','⋆','✦','✧'].forEach(function (s) {
      sctx.fillText(s, Math.random() * (w - 30) + 8, Math.random() * (h - 30) + 24);
    });

    // Center hint text
    sctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    sctx.font = 'bold ' + Math.round(Math.min(w, h) * 0.11) + 'px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('ขูดเลย!', w / 2, h / 2 - h * 0.1);
    sctx.font = Math.round(Math.min(w, h) * 0.14) + 'px sans-serif';
    sctx.fillText('✨', w / 2, h / 2 + h * 0.12);
  }

  function applyImageMask(imgEl) {
    // ── Compute object-fit:contain render bounds ─────────────────────
    // The <img> uses object-fit:contain, so if image ratio ≠ card ratio
    // it renders with letterbox gaps. We must draw the mask at the exact
    // same position/size, otherwise the mask won't align with the image.
    var imgRatio  = imgEl.naturalWidth / imgEl.naturalHeight;
    var cardRatio = w / h;
    var drawW, drawH, drawX, drawY;
    if (imgRatio > cardRatio) {
      // Image wider → fit to card width, letterbox top/bottom
      drawW = w;
      drawH = w / imgRatio;
      drawX = 0;
      drawY = (h - drawH) / 2;
    } else {
      // Image taller → fit to card height, letterbox left/right
      drawH = h;
      drawW = h * imgRatio;
      drawX = (w - drawW) / 2;
      drawY = 0;
    }

    // ── Build binary alpha mask at the correct position ──────────────
    var maskC = document.createElement('canvas');
    maskC.width = w; maskC.height = h;
    var mc = maskC.getContext('2d');
    mc.drawImage(imgEl, drawX, drawY, drawW, drawH);
    var md = mc.getImageData(0, 0, w, h);
    for (var k = 3; k < md.data.length; k += 4) {
      md.data[k] = md.data[k] >= 64 ? 255 : 0;
    }
    mc.putImageData(md, 0, 0);

    // Apply hard binary mask — scratch layer now exactly matches image
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(maskC, 0, 0, w, h);
    sctx.globalCompositeOperation = 'source-over';

    // Count opaque pixels for accurate reveal threshold
    var px = sctx.getImageData(0, 0, w, h).data;
    opaquePixels = 0;
    for (var j = 3; j < px.length; j += 4) {
      if (px[j] >= 128) opaquePixels++;
    }

    // Wait one frame so the browser paints the canvas before showing image
    requestAnimationFrame(function () {
      if (reveal) reveal.classList.add('ready');
    });
  }

  drawScratchLayer();

  // Apply mask via the reveal image (same-origin, no CORS issues)
  var imgEl = reveal ? reveal.querySelector('img') : null;
  if (imgEl) {
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      applyImageMask(imgEl);
    } else {
      imgEl.addEventListener('load', function () { applyImageMask(imgEl); }, { once: true });
    }
  } else {
    if (reveal) reveal.classList.add('ready');
  }

  // ── Scratch erase helpers ────────────────────────────────────────
  function scratchAt(x, y) {
    sctx.globalCompositeOperation = 'destination-out';
    sctx.beginPath();
    sctx.arc(x, y, Math.min(w, h) * 0.12, 0, Math.PI * 2);
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
    if (!rect.width || !rect.height) return null; // guard: canvas not yet rendered
    var src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (w / rect.width),
      y: (src.clientY - rect.top)  * (h / rect.height),
    };
  }

  function checkReveal() {
    if (!opaquePixels) return;
    var pixels    = sctx.getImageData(0, 0, w, h).data;
    var remaining = 0;
    for (var i = 3; i < pixels.length; i += 4) {
      if (pixels[i] >= 128) remaining++;
    }
    // Trigger when 60% of the image's own opaque pixels are scratched
    if ((opaquePixels - remaining) / opaquePixels > 0.6) {
      autoReveal();
    }
  }

  function autoReveal() {
    sc.classList.add('revealed');          // fade canvas to opacity 0
    sc.removeEventListener('pointerdown',  onDown);
    sc.removeEventListener('pointermove',  onMove);
    sc.removeEventListener('pointerup',    onUp);
    sc.removeEventListener('pointercancel',onUp);

    // Magical reveal chime
    if (window.playRevealSound) window.playRevealSound();

    // Show final message + share button after canvas fades
    setTimeout(function () {
      if (finalMsg) finalMsg.classList.add('visible');
      showShareBtn();
    }, 650);
  }

  // ── Pointer / touch events ───────────────────────────────────────
  function onDown(e) {
    isDown = true;
    var pos = getPos(e);
    if (pos) scratchAt(pos.x, pos.y);
    e.preventDefault();
  }
  function onMove(e) {
    if (!isDown) return;
    var pos = getPos(e);
    if (pos) scratchAt(pos.x, pos.y);
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

// ── Share card helpers ─────────────────────────────────────────────
function showShareBtn() {
  var btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.style.display = '';
  btn.addEventListener('click', generateShareCard, { once: true });
}

function _roundRectPath(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function generateShareCard() {
  var finalMsgText = (document.getElementById('finalMsg') || {}).textContent || '';
  var revealImg    = document.querySelector('.scratch-reveal img');

  // Load the actual page background image so the card looks identical
  var bgImg = new Image();
  function proceed() { _drawShareCard(bgImg.complete && bgImg.naturalWidth ? bgImg : null, revealImg, finalMsgText); }
  bgImg.onload  = proceed;
  bgImg.onerror = proceed;
  bgImg.src = 'bg-hbd2.jpeg';
  // Safety timeout — draw anyway after 2 s if image stalls
  setTimeout(function () { if (!bgImg.complete) proceed(); }, 2000);
}

function _drawShareCard(bgImg, revealImg, finalMsgText) {
  var W = 1080, H = 1920;
  var canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  var c = canvas.getContext('2d');
  var MX = W / 2;   // horizontal center

  // ── 1. Background: actual blurred JPEG (same as the page) ──────
  if (bgImg) {
    c.save();
    c.filter = 'blur(28px)';
    var scale = Math.max(W / bgImg.width, H / bgImg.height);
    var bw = bgImg.width * scale, bh = bgImg.height * scale;
    c.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    c.restore();
  } else {
    var fbGrad = c.createLinearGradient(0, 0, W, H);
    fbGrad.addColorStop(0,   '#ffc8e0');
    fbGrad.addColorStop(0.4, '#e0a0f0');
    fbGrad.addColorStop(0.7, '#f0c090');
    fbGrad.addColorStop(1,   '#f0a8c8');
    c.fillStyle = fbGrad;
    c.fillRect(0, 0, W, H);
  }

  // ── 2. Page screen overlay (rgba(255,240,250,0.60)) ─────────────
  c.fillStyle = 'rgba(255, 240, 250, 0.60)';
  c.fillRect(0, 0, W, H);

  // ── 3. Cute decorative border ───────────────────────────────────
  var BW = 38;
  // Outer gradient border
  var bGrad = c.createLinearGradient(0, 0, W, H);
  bGrad.addColorStop(0,    '#ff6fa3');
  bGrad.addColorStop(0.33, '#c77dff');
  bGrad.addColorStop(0.66, '#ffb347');
  bGrad.addColorStop(1,    '#ff6fa3');
  c.strokeStyle = bGrad;
  c.lineWidth = BW;
  c.strokeRect(BW / 2, BW / 2, W - BW, H - BW);
  // Inner white hairline
  c.strokeStyle = 'rgba(255,255,255,0.60)';
  c.lineWidth = 5;
  c.strokeRect(BW + 8, BW + 8, W - (BW + 8) * 2, H - (BW + 8) * 2);
  // Corner flowers
  c.font = '72px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  [['🌸', 56, 56], ['🌸', W - 56, 56], ['🌸', 56, H - 56], ['🌸', W - 56, H - 56]].forEach(function (p) {
    c.fillText(p[0], p[1], p[2]);
  });
  // Edge sparkles
  for (var si = 0; si < 24; si++) {
    var t = si / 24;
    var ex, ey;
    if (t < 0.25)      { ex = BW + 14;          ey = t / 0.25 * H; }
    else if (t < 0.5)  { ex = W - BW - 14;      ey = (t - 0.25) / 0.25 * H; }
    else if (t < 0.75) { ex = (t - 0.5) / 0.25 * W; ey = BW + 14; }
    else               { ex = (t - 0.75) / 0.25 * W; ey = H - BW - 14; }
    c.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.5 + 0.25) + ')';
    c.beginPath();
    c.arc(ex, ey, Math.random() * 5 + 2, 0, Math.PI * 2);
    c.fill();
  }

  // ── 4. Progress bar (all completed) ─────────────────────────────
  var barY  = BW + 80;
  var barX0 = 160, barX1 = W - 160;
  var barGrad = c.createLinearGradient(barX0, 0, barX1, 0);
  barGrad.addColorStop(0, '#ff6fa3');
  barGrad.addColorStop(1, '#c77dff');
  c.strokeStyle = barGrad;
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(barX0, barY);
  c.lineTo(barX1, barY);
  c.stroke();
  // Platform dots + goal heart
  var platT = [0, 0.2, 0.4, 0.6, 0.8];
  platT.forEach(function (t) {
    var dx = barX0 + t * (barX1 - barX0);
    var dg = c.createRadialGradient(dx, barY, 0, dx, barY, 22);
    dg.addColorStop(0, '#ff9fc0');
    dg.addColorStop(1, '#c77dff');
    c.fillStyle = dg;
    c.beginPath();
    c.arc(dx, barY, 22, 0, Math.PI * 2);
    c.fill();
  });
  c.font = '48px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('💗', barX1, barY);

  // ── 5. Title ─────────────────────────────────────────────────────
  var yPos = barY + 110;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(60, 0, 100, 0.85)';
  c.shadowBlur   = 20;
  c.fillStyle = '#ffffff';
  c.font = 'bold italic 90px Sriracha, sans-serif';
  c.fillText('🎂 Happy Birthday 🎂', MX, yPos);
  yPos += 128;
  c.fillStyle = '#ffffff';
  c.font = 'bold italic 108px Sriracha, sans-serif';
  c.fillText('TonTon!', MX, yPos);
  yPos += 60;
  c.shadowBlur = 0;
  c.font = '36px Sriracha, sans-serif';
  c.fillStyle = 'rgba(255, 255, 255, 0.75)';
  c.fillText('from Nueng with love \uD83E\uDD0D', MX, yPos);
  yPos += 60;

  // ── 6. Scratch card — image drawn at natural aspect ratio ─────────
  var imgRatio = (revealImg && revealImg.naturalWidth && revealImg.naturalHeight)
    ? revealImg.naturalWidth / revealImg.naturalHeight
    : 1.215;                                  // fallback (2333÷1919)
  var cardW = 940;
  var cardH = Math.round(cardW / imgRatio);   // preserves true ratio (≈774)
  var cardX = MX - cardW / 2;
  var cardY = yPos;
  if (revealImg && revealImg.complete && revealImg.naturalWidth > 0) {
    c.drawImage(revealImg, cardX, cardY, cardW, cardH);
  } else {
    c.font = '140px sans-serif';
    c.textAlign    = 'center';
    c.textBaseline = 'middle';
    c.globalAlpha  = 0.55;
    c.fillText('📸', MX, cardY + cardH / 2);
    c.globalAlpha  = 1;
  }
  yPos = cardY + cardH + 60;

  // ── 7. Final message text (read from DOM) ────────────────────────
  var msgLines = finalMsgText.trim() ? finalMsgText.trim().split('\n') : [];
  if (msgLines.length) {
    c.textAlign    = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle    = '#7a40a0';
    c.font         = 'italic 54px Sriracha, sans-serif';
    msgLines.forEach(function (line, li) {
      c.fillText(line.trim(), MX, yPos + li * 72);
    });
    yPos += msgLines.length * 72 + 40;
  }

  // ── 8. Deco emoji — evenly distributed in remaining space ────────
  var sbY_est  = H - BW - 30 - 110;          // estimated footer top
  var decoEmojis = ['💕','✨','🌸','💜','🎀','⭐'];
  var decoRows   = 2, decoCols = 3;
  var decoSpace  = sbY_est - yPos;            // available vertical gap
  var rowStep    = Math.max(100, Math.floor(decoSpace / (decoRows + 1)));
  c.font = '66px sans-serif';
  c.textAlign    = 'center';
  c.textBaseline = 'middle';
  decoEmojis.forEach(function (em, i) {
    var col = i % decoCols;
    var row = Math.floor(i / decoCols);
    var dex = 160 + col * Math.round((W - 320) / (decoCols - 1));
    var dey = yPos + (row + 1) * rowStep - rowStep / 2;
    c.fillText(em, dex, dey);
  });

  // ── 9. Footer — plain text ───────────────────────────────────────
  c.font         = '30px sans-serif';
  c.textAlign    = 'center';
  c.textBaseline = 'middle';
  c.fillStyle    = 'rgba(120, 80, 160, 0.42)';
  c.shadowBlur   = 0;
  c.fillText('from kasempong.com \u2726', MX, H - BW - 55);

  // ── Share or download ────────────────────────────────────────────
  canvas.toBlob(function (blob) {
    var file = new File([blob], 'happy-birthday-tonton.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'Happy Birthday TonTon! 💕',
        text:  'สร้างโดยหนึ่ง เพื่ออวยพรต้นในวันพิเศษ 🎂',
      }).catch(function () {});
    } else {
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = 'happy-birthday-tonton.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
  });
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

  // ── Magical reveal chime (rising arpeggio played on scratch-card reveal) ──
  window.playRevealSound = function () {
    if (!audioCtx || musicMuted) return;
    var now   = audioCtx.currentTime;
    // C5 → E5 → G5 → C6: sparkly rising arpeggio
    var notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach(function (freq, i) {
      var t   = now + i * 0.14;
      var osc = audioCtx.createOscillator();
      var env = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.28, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(env);
      env.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    });
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
