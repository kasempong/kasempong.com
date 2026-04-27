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
  if (cur.id === 's-bouquet') flowerPotGame.stop();

  cur.classList.add('exit');
  cur.classList.remove('active');

  setTimeout(function () {
    cur.classList.remove('exit');
    next.classList.add('active');
    currentIdx = nextIdx;

    // Start game when entering a game screen
    if (next.id === 's-catch')   catchGame.start();
    if (next.id === 's-feed')    feedGame.start();
    if (next.id === 's-bouquet') flowerPotGame.start();
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
  if (curScr && curScr.id === 's-bouquet') flowerPotGame.stop();

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
    if (tgtScr && tgtScr.id === 's-bouquet') flowerPotGame.start();

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
  var canvas, ctx, hearts, caught, total, rafId, active, cssW, cssH;

  function init() {
    canvas = document.getElementById('catchCanvas');
    ctx = canvas.getContext('2d');
    // Block pinch-zoom from two-finger taps on iOS Safari
    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('pointerdown', function (e) {
      if (!active) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      onTap(x, y);
    }, { passive: false });
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
    cssW = w;
    cssH = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // reset+set — avoids accumulation on restart
  }

  var HEART_EMOJIS = ['💗','💖','💕','🩷','❤️'];

  function spawnHeart(offsetY) {
    return {
      x:     Math.random() * ((cssW || 300) - 80) + 40,  // CSS px
      y:     -(offsetY || 0) - 40,
      vy:    Math.random() * 1.8 + 1.4,
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
    };
  }

  function tick() {
    if (!active) return;
    ctx.clearRect(0, 0, cssW || 300, cssH || 300);  // CSS px (matches setTransform scale)

    hearts = hearts.filter(function (h) {
      h.y += h.vy;
      ctx.font = '52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, h.x, h.y);
      return h.y < (cssH || 300) + 60;  // CSS px boundary
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
    if (window.playHeartPop) window.playHeartPop();
    document.getElementById('catchCounter').textContent = caught + ' / 10';

    if (caught >= total) {
      stop();
      if (window.playGameComplete) window.playGameComplete();
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
    if (window.playFeedNom) window.playFeedNom();

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
      if (window.playGameComplete) window.playGameComplete();
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

// ── Bouquet Reveal Popup ──────────────────────────────────────────
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

// ── Flower Pot Game (rough.js sketchy 2D) ───────────────────────
var flowerPotGame = (function () {

  // ── Constants ──────────────────────────────────────────────────
  var WATER_RATE = 0.40;
  var SUN_RATE   = 0.40;

  //  rx      = stem base x  (close together near pot centre)
  //  headRx  = flower head x (fanned outward at the top)
  var FLOWERS = [
    { rx: 0.46, headRx: 0.33, pCol: '#e82828', cCol: '#ffd080', nP: 7,  r: 0.056, sH: 0.48 },
    { rx: 0.50, headRx: 0.52, pCol: '#8830e8', cCol: '#f0d8ff', nP: 6,  r: 0.062, sH: 0.68 },
    { rx: 0.54, headRx: 0.72, pCol: '#e8c020', cCol: '#6b3a08', nP: 12, r: 0.058, sH: 0.57 },
  ];

  var SEEDS     = [101, 202, 303];
  var BFLY_COLS = ['#ff90cc', '#b090ff', '#90d8ff', '#ffd090'];

  // ── State ──────────────────────────────────────────────────────
  var wMeter = 0, sMeter = 0, growthT = 0;
  var tool = null, dragging = false, done = false;
  var ghostX = 0, ghostY = 0, trailTick = 0;
  var wDrops = [], sSparkles = [];
  var flowerLeans = [0, 0, 0];
  var bloomedFlags = [false, false, false];
  var tapBounce   = [{s:1,v:0},{s:1,v:0},{s:1,v:0}];
  var soilRipples = [];
  var fallingPetals = [];
  var flashAlpha = 0;
  var birdTimer  = 5;
  var dripTimer  = 0;
  var W = 0, H = 0;
  var canvas, ctx, rc;
  var animId;
  var clock = { then: 0, t: 0, started: false };

  // ── DOM refs ───────────────────────────────────────────────────
  var wrap, wBar, sBar, wVal, sVal, wBtn, sBtn, ghost;
  var _onWBtnPD, _onSBtnPD, _onDocPM, _onDocPU, _onResize, _onCanvasTap;

  // ── Helpers ────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function darkenHex(hex, amt) {
    amt = amt || 35;
    var n = parseInt(hex.replace('#',''), 16);
    var r = Math.max(0, (n >> 16)        - amt);
    var g = Math.max(0, ((n >> 8) & 0xff) - amt);
    var b = Math.max(0, (n & 0xff)        - amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Returns true when the drag ghost is positioned over the pot zone
  function isOverPot() {
    if (!canvas) return false;
    var rect = canvas.getBoundingClientRect();
    var canX = ghostX - rect.left;
    var canY = ghostY - rect.top;
    var cx   = W * 0.5;
    var potT = H * 0.774;
    var potB = H * 0.935;
    var rT   = W * 0.161;
    return canX >= cx - rT && canX <= cx + rT && canY >= potT && canY <= potB;
  }

  // ── Audio helpers ──────────────────────────────────────────────
  function playBloomNote(idx) {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var freqs = [659, 784, 1047];
      var freq  = freqs[idx] || 880;
      [[freq, 0.22, 0.8], [freq*2.76, 0.08, 0.38]].forEach(function(p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine'; o.frequency.value = p[0];
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(p[1], ac.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + p[2]);
        o.start(); o.stop(ac.currentTime + p[2] + 0.02);
      });
    } catch(e) {}
  }

  function playWaterDrip() {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      // three micro-bubble pops in quick succession — soft, round, cute
      [[0, 1320, 980], [0.055, 1560, 1140], [0.11, 1040, 780]].forEach(function(p) {
        var o = ac.createOscillator(), g = ac.createGain();
        var f = ac.createBiquadFilter();
        o.connect(f); f.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        f.type = 'lowpass'; f.frequency.value = 2200;
        o.frequency.setValueAtTime(p[1], ac.currentTime + p[0]);
        o.frequency.exponentialRampToValueAtTime(p[2], ac.currentTime + p[0] + 0.05);
        g.gain.setValueAtTime(0, ac.currentTime + p[0]);
        g.gain.linearRampToValueAtTime(0.11, ac.currentTime + p[0] + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + p[0] + 0.08);
        o.start(ac.currentTime + p[0]);
        o.stop(ac.currentTime + p[0] + 0.09);
      });
    } catch(e) {}
  }

  function playBirdChirp() {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.11, 0.22].forEach(function(delay) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        var base = 1900 + Math.random()*700;
        o.frequency.setValueAtTime(base, ac.currentTime + delay);
        o.frequency.exponentialRampToValueAtTime(base*1.45, ac.currentTime + delay + 0.07);
        g.gain.setValueAtTime(0.07, ac.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.09);
        o.start(ac.currentTime + delay); o.stop(ac.currentTime + delay + 0.11);
      });
    } catch(e) {}
  }

  // ── Tap sparkles burst ─────────────────────────────────────────
  function spawnTapSparkles(x, y, col) {
    for (var i = 0; i < 10; i++) {
      var ang = (i/10)*Math.PI*2;
      var spd = 1.8 + Math.random()*2.8;
      sSparkles.push({
        x: x, y: y,
        vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 1.5,
        sz: 12 + Math.random()*8,
        em: ['✨','🌟','💫'][Math.floor(Math.random()*3)],
        life: 1.0
      });
    }
  }

  function spawnTrailParticle() {
    var el = document.createElement('span');
    var isWater = tool === 'water';
    var hue  = isWater ? (175 + Math.random() * 35) : (35 + Math.random() * 35);
    var size = 5 + Math.random() * 8;
    el.style.cssText = [
      'position:fixed','pointer-events:none','z-index:9989','border-radius:50%',
      'left:' + ghostX + 'px','top:' + ghostY + 'px',
      'width:' + size + 'px','height:' + size + 'px',
      'background:hsl(' + hue + ',88%,65%)',
      'box-shadow:0 0 6px hsl(' + hue + ',88%,65%)',
      'opacity:0.92',
      'transition:left 0.55s ease-out,top 0.55s ease-out,opacity 0.55s ease-out,transform 0.55s ease-out',
    ].join(';');
    document.body.appendChild(el);
    var dx = (Math.random() - 0.5) * 64;
    var dy = -24 - Math.random() * 48;
    requestAnimationFrame(function () {
      el.style.left      = (ghostX + dx) + 'px';
      el.style.top       = (ghostY + dy) + 'px';
      el.style.opacity   = '0';
      el.style.transform = 'scale(0.2)';
    });
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  }

  // ── Finish chime ───────────────────────────────────────────────
  function playFinishChime() {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      // rising arpeggio: C5 E5 G5 C6 with a soft bell timbre
      [523, 659, 784, 1047].forEach(function(freq, i) {
        var osc  = ac.createOscillator();
        var gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        var t0 = ac.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.28, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
        osc.start(t0); osc.stop(t0 + 0.72);
        // second harmonic (one octave up, quieter) for bell sparkle
        var osc2  = ac.createOscillator();
        var gain2 = ac.createGain();
        osc2.connect(gain2); gain2.connect(ac.destination);
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        gain2.gain.setValueAtTime(0, t0);
        gain2.gain.linearRampToValueAtTime(0.08, t0 + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
        osc2.start(t0); osc2.stop(t0 + 0.42);
      });
    } catch(e) {}
  }

  // ── Draw: background ───────────────────────────────────────────
  // Transparent — let the page CSS gradient show through; just add a
  // whisper of paper grain for the sketchy feel.
  function drawBackground() {
    ctx.save();
    for (var i = 0; i < 30; i++) {
      ctx.strokeStyle = 'rgba(120,80,40,' + (Math.random() * 0.012) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, Math.random() * H);
      ctx.lineTo(Math.random() * W, Math.random() * H);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Draw: pot (75 % of original size, bottom-anchored) ────────
  function drawPot() {
    var cx   = W * 0.5;
    var potT = H * 0.774;
    var potB = H * 0.935;
    var rT   = W * 0.161;
    var rB   = W * 0.116;
    var potH = potB - potT;

    rc.path(
      'M' + (cx-rT) + ',' + potT +
      ' L' + (cx-rB) + ',' + potB +
      ' Q' + cx + ',' + (potB+9) + ' ' + (cx+rB) + ',' + potB +
      ' L' + (cx+rT) + ',' + potT + ' Z',
      { fill:'#d4724a', fillStyle:'cross-hatch', fillWeight:1.0,
        hachureGap:5, hachureAngle:45,
        stroke:'#a04820', strokeWidth:2.2, roughness:2.2, seed:1 }
    );
    // highlight
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - rT*0.38, potT + potH*0.22, rT*0.22, potH*0.28, -0.18, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    // stripe
    rc.line(cx-rT+10, potT+potH*0.35, cx+rT-10, potT+potH*0.35,
      { stroke:'rgba(255,255,255,0.30)', strokeWidth:2, roughness:3, seed:50 });
    // painted dots
    rc.circle(cx-rT*0.4, potT+potH*0.56, 7,
      { fill:'rgba(255,190,170,0.55)', fillStyle:'solid', stroke:'none', roughness:1.5, seed:51 });
    rc.circle(cx+rT*0.3, potT+potH*0.59, 6,
      { fill:'rgba(170,220,140,0.55)', fillStyle:'solid', stroke:'none', roughness:1.5, seed:52 });
    rc.circle(cx, potT+potH*0.66, 5,
      { fill:'rgba(190,170,255,0.55)', fillStyle:'solid', stroke:'none', roughness:1.5, seed:53 });
    // rim
    rc.ellipse(cx, potT, rT*2+12, 20,
      { fill:'#b85830', fillStyle:'hachure', fillWeight:0.9, hachureGap:4,
        stroke:'#8a3818', strokeWidth:2, roughness:2.5, seed:2 });
    // soil
    rc.ellipse(cx, potT+2, rT*2-6, 15,
      { fill:'#6b4020', fillStyle:'cross-hatch', fillWeight:0.7, hachureGap:3.5,
        stroke:'#4a2810', strokeWidth:1.5, roughness:2.5, seed:3 });
    // wet soil tint — darkens + blue-shifts as water fills
    if (wMeter > 0) {
      ctx.save();
      ctx.globalAlpha = (wMeter / 100) * 0.42;
      ctx.fillStyle = '#2266bb';
      ctx.beginPath();
      ctx.ellipse(cx, potT+2, rT-5, 5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Draw: one flower ───────────────────────────────────────────
  // leanX: extra horizontal pixel offset from sun interaction
  function drawFlower(idx, t, leanX) {
    if (t <= 0.005) return;
    leanX = leanX || 0;
    // idle wind sway — scales with growth so seedlings don't rock
    var windLean = Math.sin(clock.t * 0.85 + idx * 2.3) * W * 0.013 * smooth(t);
    if (!dragging || tool !== 'sun') leanX += windLean;
    var f      = FLOWERS[idx];
    var baseX  = f.rx     * W;   // where the stem meets the soil
    var headX  = (f.headRx !== undefined ? f.headRx : f.rx) * W;  // where the head sits
    var soilY  = H * 0.776;
    var r      = f.r * W;
    var seed   = SEEDS[idx];

    // seed bump (at base)
    if (t < 0.18) {
      ctx.globalAlpha = clamp(1 - smooth(clamp((t-0.06)/0.12, 0, 1)), 0, 1);
      rc.circle(baseX, soilY-4, 7,
        { fill:'#8a5025', fillStyle:'solid', stroke:'#5a3010', strokeWidth:1.5, roughness:2, seed:seed });
      ctx.globalAlpha = 1;
    }

    // stem — arcs from baseX at soil up to headX at tip (fan shape)
    var stemT    = smooth(clamp((t-0.10)/0.45, 0, 1));
    var stemTopY = soilY - stemT * H * f.sH * 0.56;
    // head position slides from base toward its fanned-out target as it grows
    var stemTopX = lerp(baseX, headX, stemT) + leanX * stemT;
    if (stemT > 0.01) {
      var cpx = lerp(baseX, headX, 0.38) + leanX * stemT * 0.45;
      var cpy = lerp(soilY, stemTopY, 0.52);
      rc.path(
        'M' + baseX.toFixed(1) + ',' + soilY.toFixed(1) +
        ' Q' + cpx.toFixed(1) + ',' + cpy.toFixed(1) +
        ' ' + stemTopX.toFixed(1) + ',' + stemTopY.toFixed(1),
        { stroke:'#5a9030', strokeWidth:2.6, roughness:2.8, seed:seed+10 }
      );
    }

    // leaves track the stem arc mid-point
    var leafT = smooth(clamp((t-0.30)/0.20, 0, 1));
    if (leafT > 0.01) {
      ctx.globalAlpha = leafT;
      var ls   = W * 0.048 * leafT;
      var lmX  = lerp(baseX, headX, 0.42 * stemT) + leanX * stemT * 0.42;
      var lmY  = lerp(soilY, stemTopY, 0.42);
      var lm2X = lerp(baseX, headX, 0.62 * stemT) + leanX * stemT * 0.62;
      var lmY2 = lerp(soilY, stemTopY, 0.62);
      rc.path(
        'M'+lmX+','+lmY+' Q'+(lmX-ls*1.6)+','+(lmY-ls)+' '+(lmX-ls*0.8)+','+(lmY-ls*1.9)+' Z',
        { fill:'#6ab038', fillStyle:'hachure', fillWeight:0.9, hachureGap:3,
          stroke:'#4a8020', strokeWidth:1.3, roughness:2.5, seed:seed+20 }
      );
      rc.path(
        'M'+lm2X+','+lmY2+' Q'+(lm2X+ls*1.4)+','+(lmY2-ls*0.8)+' '+(lm2X+ls*0.6)+','+(lmY2-ls*1.7)+' Z',
        { fill:'#7ac048', fillStyle:'hachure', fillWeight:0.9, hachureGap:3,
          stroke:'#4a8020', strokeWidth:1.3, roughness:2.5, seed:seed+21 }
      );
      ctx.globalAlpha = 1;
    }

    // bud → petals → glow drawn inside tap-bounce scale transform
    ctx.save();
    var bs = tapBounce[idx].s;
    if (Math.abs(bs - 1) > 0.002) {
      ctx.translate(stemTopX, stemTopY);
      ctx.scale(bs, bs);
      ctx.translate(-stemTopX, -stemTopY);
    }

    // bud (follows stemTopX)
    var budIn  = smooth(clamp((t-0.45)/0.15, 0, 1));
    var budOut = smooth(clamp((t-0.62)/0.10, 0, 1));
    var budT   = budIn * (1 - budOut);
    if (budT > 0.01) {
      ctx.globalAlpha = budT;
      rc.circle(stemTopX, stemTopY, r*0.88,
        { fill:f.pCol, fillStyle:'solid', stroke:darkenHex(f.pCol), strokeWidth:1.5, roughness:1.8, seed:seed+30 });
      ctx.globalAlpha = 1;
    }

    // petals (centered on stemTopX)
    var petT = smooth(clamp((t-0.55)/0.30, 0, 1));
    if (petT > 0.01) {
      ctx.globalAlpha = Math.min(1, petT * 1.2);
      for (var pi = 0; pi < f.nP; pi++) {
        var a  = (pi / f.nP) * Math.PI * 2;
        var pr = r * lerp(0.25, 1.0, petT);
        var px = stemTopX + Math.cos(a) * pr * 0.68;
        var py = stemTopY + Math.sin(a) * pr * 0.68;
        var pw = r * 0.75 * lerp(0.35, 1, petT);
        var ph = r * 1.15 * lerp(0.35, 1, petT);
        rc.ellipse(px, py, pw*2, ph*2, {
          fill: f.pCol, fillStyle:'hachure', fillWeight:0.85, hachureGap:2.8,
          hachureAngle: (a * 180 / Math.PI + 30) % 180,
          stroke: darkenHex(f.pCol, 28), strokeWidth:1.2, roughness:2.0,
          seed: seed + 40 + pi
        });
      }
      rc.circle(stemTopX, stemTopY, r*0.54,
        { fill:f.cCol, fillStyle:'solid', stroke:darkenHex(f.cCol, 45), strokeWidth:1.2, roughness:1.8, seed:seed+100 });
      rc.circle(stemTopX, stemTopY, r*0.54,
        { fill:'rgba(0,0,0,0)', fillStyle:'cross-hatch', fillWeight:0.45, hachureGap:2.5, stroke:'none', roughness:1.5, seed:seed+101 });
      ctx.globalAlpha = 1;
    }

    // glow halo (late stage, follows stemTopX)
    var glowT = smooth(clamp((t-0.76)/0.18, 0, 1));
    if (glowT > 0.01) {
      ctx.globalAlpha = glowT * 0.36;
      var grd = ctx.createRadialGradient(stemTopX, stemTopY, r*0.4, stemTopX, stemTopY, r*2.4);
      grd.addColorStop(0, f.pCol);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(stemTopX, stemTopY, r*2.4, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Draw: butterflies ──────────────────────────────────────────
  function drawButterflies(t, bflyT) {
    for (var bi = 0; bi < 4; bi++) {
      var angle = t * (0.55 + bi*0.14) + bi*1.57;
      var rad   = W * (0.14 + bi*0.04);
      var bx    = W*0.5 + Math.cos(angle)*rad;
      var by    = H*(0.20 + bi*0.06) + Math.sin(t*1.9 + bi)*H*0.03;
      var flapT = (Math.sin(t*9 + bi*1.4) + 1) / 2;
      var ws    = W * 0.054 * bflyT;
      ctx.globalAlpha = bflyT * 0.82;
      rc.path(
        'M'+bx+','+by+' Q'+(bx-ws*1.1)+','+(by-ws*0.9)+' '+(bx-ws*(0.7+flapT*0.7))+','+(by+ws*0.45)+' Z',
        { fill:BFLY_COLS[bi], fillStyle:'hachure', fillWeight:0.7, hachureGap:2.5,
          stroke:darkenHex(BFLY_COLS[bi], 20), strokeWidth:1, roughness:2, seed:900+bi*10 }
      );
      rc.path(
        'M'+bx+','+by+' Q'+(bx+ws*1.1)+','+(by-ws*0.9)+' '+(bx+ws*(0.7+flapT*0.7))+','+(by+ws*0.45)+' Z',
        { fill:BFLY_COLS[bi], fillStyle:'hachure', fillWeight:0.7, hachureGap:2.5,
          stroke:darkenHex(BFLY_COLS[bi], 20), strokeWidth:1, roughness:2, seed:900+bi*10+1 }
      );
      ctx.globalAlpha = 1;
    }
  }

  // ── Draw: water drops (💧 emoji) ──────────────────────────────
  function updateAndDrawDrops(dt) {
    if (dragging && tool === 'water' && wMeter < 100 && isOverPot()) {
      var bRect = canvas.getBoundingClientRect();
      var gCX = ghostX - bRect.left;
      var gCY = ghostY - bRect.top;
      for (var n = 0; n < 2; n++) {
        wDrops.push({
          x:  gCX + (Math.random()-0.5) * 28,
          y:  gCY + Math.random() * 16,
          vy: 3.5 + Math.random() * 3,
          sz: 15 + Math.random() * 9,
          life: 1.0
        });
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = wDrops.length-1; i >= 0; i--) {
      var d = wDrops[i];
      d.y += d.vy; d.life -= dt * 0.9;
      // splash into soil
      if (!d.splashed && d.y >= H * 0.776) {
        d.splashed = true;
        soilRipples.push({ x: d.x, r: 0, life: 1.0 });
        dripTimer -= 0.3; // allow next drip sooner on splash
      }
      if (d.life <= 0 || d.y > H * 0.80) { wDrops.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = d.life * 0.92;
      ctx.font = d.sz + 'px serif';
      ctx.fillText('💧', d.x, d.y);
      ctx.restore();
    }
  }

  // ── Draw: sun sparkles (✨ / 🌟 emoji) ────────────────────────
  var SPARK_EMOJIS = ['✨', '🌟', '✨', '💫'];
  function updateAndDrawSparkles(t, dt) {
    if (dragging && tool === 'sun' && sMeter < 100 && sSparkles.length < 12) {
      var bRect = canvas.getBoundingClientRect();
      var gCX = ghostX - bRect.left;
      var gCY = ghostY - bRect.top;
      var ang = Math.random() * Math.PI * 2;
      var rad = W * 0.04 + Math.random() * W * 0.10;
      sSparkles.push({
        x:  gCX + Math.cos(ang) * rad,
        y:  gCY + Math.sin(ang) * rad * 0.6,
        vx: (Math.random()-0.5) * 1.5,
        vy: -1.0 - Math.random() * 1.5,
        sz: 12 + Math.random() * 8,
        em: SPARK_EMOJIS[Math.floor(Math.random() * SPARK_EMOJIS.length)],
        life: 1.0
      });
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = sSparkles.length-1; i >= 0; i--) {
      var s = sSparkles[i];
      s.x += s.vx; s.y += s.vy; s.life -= dt * 0.9;
      if (s.life <= 0) { sSparkles.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = s.life * 0.92;
      ctx.font = s.sz + 'px serif';
      ctx.fillText(s.em, s.x, s.y);
      ctx.restore();
    }
  }

  // ── Draw: soil ripples ─────────────────────────────────────────
  function drawSoilRipples(dt) {
    var soilY = H * 0.776;
    for (var i = soilRipples.length-1; i >= 0; i--) {
      var rp = soilRipples[i];
      rp.r   += dt * W * 0.18;
      rp.life -= dt * 2.4;
      if (rp.life <= 0) { soilRipples.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = rp.life * 0.32;
      ctx.strokeStyle = '#70d8ff';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.ellipse(rp.x, soilY, rp.r, rp.r * 0.28, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }


  // ── Main draw ──────────────────────────────────────────────────
  function drawScene(t, dt) {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    // flowers back-to-front
    var order = FLOWERS.map(function(f,i){ return i; });
    order.sort(function(a,b){ return FLOWERS[b].sH - FLOWERS[a].sH; });
    for (var si = 0; si < order.length; si++) {
      var idx = order[si];
      var lag = idx * 0.018;
      var flT = clamp((growthT - lag) / (1 - lag*0.6 + 0.001), 0, 1);
      drawFlower(idx, flT, flowerLeans[idx]);
    }
    drawSoilRipples(dt);
    drawPot();
    var bflyT = clamp((growthT-0.75)/0.18, 0, 1);
    if (bflyT > 0) drawButterflies(t, bflyT);
    updateAndDrawDrops(dt);
    updateAndDrawSparkles(t, dt);
    // bloom / completion flash
    if (flashAlpha > 0.002) {
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#fff8d0';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // ── Animation loop ─────────────────────────────────────────────
  function loop(now) {
    animId = requestAnimationFrame(loop);
    if (!clock.started) { clock.then = now; clock.started = true; }
    var dt = Math.min((now - clock.then)/1000, 0.05);
    clock.then = now; clock.t += dt;
    var t = clock.t;

    // tap bounce spring — always runs
    for (var tbi = 0; tbi < tapBounce.length; tbi++) {
      tapBounce[tbi].v += (1 - tapBounce[tbi].s) * 0.32;
      tapBounce[tbi].v *= 0.62;
      tapBounce[tbi].s += tapBounce[tbi].v;
    }
    // flash decay
    flashAlpha = Math.max(0, flashAlpha - dt * 1.6);
    // drip sound throttle
    dripTimer = Math.max(0, dripTimer - dt);

    if (!done) {
      if (dragging && tool === 'water' && isOverPot()) wMeter = Math.min(100, wMeter + WATER_RATE);
      if (dragging && tool === 'sun')                  sMeter = Math.min(100, sMeter + SUN_RATE);
      // flowers lean toward sun ghost while dragging, spring back otherwise
      if (canvas) {
        var rect = canvas.getBoundingClientRect();
        var gCanX = ghostX - rect.left;
        for (var li = 0; li < FLOWERS.length; li++) {
          var targetLean = 0;
          if (dragging && tool === 'sun') {
            var headRxL = FLOWERS[li].headRx !== undefined ? FLOWERS[li].headRx : FLOWERS[li].rx;
            var flowerCanX = headRxL * W;
            var delta = gCanX - flowerCanX;
            targetLean = clamp(delta * 0.28, -W * 0.12, W * 0.12);
          }
          flowerLeans[li] = lerp(flowerLeans[li], targetLean, 0.08);
        }
      }
      // per-flower bloom detection
      for (var bi = 0; bi < FLOWERS.length; bi++) {
        var blag = bi * 0.018;
        var bflT = clamp((growthT - blag) / (1 - blag*0.6 + 0.001), 0, 1);
        if (!bloomedFlags[bi] && smooth(clamp((bflT-0.55)/0.30, 0, 1)) > 0.5) {
          bloomedFlags[bi] = true;
          playBloomNote(bi);
          flashAlpha = Math.max(flashAlpha, 0.28);
          if (navigator.vibrate) navigator.vibrate(30);
          var bf = FLOWERS[bi];
          var bhx = (bf.headRx !== undefined ? bf.headRx : bf.rx) * W;
          var bstemT = smooth(clamp((bflT-0.10)/0.45, 0, 1));
          var bhy = H*0.776 - bstemT * H * bf.sH * 0.56;
          spawnTapSparkles(bhx, bhy, bf.pCol);
        }
      }
      // drip sound on splash
      if (dripTimer <= 0 && soilRipples.length > 0 && dragging && tool === 'water') {
        dripTimer = 0.18;
        playWaterDrip();
      }
      // ambient birdsong grows with flowers
      birdTimer -= dt;
      if (birdTimer <= 0 && growthT > 0.18) {
        if (Math.random() < growthT * 0.75) playBirdChirp();
        birdTimer = 7 + Math.random() * 9;
      }
      growthT = clamp((wMeter*0.5 + sMeter*0.5)/100, 0, 1);
      if (wBar) wBar.style.width = Math.round(wMeter) + '%';
      if (sBar) sBar.style.width = Math.round(sMeter) + '%';
      if (wVal) wVal.textContent = Math.round(wMeter) + '%';
      if (sVal) sVal.textContent = Math.round(sMeter) + '%';
      // highlight ghost when watering can is over the pot
      if (ghost && tool === 'water') {
        ghost.classList.toggle('fp-ghost-active', isOverPot());
      }
      if (dragging && t - trailTick > 0.045) {
        trailTick = t;
        spawnTrailParticle(); spawnTrailParticle();
      }
      if (growthT >= 1.0) {
        done = true;
        flashAlpha = 0.55;
        playFinishChime();
        // hide tools, show next button
        var tbEl = document.querySelector('.fp-toolbar');
        if (tbEl) tbEl.style.display = 'none';
        var nBtn = document.getElementById('fpNextBtn');
        if (nBtn) {
          nBtn.style.display = 'flex';
          nBtn.onclick = function () {
            nBtn.style.display = 'none';
            if (tbEl) tbEl.style.display = '';
            heartStep++;
            advanceHeart(heartStep);
            goTo(12);
          };
        }
      }
    }
    drawScene(t, dt);
  }

  // ── Build canvas ───────────────────────────────────────────────
  function buildScene() {
    wrap = document.getElementById('fpSceneWrap');
    if (!wrap || typeof rough === 'undefined') return;
    W = wrap.clientWidth  || 360;
    H = wrap.clientHeight || 420;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas = document.createElement('canvas');
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width   = W + 'px';
    canvas.style.height  = H + 'px';
    canvas.style.display = 'block';
    wrap.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    rc = rough.canvas(canvas);
  }

  // ── Drag helpers ───────────────────────────────────────────────
  function startDrag(toolName, e) {
    e.preventDefault();
    tool = toolName; dragging = true;
    ghostX = e.clientX; ghostY = e.clientY;
    if (ghost) {
      ghost.textContent  = toolName === 'water' ? '🪣' : '☀️';
      ghost.className    = 'fp-drag-ghost ' + (toolName === 'water' ? 'fp-ghost-water' : 'fp-ghost-sun');
      ghost.style.left   = ghostX + 'px';
      ghost.style.top    = ghostY + 'px';
      ghost.style.display = 'block';
    }
    if (wBtn) wBtn.classList.toggle('fp-active', toolName === 'water');
    if (sBtn) sBtn.classList.toggle('fp-active', toolName === 'sun');
  }

  function stopDrag() {
    dragging = false; tool = null;
    if (ghost) ghost.style.display = 'none';
    if (wBtn) wBtn.classList.remove('fp-active');
    if (sBtn) sBtn.classList.remove('fp-active');
  }

  // ── Events ─────────────────────────────────────────────────────
  function bindEvents() {
    wrap  = document.getElementById('fpSceneWrap');
    wBar  = document.getElementById('fpWaterBar');
    sBar  = document.getElementById('fpSunBar');
    wVal  = document.getElementById('fpWaterVal');
    sVal  = document.getElementById('fpSunVal');
    wBtn  = document.getElementById('fpWaterTool');
    sBtn  = document.getElementById('fpSunTool');
    ghost = document.getElementById('fpDragGhost');
    if (!wrap) return;
    _onWBtnPD = function(e) { startDrag('water', e); };
    _onSBtnPD = function(e) { startDrag('sun',   e); };
    _onDocPM  = function(e) {
      if (!dragging) return;
      ghostX = e.clientX; ghostY = e.clientY;
      if (ghost) { ghost.style.left = ghostX+'px'; ghost.style.top = ghostY+'px'; }
    };
    _onDocPU = function() { stopDrag(); };
    if (wBtn) wBtn.addEventListener('pointerdown', _onWBtnPD);
    if (sBtn) sBtn.addEventListener('pointerdown', _onSBtnPD);
    document.addEventListener('pointermove',   _onDocPM);
    document.addEventListener('pointerup',     _onDocPU);
    document.addEventListener('pointercancel', _onDocPU);
    _onResize = function() {
      if (!wrap || !canvas) return;
      var nW = wrap.clientWidth, nH = wrap.clientHeight;
      if (!nW || !nH) return;
      W = nW; H = nH;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(W*dpr);
      canvas.height = Math.round(H*dpr);
      canvas.style.width  = W+'px';
      canvas.style.height = H+'px';
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      rc = rough.canvas(canvas);
    };
    window.addEventListener('resize', _onResize);
    _onCanvasTap = function(e) {
      if (!canvas) return;
      var rect = canvas.getBoundingClientRect();
      var tx = e.clientX - rect.left, ty = e.clientY - rect.top;
      FLOWERS.forEach(function(f, i) {
        var blag = i * 0.018;
        var flT = clamp((growthT - blag) / (1 - blag*0.6 + 0.001), 0, 1);
        if (smooth(clamp((flT-0.55)/0.30, 0, 1)) < 0.1) return;
        var hxL = (f.headRx !== undefined ? f.headRx : f.rx) * W;
        var stemT = smooth(clamp((flT-0.10)/0.45, 0, 1));
        var hyL = H*0.776 - stemT * H * f.sH * 0.56;
        var r = f.r * W * 1.8;
        var dx = tx - hxL, dy = ty - hyL;
        if (dx*dx + dy*dy < r*r) {
          tapBounce[i].v = 0.28;
          spawnTapSparkles(hxL, hyL, f.pCol);
        }
      });
    };
    if (canvas) canvas.addEventListener('click', _onCanvasTap);
  }

  function unbindEvents() {
    if (wBtn && _onWBtnPD) wBtn.removeEventListener('pointerdown', _onWBtnPD);
    if (sBtn && _onSBtnPD) sBtn.removeEventListener('pointerdown', _onSBtnPD);
    if (_onDocPM)  document.removeEventListener('pointermove',   _onDocPM);
    if (_onDocPU) {
      document.removeEventListener('pointerup',     _onDocPU);
      document.removeEventListener('pointercancel', _onDocPU);
    }
    if (_onResize) window.removeEventListener('resize', _onResize);
    if (_onCanvasTap && canvas) canvas.removeEventListener('click', _onCanvasTap);
    _onWBtnPD = _onSBtnPD = _onDocPM = _onDocPU = _onResize = _onCanvasTap = null;
  }

  // ── Public ─────────────────────────────────────────────────────
  function start() {
    wMeter = 0; sMeter = 0; growthT = 0;
    tool = null; dragging = false; done = false;
    ghostX = 0; ghostY = 0; trailTick = 0;
    wDrops = []; sSparkles = [];
    flowerLeans = [0, 0, 0];
    bloomedFlags = [false,false,false];
    tapBounce = [{s:1,v:0},{s:1,v:0},{s:1,v:0}];
    soilRipples = []; fallingPetals = [];
    flashAlpha = 0; birdTimer = 5; dripTimer = 0;
    var nBtn = document.getElementById('fpNextBtn');
    if (nBtn) nBtn.style.display = 'none';
    var tbEl = document.querySelector('.fp-toolbar');
    if (tbEl) tbEl.style.display = '';
    clock = { then:0, t:0, started:false };
    buildScene();
    bindEvents();
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    stopDrag();
    unbindEvents();
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (wrap)   { wrap.innerHTML = ''; }
    canvas = ctx = rc = null;
    wDrops = []; sSparkles = [];
    soilRipples = []; fallingPetals = [];
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
// Build step → first screen index with that heartStep
var STEP_TO_SCREEN = SCREEN_HEART_STEP.reduce(function(acc, step, idx) {
  if (!(step in acc)) acc[step] = idx;
  return acc;
}, {});

function jumpToScreen(targetScreen) {
  if (targetScreen === currentIdx) return;
  if (targetScreen < currentIdx) jumpBackTo(targetScreen);
  else goTo(targetScreen);
}

plats.forEach(function (plat, i) {
  plat.addEventListener('click', function () {
    if (!plat.classList.contains('done')) return;
    var targetScreen = STEP_TO_SCREEN[i + 1];
    if (targetScreen !== undefined) jumpToScreen(targetScreen);
  });
});

progGoal.addEventListener('click', function () {
  if (!progGoal.classList.contains('reached')) return;
  var targetScreen = STEP_TO_SCREEN[8];
  if (targetScreen !== undefined) jumpToScreen(targetScreen);
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

    // Show final message after canvas fades
    setTimeout(function () {
      if (finalMsg) finalMsg.classList.add('visible');
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

  // ── Heart pop (catch hearts — one pip per caught heart) ──────
  window.playHeartPop = function () {
    if (!audioCtx || musicMuted) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var env = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.10);
    env.gain.setValueAtTime(0.20, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  };

  // ── Feed nom (feeding pet — two-note bounce per pet satisfied) ─
  window.playFeedNom = function () {
    if (!audioCtx || musicMuted) return;
    var now = audioCtx.currentTime;
    [[523.25, 0], [392.00, 0.09]].forEach(function (pair) {
      var t   = now + pair[1];
      var osc = audioCtx.createOscillator();
      var env = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = pair[0];
      env.gain.setValueAtTime(0.18, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(env);
      env.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  };

  // ── Water drip (bouquet watering — throttled 150 ms, randomised pitch) ──
  window.playWaterDrip = function () {
    if (!audioCtx || musicMuted) return;
    var now  = audioCtx.currentTime;
    var freq = 400 + Math.random() * 300;   // 400–700 Hz randomised
    var osc  = audioCtx.createOscillator();
    var env  = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + 0.18);
    env.gain.setValueAtTime(0.12, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  };

  // ── Sparkle chime (flower stage-up: ascending C5→E5→G5→C6) ──
  window.playSparkleChime = function () {
    if (!audioCtx || musicMuted) return;
    var now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach(function (freq, i) {
      var t   = now + i * 0.10;
      var osc = audioCtx.createOscillator();
      var env = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.22, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(env);
      env.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  };

  // ── Game complete fanfare (short triumphant melody, end of each mini-game) ──
  window.playGameComplete = function () {
    if (!audioCtx || musicMuted) return;
    var now = audioCtx.currentTime;
    [[523.25, 0, 0.18], [659.25, 0.16, 0.18], [783.99, 0.30, 0.22],
     [659.25, 0.50, 0.14], [1046.5, 0.62, 0.40]].forEach(function (note) {
      var t   = now + note[1];
      var osc = audioCtx.createOscillator();
      var env = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note[0];
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.26, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t + note[2]);
      osc.connect(env);
      env.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + note[2] + 0.1);
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

  // ── Cleanup: stop scheduler when page is hidden / unloaded ───
  window.addEventListener('pagehide', function () {
    if (schedTimer) { clearTimeout(schedTimer); schedTimer = null; }
    if (audioCtx)   { audioCtx.close().catch(function () {}); }
  });

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
