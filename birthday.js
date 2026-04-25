'use strict';

// ── Password gate — self-contained overlay on this page ──────────
// Skip if arriving from the main site gate (bd_access already set)
(function () {
  // SHA-256 of the correct answer — password never stored in plain text
  var SECRET_HASH = '4f800c6fd9fb3a5068cb0f39bf6608e9327353ffc1106dd36ce97474a19e19d1';
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

  var attempts = 0;
  var locked   = false;
  var checking = false;   // prevent double async callback on rapid input

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

  function onWrong() {
    attempts++;
    shake();
    if (attempts >= 5) {
      locked = true;
      input.disabled = true;
      error.textContent = '\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01 30 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35 \u{1F512}';
      setTimeout(function () {
        locked = false; attempts = 0;
        input.disabled = false;
        input.value = ''; updateDisplay(); error.textContent = '';
        input.focus();
      }, 30000);
    } else {
      error.textContent = '\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E30 \u{1F494} (' + (5 - attempts) + ' \u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D)';
      setTimeout(function () { input.value = ''; updateDisplay(); error.textContent = ''; }, 900);
    }
  }

  // Hash the input with Web Crypto and compare — ~1ms, invisible to user
  function checkHash(val, callback) {
    if (!window.crypto || !window.crypto.subtle) {
      // Fallback for very old browsers — plain compare (rare edge case)
      callback(val === atob('MjgwNDIwMDE='));
      return;
    }
    var enc = new TextEncoder().encode(val);
    window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      var hex = Array.from(new Uint8Array(buf))
                     .map(function (b) { return b.toString(16).padStart(2, '0'); })
                     .join('');
      callback(hex === SECRET_HASH);
    });
  }

  gate.addEventListener('click', function () { if (!locked) input.focus(); });

  input.addEventListener('input', function () {
    if (locked) return;
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
    updateDisplay();
    error.textContent = '';
    if (input.value.length === 8) {
      if (checking) return;
      checking = true;
      var val = input.value;
      checkHash(val, function (ok) {
        checking = false;
        if (ok) {
          gate.classList.add('hidden');
        } else {
          onWrong();
        }
      });
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
let heartStep   = 0;   // 0=start island, 1-7=plats, 8=goal

// Screen index → heart step when arriving at that screen
// [s0, s-mag1, s-catch, s-mag2, s1/Q1, s2/Q2, s-mag3, s-feed, s-mag4, s3/Q3, s4/Q4, s-bouquet, s5/Q5, s6/final]
var SCREEN_HEART_STEP = [0, 0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 7, 8];

// Question number → next screen index
var Q_NEXT = { 1: 5, 2: 6, 3: 10, 4: 11, 5: 13 };

// ── DOM ───────────────────────────────────────────────────────────
const allScreens   = Array.from(document.querySelectorAll('.screen'));
const progressWrap = document.getElementById('progressWrap');
const heartSprite  = document.getElementById('heartSprite');
const plats        = Array.from(document.querySelectorAll('.plat'));      // 7 elements
const conns        = Array.from(document.querySelectorAll('.prog-conn')); // 8 elements
const progStart    = document.getElementById('progStart');
const progGoal     = document.getElementById('progGoal');
const popup        = document.getElementById('popup');
const popupText    = document.getElementById('popupText');
const startBtn     = document.getElementById('startBtn');

// ── Screen transitions ────────────────────────────────────────────
var screensContainer = document.getElementById('screensContainer');

function goTo(nextIdx) {
  if (nextIdx < 0 || nextIdx >= allScreens.length) return;
  var cur  = allScreens[currentIdx];
  var next = allScreens[nextIdx];
  if (!cur || !next) return;

  // Stop game when leaving a game screen
  if (cur.id === 's-catch')   catchGame.stop();
  if (cur.id === 's-feed')    feedGame.stop();
  if (cur.id === 's-bouquet') bouquetGame.stop();

  cur.classList.add('exit');
  cur.classList.remove('active');

  setTimeout(function () {
    cur.classList.remove('exit');
    next.classList.add('active');
    currentIdx = nextIdx;

    // Start game when entering a game screen
    if (next.id === 's-catch')   catchGame.start();
    if (next.id === 's-feed')    feedGame.start();
    if (next.id === 's-bouquet') bouquetGame.start();
  }, 380);
}

// Core backwards navigation — handles single step and platform jumps
function jumpBackTo(targetIdx) {
  if (targetIdx >= currentIdx || targetIdx < 0) return;

  // Dismiss any open popup without triggering the next-screen callback
  pendingAfterHide = null;
  popup.classList.remove('show');

  // Stop any active game when jumping away
  var curScr = allScreens[currentIdx];
  if (curScr && curScr.id === 's-catch')   catchGame.stop();
  if (curScr && curScr.id === 's-feed')    feedGame.stop();
  if (curScr && curScr.id === 's-bouquet') bouquetGame.stop();

  // ── Reset final screen if we're jumping from it ─────────────────
  if (currentIdx === 13) {
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
  if (newHeartStep < 8) {
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
    var tgtScr = allScreens[targetIdx];
    if (tgtScr && tgtScr.id === 's-catch')   catchGame.start();
    if (tgtScr && tgtScr.id === 's-feed')    feedGame.start();
    if (tgtScr && tgtScr.id === 's-bouquet') bouquetGame.start();

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
// step 0 = start island, 1-7 = plat[0-6], 8 = goal
function getHeartTargetX(step) {
  var wrapRect = progressWrap.getBoundingClientRect();
  var el;
  if (step === 0)      el = progStart;
  else if (step >= 8)  el = progGoal;
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
  if (step >= 8) {
    progGoal.classList.add('reached');
    progGoal.style.cursor = 'pointer';
  }

  heartSprite.style.left = getHeartTargetX(step) + 'px';

  // Bounce animation
  heartSprite.classList.remove('bounce');
  void heartSprite.offsetWidth;
  heartSprite.classList.add('bounce');
  heartSprite.addEventListener('animationend', function () {
    heartSprite.classList.remove('bounce');
  }, { once: true });
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
        goTo(13);
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
    var dpr = window.devicePixelRatio || 1;
    var w   = canvas.offsetWidth  || 300;
    var h   = canvas.offsetHeight || 300;
    canvas.width        = Math.round(w * dpr);
    canvas.height       = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);   // draw in CSS pixels — hit detection stays correct
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
      setTimeout(function () { goTo(3); }, 600);  // → s-mag2 (momo cheer)
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
  // Drag this many pixels over the pet zone to fill the bar fully (~7 sec per pet)
  var FILL_DIST = 2800;
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
        goTo(8);  // → s-mag4 (momo thanks)
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

        // Dim the shelf item so it looks "picked up"
        item.classList.add('food-held');

        // Show ghost at finger position
        var ghost = document.getElementById('feedDragGhost');
        if (ghost) {
          ghost.textContent   = emoji;
          ghost.style.left    = e.clientX + 'px';
          ghost.style.top     = e.clientY + 'px';
          ghost.style.display = 'block';
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
      // Un-dim all shelf items
      var shelf = document.getElementById('feedFoodShelf');
      if (shelf) shelf.querySelectorAll('.food-held').forEach(function (el) {
        el.classList.remove('food-held');
      });
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

// ── Build the Bouquet (SVG + GSAP) ────────────────────────────────
var bouquetGame = (function () {
  // ── Flower definitions — each has 4 growth stages ────────────
  var DEFS = [
    { stages: ['fl-0-s0.webp','fl-0-s1.webp','fl-0-s2.webp','fl-0-s3.webp'], label: '🌸 Rose',           name: 'Rose' },
    { stages: ['fl-1-s0.webp','fl-1-s1.webp','fl-1-s2.webp','fl-1-s3.webp'], label: '🌸 Spray Rose',     name: 'Spray Rose' },
    { stages: ['fl-2-s0.webp','fl-2-s1.webp','fl-2-s2.webp','fl-2-s3.webp'], label: '🌷 Carnation',      name: 'Carnation' },
    { stages: ['fl-3-s0.webp','fl-3-s1.webp','fl-3-s2.webp','fl-3-s3.webp'], label: '🌺 Lisianthus',     name: 'Lisianthus' },
    { stages: ['fl-4-s0.webp','fl-4-s1.webp','fl-4-s2.webp','fl-4-s3.webp'], label: '💜 Stock Flower',   name: 'Stock Flower' },
    { stages: ['fl-5-s0.webp','fl-5-s1.webp','fl-5-s2.webp','fl-5-s3.webp'], label: '🌿 Wax Flower',     name: 'Wax Flower' },
  ];

  // Stage thresholds: switch image when fillPct crosses each boundary
  var STAGE_BREAKS = [0, 33, 66, 99]; // pct at which each stage image shows

  var FILL_DIST = 450;   // px drag = 100% fill
  var HIT_PAD   = 60;    // px padding around flower hit zone

  var currentFlower  = 0;
  var fillPct        = 0;
  var dragging       = false;
  var blooming       = false;
  var lastX = 0, lastY = 0;
  var activeTimeline = null;
  var activePetG     = null;   // fallback ref when GSAP isn't available
  var activeCX       = 0;
  var activeFY       = 0;
  var ghostEl        = null;
  var canEl          = null;
  var _doneTimer     = null;
  var _bloomTimer    = null;
  var _nextFlowTimer = null;
  var _canDown       = null;
  var _onCanMove     = null;
  var _onCanUp       = null;
  var _lastSparkTime = 0;
  var _currentStage  = 0;   // which stage image is currently shown (0-3)

  // ── Watering sparkle burst ────────────────────────────────────
  function spawnWaterSparks(flEl, intensity) {
    if (!flEl) return;
    intensity = intensity || 1;
    var r  = flEl.getBoundingClientRect();
    var cx = r.left + r.width  * 0.50;
    var cy = r.top  + r.height * 0.38;
    var colors = ['#7DDFFF','#FFB3E6','#FFD700','#C084FC','#FF9FE5','#80FFD4','#FFFFFF','#FFA5C8'];
    var count = Math.round(5 * intensity);
    for (var i = 0; i < count; i++) {
      (function (i) {
        var sp  = document.createElement('div');
        sp.className = 'water-spark';
        var ang = Math.random() * Math.PI * 2;
        var d   = (18 + Math.random() * 32) * intensity;
        sp.style.cssText = [
          'left:'       + (cx + (Math.random()-0.5)*r.width*0.5 - 3) + 'px',
          'top:'        + (cy + (Math.random()-0.5)*r.height*0.3 - 3) + 'px',
          'background:' + colors[Math.floor(Math.random() * colors.length)],
          '--wx:'       + Math.round(Math.cos(ang) * d) + 'px',
          '--wy:'       + Math.round(Math.sin(ang) * d) + 'px',
          'animation-delay:' + (i * 20) + 'ms',
          'width:'      + (4 + Math.random()*5) + 'px',
          'height:'     + (4 + Math.random()*5) + 'px',
        ].join(';');
        document.body.appendChild(sp);
        setTimeout(function () { sp.parentNode && sp.parentNode.removeChild(sp); }, 750);
      }(i));
    }
  }

  // ── Stage-up burst: big pop + emoji floaters when flower grows ──
  function stageUpBurst(flEl, stage) {
    if (!flEl) return;
    var r  = flEl.getBoundingClientRect();
    var cx = r.left + r.width  * 0.5;
    var cy = r.top  + r.height * 0.4;
    var emojis = ['✨','🌸','💧','⭐','💕','🌿','💦'];
    // Big sparkle shower
    spawnWaterSparks(flEl, 2.5);
    // Floating emoji particles
    for (var i = 0; i < 6; i++) {
      (function(i) {
        var em = document.createElement('div');
        em.className = 'grow-burst-emoji';
        em.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        var ox = (Math.random() - 0.5) * r.width * 1.4;
        var oy = -(50 + Math.random() * 80);
        em.style.cssText = [
          'left:'  + (cx - 12 + ox * 0.3) + 'px',
          'top:'   + (cy - 12) + 'px',
          '--ex:'  + Math.round(ox) + 'px',
          '--ey:'  + Math.round(oy) + 'px',
          'animation-delay:' + (i * 55) + 'ms',
          'font-size:' + (16 + Math.random() * 10) + 'px',
        ].join(';');
        document.body.appendChild(em);
        setTimeout(function() { em.parentNode && em.parentNode.removeChild(em); }, 1200);
      }(i));
    }
  }

  function setFlowerGlow(flEl, pct) {
    if (!flEl) return;
    var g1 = Math.round(6  + pct * 0.28);
    var g2 = Math.round(12 + pct * 0.46);
    var a1 = (0.40 + pct * 0.006).toFixed(2);
    var a2 = (0.25 + pct * 0.005).toFixed(2);
    flEl.style.filter =
      'drop-shadow(0 0 ' + g1 + 'px rgba(255,210,120,' + a1 + ')) ' +
      'drop-shadow(0 0 ' + g2 + 'px rgba(200,100,255,' + a2 + '))';
  }

  function resetFlowerGlow(flEl) {
    if (!flEl) return;
    flEl.style.filter = 'drop-shadow(0 10px 26px rgba(160,60,220,0.28))';
  }

  // ── Water ring progress (SVG stroke-dashoffset — reliable on iOS) ──
  function setRing(pct) {
    var fill = document.getElementById('waterRingFill');
    if (!fill) return;
    var circumference = 270.18;   // 2π × r=43
    fill.style.strokeDashoffset = (circumference * (1 - pct / 100)).toFixed(2);
  }

  // ── Bloom and slot into tray ──────────────────────────────────
  function bloomCurrent() {
    if (blooming) return;   // guard: prevent double-bloom race
    blooming = true;

    var wrap = document.getElementById('activeFlowerWrap');
    if (!wrap) return;

    // Snap to full bloom (stage 3)
    if (activePetG) {
      var finalStages = DEFS[currentFlower] && DEFS[currentFlower].stages;
      if (finalStages && finalStages[3] && activePetG.src.indexOf(finalStages[3]) === -1) {
        activePetG.src = finalStages[3];
      }
      if (typeof gsap !== 'undefined') {
        gsap.set(activePetG, { scale: 1, opacity: 1 });
      } else {
        activePetG.style.transform = 'scale(1)';
        activePetG.style.opacity   = '1';
      }
    }

    // Bounce pop on the flower image
    var flEl = wrap.querySelector('.active-flower-img, .flower-svg');
    if (flEl) {
      if (typeof gsap !== 'undefined') {
        gsap.to(flEl, {
          scale: 1.22, duration: 0.16, ease: 'power2.out',
          onComplete: function () {
            gsap.to(flEl, { scale: 1, duration: 0.30, ease: 'elastic.out(1, 0.5)' });
          },
        });
      } else {
        flEl.style.transition = 'transform 0.16s ease-out';
        flEl.style.transform  = 'scale(1.18)';
        setTimeout(function () {
          flEl.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          flEl.style.transform  = 'scale(1)';
        }, 160);
      }
    }

    _bloomTimer = setTimeout(function () {
      _bloomTimer = null;
      addToBouquet(currentFlower);
      currentFlower++;

      if (currentFlower >= DEFS.length) {
        _doneTimer = setTimeout(function () {
          _doneTimer = null;
          dragging = false;
          if (ghostEl) ghostEl.style.display = 'none';
          if (canEl)   canEl.classList.remove('can-held');
          // Animate bouquet wrap, then advance
          playFullWrap(function () {
            showBouquetReveal(function () {
              heartStep++;
              advanceHeart(heartStep);
              goTo(12);   // → s5/Q5
            });
          });
        }, 600);
      } else {
        _nextFlowTimer = setTimeout(function () {
          _nextFlowTimer = null;
          blooming = false;
          loadFlower(currentFlower);
        }, 620);
      }
    }, 480);
  }

  // ── Reveal next bouquet stage when a flower is watered ───────
  function addToBouquet(idx) {
    var stageImg = document.getElementById('bqStageImg');
    if (!stageImg) return;

    var stageN = Math.min(idx, 5);  // bq-stage-0 … bq-stage-5
    if (typeof gsap !== 'undefined') {
      // Crossfade: dip then reveal new stage
      gsap.to(stageImg, {
        opacity: 0, scale: 0.94, duration: 0.18, ease: 'power2.in',
        onComplete: function () {
          stageImg.src = 'bq-stage-' + stageN + '.webp';
          gsap.to(stageImg, { opacity: 1, scale: 1, duration: 0.40, ease: 'back.out(1.6)' });
        },
      });
    } else {
      stageImg.src     = 'bq-stage-' + stageN + '.webp';
      stageImg.style.opacity = '1';
    }

    burstHearts(idx);
  }

  // ── Load flower onto center stage (PNG sprite) ───────────────
  function loadFlower(idx) {
    var wrap = document.getElementById('activeFlowerWrap');
    if (!wrap) return;

    if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
    activePetG     = null;
    activeTimeline = null;
    wrap.innerHTML = '';
    fillPct = 0;
    _currentStage  = 0;
    setRing(0);

    _currentStage = 0;

    var img = document.createElement('img');
    img.src       = DEFS[idx].stages[0];   // start at seed/bud stage
    img.className = 'active-flower-img';
    img.draggable = false;
    img.alt       = DEFS[idx].label || '';
    wrap.appendChild(img);

    // Store img for animation in _onCanMove / bloomCurrent
    activePetG = img;

    var nameEl = document.getElementById('flowerName');
    if (nameEl) nameEl.textContent = DEFS[idx].name || '';

    var ctr = document.getElementById('flowerCounter');
    if (ctr) ctr.textContent = 'ดอกที่ ' + (idx + 1) + ' / ' + DEFS.length;

    // Entrance: fade + slight scale-up
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(img,
        { scale: 0.52, opacity: 0 },
        { scale: 0.55, opacity: 1, duration: 0.40, ease: 'back.out(1.8)' }
      );
    } else {
      img.style.transform = 'scale(0.55)';
      img.style.opacity   = '1';
    }
  }

  // ── Watering can drag (pointer capture + element-level listeners) ──
  // Using setPointerCapture so that pointermove/pointerup are always
  // delivered to canEl even when the finger moves off it — works on
  // iOS Safari, Android Chrome, and desktop browsers uniformly.
  // Document-level listeners are intentionally NOT used here because
  // iOS Safari does not reliably bubble captured pointer events to document.
  function bindCan() {
    canEl = document.getElementById('waterCanItem');
    if (!canEl) return;

    // Clean up any listeners from a previous start() call
    if (_canDown)   canEl.removeEventListener('pointerdown',   _canDown,   { passive: false });
    if (_onCanMove) canEl.removeEventListener('pointermove',   _onCanMove, { passive: false });
    if (_onCanUp) {
      canEl.removeEventListener('pointerup',     _onCanUp);
      canEl.removeEventListener('pointercancel', _onCanUp);
    }

    _onCanMove = function (e) {
      if (!dragging) return;
      e.preventDefault();   // prevent page scroll during drag

      if (ghostEl) {
        ghostEl.style.left = e.clientX + 'px';
        ghostEl.style.top  = e.clientY + 'px';
      }

      var wrap = document.getElementById('activeFlowerWrap');
      if (!wrap) return;

      var r    = wrap.getBoundingClientRect();
      var over = e.clientX >= r.left - HIT_PAD && e.clientX <= r.right  + HIT_PAD &&
                 e.clientY >= r.top  - HIT_PAD && e.clientY <= r.bottom + HIT_PAD;

      if (over) {
        var dx   = e.clientX - lastX;
        var dy   = e.clientY - lastY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        fillPct  = Math.min(100, fillPct + (dist / FILL_DIST) * 100);

        if (activeTimeline) {
          // GSAP scrub (full multi-element animation)
          activeTimeline.progress(fillPct / 100);
        } else if (activePetG) {
          // Stage-image mode: advance through growth stages at 33%/66%/99%
          var newStage = 0;
          for (var si = STAGE_BREAKS.length - 1; si >= 0; si--) {
            if (fillPct >= STAGE_BREAKS[si]) { newStage = si; break; }
          }
          if (newStage !== _currentStage && activePetG) {
            var prevStage = _currentStage;
            _currentStage = newStage;
            var stages = DEFS[currentFlower].stages;
            if (stages[newStage]) {
              var nextSrc = stages[newStage];
              // Crossfade: fade out → swap src → fade in
              if (typeof gsap !== 'undefined') {
                gsap.to(activePetG, {
                  opacity: 0, scale: 0.72, duration: 0.12, ease: 'power1.in',
                  onComplete: function() {
                    activePetG.src = nextSrc;
                    gsap.to(activePetG, { opacity: 1, scale: 1.05, duration: 0.22, ease: 'back.out(1.6)',
                      onComplete: function() { gsap.to(activePetG, { scale: 1, duration: 0.15 }); }
                    });
                  }
                });
              } else {
                activePetG.src = nextSrc;
              }
              // Stage-up burst only when advancing (not going back)
              if (newStage > prevStage) {
                stageUpBurst(activePetG, newStage);
              }
            }
          }
        }
        setRing(fillPct);

        // Glow + sparkle while watering — intensity scales with progress
        setFlowerGlow(activePetG, fillPct);
        var sparkInterval = Math.max(45, 90 - fillPct * 0.4);   // faster sparks near full
        var nowTs = Date.now();
        if (dist > 1 && nowTs - _lastSparkTime > sparkInterval) {
          _lastSparkTime = nowTs;
          spawnWaterSparks(activePetG, 0.8 + fillPct * 0.012);
        }

        if (fillPct >= 100) {
          dragging = false;
          if (ghostEl) ghostEl.style.display = 'none';
          if (canEl)   canEl.classList.remove('can-held');
          bloomCurrent();
        }
      } else {
        resetFlowerGlow(activePetG);
      }

      lastX = e.clientX;
      lastY = e.clientY;
    };

    _onCanUp = function () {
      if (!dragging) return;
      dragging = false;
      if (ghostEl) ghostEl.style.display = 'none';
      if (canEl)   canEl.classList.remove('can-held');
      resetFlowerGlow(activePetG);
    };

    _canDown = function (e) {
      if (blooming || currentFlower >= DEFS.length) return;
      e.preventDefault();
      // Capture pointer so move/up always come to canEl even if finger
      // moves off the element — the only reliable approach on iOS Safari
      try { canEl.setPointerCapture(e.pointerId); } catch (_) {}
      dragging = true;
      lastX    = e.clientX;
      lastY    = e.clientY;
      canEl.classList.add('can-held');
      ghostEl = document.getElementById('waterDragGhost');
      if (ghostEl) {
        ghostEl.style.left    = e.clientX + 'px';
        ghostEl.style.top     = e.clientY + 'px';
        ghostEl.style.display = 'block';
      }
    };

    canEl.addEventListener('pointerdown',   _canDown,   { passive: false });
    canEl.addEventListener('pointermove',   _onCanMove, { passive: false });
    canEl.addEventListener('pointerup',     _onCanUp);
    canEl.addEventListener('pointercancel', _onCanUp);
  }

  // ── Bouquet SVG wrap helpers ──────────────────────────────────
  // All wrap elements live inside #bqMasterSvg as SVG rects/groups.
  // Heights are in viewBox units (320×200 viewport).

  function updateWrap(count) { /* paper wrap is baked into bouquet stage images */ }

  function burstHearts(slotIdx) {
    // Burst from centre of bouquet stage image
    var stageImg = document.getElementById('bqStageImg');
    if (!stageImg) return;
    var r  = stageImg.getBoundingClientRect();
    var cx = r.left + r.width  * 0.50;
    var cy = r.top  + r.height * 0.38;  // upper area = flower heads
    var colors = ['#FF4D8B','#FF90C0','#FFD600','#C084FC','#7DDFFF'];
    for (var i = 0; i < 6; i++) {
      (function (i) {
        var dot   = document.createElement('div');
        dot.className = 'bq-heart';
        var angle = (i / 6) * Math.PI * 2;
        var hx    = Math.round(Math.cos(angle) * (18 + Math.random() * 12));
        dot.style.cssText = [
          'left:' + (cx - 5) + 'px',
          'top:'  + (cy - 5) + 'px',
          'background:' + colors[i % colors.length],
          '--hx:' + hx + 'px',
          'animation-delay:' + (i * 50) + 'ms',
        ].join(';');
        document.body.appendChild(dot);
        setTimeout(function () { dot.parentNode && dot.parentNode.removeChild(dot); }, 950);
      }(i));
    }
  }

  function playFullWrap(callback) {
    var stageImg = document.getElementById('bqStageImg');
    var cont     = document.getElementById('bwContainer');

    // 1. Ensure final bouquet stage is shown
    // Guard: if bq-stage-5 is already displayed, skip the crossfade and just bounce
    var alreadyFinal = stageImg && stageImg.src && stageImg.src.endsWith('bq-stage-5.webp');
    if (stageImg) {
      if (typeof gsap !== 'undefined') {
        if (alreadyFinal) {
          // Already showing final — just do a scale bounce, no dark flash
          gsap.to(stageImg, { scale: 1.06, duration: 0.35, ease: 'back.out(1.8)',
            onComplete: function () {
              gsap.to(stageImg, { scale: 1, duration: 0.25, ease: 'power2.out' });
            },
          });
        } else {
          gsap.to(stageImg, {
            opacity: 0, scale: 0.94, duration: 0.18, ease: 'power2.in',
            onComplete: function () {
              stageImg.src = 'bq-stage-5.webp';
              gsap.to(stageImg, { opacity: 1, scale: 1.06, duration: 0.35, ease: 'back.out(1.8)',
                onComplete: function () {
                  gsap.to(stageImg, { scale: 1, duration: 0.25, ease: 'power2.out' });
                },
              });
            },
          });
        }
      } else {
        stageImg.src = 'bq-stage-5.webp';
        stageImg.style.opacity = '1';
      }
    }

    // 2. Sparkle burst from bouquet centre
    setTimeout(function () {
      var base = stageImg ? stageImg.getBoundingClientRect()
                          : (cont ? cont.getBoundingClientRect() : null);
      if (!base) return;
      var cx     = base.left + base.width  * 0.50;
      var cy     = base.top  + base.height * 0.35;
      var sparks = ['#FF4D8B','#FFD600','#C084FC','#7DDFFF','#FF9800','#4CAF60','#FF5FAE','#FFE566'];
      for (var i = 0; i < 16; i++) {
        (function (i) {
          var sp  = document.createElement('div');
          sp.className = 'bq-spark';
          var ang = (i / 16) * Math.PI * 2;
          var d   = 26 + Math.random() * 32;
          sp.style.cssText = [
            'left:' + (cx - 4.5) + 'px',
            'top:'  + (cy - 4.5) + 'px',
            'background:' + sparks[i % sparks.length],
            '--sx:' + Math.round(Math.cos(ang) * d) + 'px',
            '--sy:' + Math.round(Math.sin(ang) * d) + 'px',
            'animation-delay:' + (i * 28) + 'ms',
          ].join(';');
          document.body.appendChild(sp);
          setTimeout(function () { sp.parentNode && sp.parentNode.removeChild(sp); }, 1300);
        }(i));
      }
    }, 400);

    // 3. Callback after animation settles
    setTimeout(function () { if (callback) callback(); }, 1700);
  }

  function resetWrap() {
    var stageImg = document.getElementById('bqStageImg');
    if (stageImg) {
      stageImg.src     = '';
      stageImg.style.opacity = '0';
      if (typeof gsap !== 'undefined') gsap.set(stageImg, { scale: 1, opacity: 0, clearProps: 'transform' });
    }
  }

  // ── Public ────────────────────────────────────────────────────
  function start() {
    currentFlower  = 0;
    fillPct        = 0;
    dragging       = false;
    blooming       = false;
    activeTimeline = null;
    activePetG     = null;
    ghostEl        = document.getElementById('waterDragGhost');
    if (ghostEl) ghostEl.style.display = 'none';
    resetWrap();
    loadFlower(0);
    bindCan();   // attaches all listeners to canEl with pointer capture
  }

  function stop() {
    // Remove all pointer listeners from canEl
    if (canEl) {
      if (_canDown)   canEl.removeEventListener('pointerdown',   _canDown,   { passive: false });
      if (_onCanMove) canEl.removeEventListener('pointermove',   _onCanMove, { passive: false });
      if (_onCanUp) {
        canEl.removeEventListener('pointerup',     _onCanUp);
        canEl.removeEventListener('pointercancel', _onCanUp);
      }
    }
    _canDown = _onCanMove = _onCanUp = null;

    dragging = false;
    blooming = false;
    if (_bloomTimer)    { clearTimeout(_bloomTimer);    _bloomTimer    = null; }
    if (_nextFlowTimer) { clearTimeout(_nextFlowTimer); _nextFlowTimer = null; }
    if (_doneTimer)     { clearTimeout(_doneTimer);     _doneTimer     = null; }
    if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
    if (ghostEl) ghostEl.style.display = 'none';
    if (canEl)   canEl.classList.remove('can-held');
    // Clean up any in-flight burst particles left over from rapid navigation
    document.querySelectorAll('.bq-heart, .bq-spark').forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
  }

  function showBouquetReveal(callback) {
    var overlay = document.getElementById('bqRevealOverlay');
    var btn     = document.getElementById('bqRevealBtn');
    var floats  = document.getElementById('bqRevealFloats');
    if (!overlay) { if (callback) callback(); return; }

    var hearts  = ['💕','💗','🌸','✨','💐','🩷','⭐'];
    var timers  = [];
    function spawnHeart() {
      var el = document.createElement('span');
      el.className = 'bq-float-heart';
      el.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      el.style.left   = (8 + Math.random() * 84) + '%';
      el.style.bottom = (4 + Math.random() * 18) + '%';
      el.style.animationDuration = (2.4 + Math.random() * 1.8) + 's';
      el.style.animationDelay    = (Math.random() * 0.4) + 's';
      el.style.fontSize = (14 + Math.random() * 14) + 'px';
      if (floats) floats.appendChild(el);
      timers.push(setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 4500));
    }
    var spawnInterval = setInterval(spawnHeart, 550);
    for (var i = 0; i < 6; i++) spawnHeart();

    overlay.style.display = 'flex';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('active'); });
    });

    function onBtn() {
      btn && btn.removeEventListener('click', onBtn);
      clearInterval(spawnInterval);
      timers.forEach(clearTimeout);
      overlay.classList.remove('active');
      setTimeout(function () {
        overlay.style.display = 'none';
        if (floats) floats.innerHTML = '';
        if (callback) callback();
      }, 500);
    }
    if (btn) btn.addEventListener('click', onBtn);
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

// Goal reached → clicking goes back to Q5 (screen 12)
progGoal.addEventListener('click', function () {
  if (progGoal.classList.contains('reached') && currentIdx > 12) {
    jumpBackTo(12);
  }
});

// ── Mag screens: tap anywhere to advance ─────────────────────────
document.querySelectorAll('.mag-screen').forEach(function (magEl) {
  // touchend handles mobile; stopPropagation + preventDefault block the
  // synthetic click that iOS fires ~300ms later, preventing double-advance
  magEl.addEventListener('touchend', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (allScreens[currentIdx] === magEl) {
      goTo(currentIdx + 1);
    }
  }, { passive: false });
  // click handles desktop/mouse — skipped on touch because preventDefault above suppresses it
  magEl.addEventListener('click', function (e) {
    if (allScreens[currentIdx] === magEl) {
      goTo(currentIdx + 1);
    }
  });
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

var MAX_PARTICLES = 150;  // global cap — safe on low-end/mobile

function launchConfetti() {
  // Clear stale particles from any previous launch before adding new ones
  particles = particles.filter(function (p) { return p.alpha > 0; });
  var slots = Math.max(0, MAX_PARTICLES - particles.length);
  var wave1 = Math.min(100, slots);
  for (var i = 0; i < wave1; i++) {
    particles.push(createParticle());
  }
  if (rafId) cancelAnimationFrame(rafId);
  tickConfetti();

  // Second wave — only if room under cap
  setTimeout(function () {
    var remaining = Math.max(0, MAX_PARTICLES - particles.length);
    for (var i = 0; i < Math.min(50, remaining); i++) {
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
    try {
      var md = mc.getImageData(0, 0, w, h);
      for (var k = 3; k < md.data.length; k += 4) {
        md.data[k] = md.data[k] >= 128 ? 255 : 0;  // match reveal-count threshold
      }
      mc.putImageData(md, 0, 0);
    } catch (e) {
      // Canvas tainted (CORS) — skip mask, reveal will still show
    }

    // Apply hard binary mask — scratch layer now exactly matches image
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(maskC, 0, 0, w, h);
    sctx.globalCompositeOperation = 'source-over';

    // Count opaque pixels for accurate reveal threshold
    try {
      var px = sctx.getImageData(0, 0, w, h).data;
      opaquePixels = 0;
      for (var j = 3; j < px.length; j += 4) {
        if (px[j] >= 128) opaquePixels++;
      }
    } catch (e) {
      opaquePixels = 0;  // fallback: auto-reveal after 60% area scratched
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
    try {
      var pixels    = sctx.getImageData(0, 0, w, h).data;
      var remaining = 0;
      for (var i = 3; i < pixels.length; i += 4) {
        if (pixels[i] >= 128) remaining++;
      }
      // Trigger when 60% of the image's own opaque pixels are scratched
      if ((opaquePixels - remaining) / opaquePixels > 0.6) {
        autoReveal();
      }
    } catch (e) {
      // Canvas tainted — auto-reveal to prevent being stuck
      autoReveal();
    }
  }

  function autoReveal() {
    if (checkTimer) { clearTimeout(checkTimer); checkTimer = null; }  // prevent late checkReveal calls
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
