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
  // ── Flower shape definitions ─────────────────────────────────
  // Petal paths are defined at base size 240. scalePath() scales them for other sizes.
  // p1 = base/rich color, p2 = lighter tip color, outline = cartoon stroke color
  var DEFS = [
    { // 🌸 Rose — plump rounded petals, romantic warmth
      petalPath:  'M0,0 C-26,-2 -32,-38 0,-58 C32,-38 26,-2 0,0',
      pw: 32, ph: 58,
      petalCount: 9, petalDist: 20,
      colors: { p1:'#FF6B9D', p2:'#FFCCE0', center:'#FFE566', stem:'#4a9a5a', outline:'rgba(180,30,80,0.30)' },
      centerR: 13,
    },
    { // 🌻 Sunflower — happy bold petals, high-contrast center
      petalPath:  'M0,0 C-9,-8 -11,-54 0,-72 C11,-54 9,-8 0,0',
      pw: 11, ph: 72,
      petalCount: 13, petalDist: 18,
      colors: { p1:'#FFD600', p2:'#FFAA00', center:'#3E1800', stem:'#4a9a5a', outline:'rgba(140,70,0,0.30)' },
      centerR: 19,
    },
    { // 🌷 Tulip — wide cupped petals, bold shape
      petalPath:  'M0,0 C-30,0 -34,-32 0,-52 C34,-32 30,0 0,0',
      pw: 34, ph: 52,
      petalCount: 6, petalDist: 12,
      colors: { p1:'#F44794', p2:'#FFA8C8', center:'#FFE566', stem:'#4a9a5a', outline:'rgba(160,10,60,0.28)' },
      centerR: 9,
    },
    { // 🌼 Daisy — cheerful thin petals, bright center
      petalPath:  'M0,0 C-7,-10 -9,-44 0,-60 C9,-44 7,-10 0,0',
      pw: 9, ph: 60,
      petalCount: 14, petalDist: 14,
      colors: { p1:'#FFFFFF', p2:'#E4EEFF', center:'#FFD600', stem:'#4a9a5a', outline:'rgba(100,120,200,0.22)' },
      centerR: 14,
    },
    { // 💜 Lavender — small oval petals clustered tight
      petalPath:  'M0,0 C-11,-2 -14,-22 0,-34 C14,-22 11,-2 0,0',
      pw: 14, ph: 34,
      petalCount: 16, petalDist: 6,
      colors: { p1:'#B47FFF', p2:'#E5C8FF', center:'#6D28D9', stem:'#6a9a7a', outline:'rgba(80,10,160,0.25)' },
      centerR: 8,
    },
    { // 🧡 Gerbera — many bold petals, vivid warm tone
      petalPath:  'M0,0 C-20,-4 -24,-50 0,-66 C24,-50 20,-4 0,0',
      pw: 24, ph: 66,
      petalCount: 14, petalDist: 18,
      colors: { p1:'#FF5722', p2:'#FFC07A', center:'#B71C1C', stem:'#4a9a5a', outline:'rgba(160,40,0,0.28)' },
      centerR: 16,
    },
  ];

  var NS        = 'http://www.w3.org/2000/svg';
  var FILL_DIST = 150;   // px drag = 100% fill
  var HIT_PAD   = 60;    // px padding around flower hit zone

  // ── Composed bouquet layout (master SVG viewBox 0 0 320 200) ─────
  var BQ_SIZE      = 90;                          // flower SVG size in bouquet
  var BQ_STEM_BOT  = Math.round(BQ_SIZE * 0.88); // 79 — stem-bottom in flower's local coords
  var BQ_HEAD_Y    = Math.round(BQ_SIZE * 0.37); // 33 — head center Y in flower's local coords
  var BQ_RISE      = BQ_STEM_BOT - BQ_HEAD_Y;    // 46 — vertical dist stem→head in local space
  var BQ_HALF      = BQ_SIZE / 2;                // 45 — half width
  var BQ_VBW       = 320;                         // master SVG viewBox width
  var BQ_VBH       = 200;                         // master SVG viewBox height
  var BQ_PAPER_TOP = 165;                         // y-coord where paper starts (viewBox units)
  var BQ_PAPER_H   = 35;                          // paper height when fully wrapped

  // Six fan positions. sbx/sby = stem-bottom in viewBox coords, rot = tilt degrees.
  // DOM order of <g id="bqFn"> in HTML controls z-order (back-to-front: 3,4,1,2,5,0).
  var BQ_SLOTS = [
    { sbx: 160, sby: 160, rot:   0 },  // 0 Rose        — center
    { sbx: 140, sby: 160, rot: -20 },  // 1 Sunflower   — left-center
    { sbx: 180, sby: 160, rot:  20 },  // 2 Tulip       — right-center
    { sbx: 112, sby: 164, rot: -42 },  // 3 Daisy       — far left
    { sbx: 208, sby: 164, rot:  42 },  // 4 Lavender    — far right
    { sbx: 163, sby: 160, rot:   9 },  // 5 Gerbera     — centre-slight-right
  ];

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

  // ── SVG element helper ────────────────────────────────────────
  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    }
    return e;
  }

  // Scale all numeric values in an SVG path by factor s
  function scalePath(d, s) {
    if (s === 1) return d;
    return d.replace(/[+-]?(?:\d+\.?\d*|\.\d+)/g, function (n) {
      return (parseFloat(n) * s).toFixed(2);
    });
  }

  // ── Paper.js organic petal path generator ─────────────────────
  // Lazy-initialised: first call sets up a headless Paper.js scope.
  var _paperReady = false;
  function _ensurePaper() {
    if (_paperReady) return;
    if (!window.paper) return;
    try {
      // Headless mode (no canvas — path math only)
      window.paper.setup(new window.paper.Size(1000, 1000));
      _paperReady = true;
    } catch (e) {
      try {
        // Fallback: tiny off-screen canvas (never attached to DOM)
        var c = document.createElement('canvas');
        c.width = 200; c.height = 200;
        window.paper.setup(c);
        _paperReady = true;
      } catch (e2) { /* give up — cubic-bezier fallbacks used */ }
    }
  }

  // Returns an SVG path d-string for an organic petal.
  //   pw  = half-width at the widest point (at base-240 units * s)
  //   ph  = total height (base to tip)
  //   jitter = 0–0.20 random wobble per key-point
  // Path is centred at origin (0,0), tip pointing toward negative-Y.
  function getOrganicPetalPath(pw, ph, jitter) {
    _ensurePaper();
    if (!_paperReady || !window.paper) {
      // Simple cubic-bezier fallback (original shape, no jitter)
      return 'M0,0 C-' + pw.toFixed(1) + ',0' +
             ' -' + pw.toFixed(1) + ',-' + (ph * 0.72).toFixed(1) +
             ' 0,-' + ph.toFixed(1) +
             ' C' + pw.toFixed(1) + ',-' + (ph * 0.72).toFixed(1) +
             ' ' + pw.toFixed(1) + ',0 0,0';
    }
    var p = window.paper;
    function j(v) { return v * (1 + (Math.random() - 0.5) * jitter * 2); }
    // 8 key-points: base → left bulge → tip → right bulge → base
    var pts = [
      [0,                    0],
      [-j(pw * 0.28), -j(ph * 0.13)],
      [-j(pw * 0.96), -j(ph * 0.43)],
      [-j(pw * 0.62), -j(ph * 0.71)],
      [(Math.random() - 0.5) * pw * 0.06, -j(ph)],  // tip: tiny x wobble
      [ j(pw * 0.62), -j(ph * 0.71)],
      [ j(pw * 0.96), -j(ph * 0.43)],
      [ j(pw * 0.28), -j(ph * 0.13)],
    ];
    var path = new p.Path(pts.map(function (pt) { return new p.Point(pt[0], pt[1]); }));
    path.closed = true;
    path.smooth({ type: 'catmull-rom', factor: 0.6 });
    var node = path.exportSVG();
    var d = node ? (node.getAttribute('d') || '') : '';
    path.remove();
    return d || ('M0,0 L-' + pw + ',-' + (ph * 0.5) + ' 0,-' + ph + ' ' + pw + ',-' + (ph * 0.5) + 'Z');
  }

  // ── Build one flower SVG (proportional geometry — works at any size) ──
  // All measurements scale with `size`. Flower head is at fy = size*0.37,
  // so petals always fit within the SVG viewBox (no overflow for most types).
  function buildFlower(def, size, flowerIdx) {
    var s   = size / 240;        // scale factor vs base design size
    var cx  = size / 2;
    var fy  = Math.round(size * 0.37);   // flower-head center Y
    var stemTop = Math.round(fy  + size * 0.09);
    var stemBot = Math.round(size * 0.88);
    var stemW   = Math.max(3, size * 0.022);
    var gid     = 'fg_' + (flowerIdx || 0) + '_' + (size | 0);

    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size });
    svg.classList.add('flower-svg');

    // ── Gradient: tip (p2) at top, rich color (p1) at base ──────
    var defs = svgEl('defs');
    var grad = svgEl('linearGradient', { id: gid, x1: '0%', y1: '100%', x2: '0%', y2: '0%' });
    var gStop1 = svgEl('stop', { offset: '0%',  'stop-color': def.colors.p1, 'stop-opacity': '1' });
    var gStop2 = svgEl('stop', { offset: '100%','stop-color': def.colors.p2, 'stop-opacity': '1' });
    grad.appendChild(gStop1); grad.appendChild(gStop2);
    defs.appendChild(grad);

    // ── Drop-shadow filter for depth on petals ───────────────────
    var filtId = gid + '-shd';
    var filt = svgEl('filter', { id: filtId, x: '-30%', y: '-30%', width: '160%', height: '160%' });
    var fds  = svgEl('feDropShadow', {
      dx: '0', dy: (2 * s).toFixed(1),
      stdDeviation: (3 * s).toFixed(1),
      'flood-color': 'rgba(0,0,0,0.22)',
    });
    filt.appendChild(fds);
    defs.appendChild(filt);

    svg.appendChild(defs);

    // ── Stem (slight wiggle path for organic feel) ───────────────
    var sx = cx + size * 0.03;   // slight horizontal offset mid-curve
    var stemPath = [
      'M', cx, stemTop,
      'Q', sx, (stemTop + stemBot) / 2, cx, stemBot,
    ].join(' ');
    var stem = svgEl('path', {
      d: stemPath, fill: 'none',
      stroke: def.colors.stem,
      'stroke-width': stemW,
      'stroke-linecap': 'round',
    });
    stem.classList.add('fl-stem');
    svg.appendChild(stem);

    // ── Leaves (fat rounded ellipses, angled away from stem) ─────
    var leafH    = size * 0.34;   // distance up the stem
    var leafOffs = size * 0.06;   // horizontal nudge
    [
      { lx: cx - leafOffs, ly: stemBot - leafH * 0.38, rx: size*0.10, ry: size*0.038, ang: -44 },
      { lx: cx + leafOffs, ly: stemBot - leafH * 0.68, rx: size*0.10, ry: size*0.033, ang:  46 },
    ].forEach(function (lp, i) {
      var lf = svgEl('ellipse', {
        cx: lp.lx.toFixed(1), cy: lp.ly.toFixed(1),
        rx: lp.rx.toFixed(1), ry: lp.ry.toFixed(1),
        fill: def.colors.stem, opacity: '0.78',
        transform: 'rotate(' + lp.ang + ',' + lp.lx.toFixed(1) + ',' + lp.ly.toFixed(1) + ')',
      });
      lf.classList.add('fl-leaf', 'fl-leaf-' + i);
      svg.appendChild(lf);
    });

    // ── Bud (shows while watering, hidden by petals on full bloom) ──
    var bR1 = size * 0.054, bR2 = size * 0.030;
    var budG = svgEl('g');
    budG.classList.add('fl-bud');
    budG.appendChild(svgEl('ellipse', {
      cx: cx, cy: fy + bR1 * 0.7,
      rx: bR1 * 0.60, ry: bR1 * 1.00,
      fill: def.colors.p1, opacity: '0.90',
    }));
    budG.appendChild(svgEl('ellipse', {
      cx: cx, cy: fy + bR2 * 0.4,
      rx: bR2 * 0.60, ry: bR2 * 1.00,
      fill: def.colors.p2,
    }));
    svg.appendChild(budG);

    // ── Petals group (Paper.js organic bezier curves) ────────────
    // SVG attribute sets position + scale(0) as a hard fallback.
    // GSAP may override this with CSS transforms; if GSAP fails the
    // SVG attribute keeps the petals invisible at the correct position.
    var petG = svgEl('g');
    petG.classList.add('fl-petals');
    petG.setAttribute('transform', 'translate(' + cx + ',' + fy + ') scale(0)');

    var pw        = (def.pw || 26) * s;    // petal half-width at this size
    var ph        = (def.ph || 58) * s;    // petal height at this size
    var scaledDist = (def.petalDist * s).toFixed(2);
    var strokeW    = Math.max(0.6, 1.8 * s).toFixed(2);

    // Outer petal group gets the drop-shadow so inner layers don't double-shadow
    var petalShGroup = svgEl('g', { filter: 'url(#' + filtId + ')' });

    for (var i = 0; i < def.petalCount; i++) {
      // Organic angle jitter — breaks perfect radial symmetry
      var baseAng = (360 / def.petalCount) * i;
      var ang     = baseAng + (i % 3 === 0 ? 3.5 : i % 3 === 1 ? -2.5 : 0.8);
      // Sine-wave size variation: neighboring petals subtly differ
      var szMul   = (0.86 + 0.28 * ((Math.sin(i * 2.1 + 1.2) + 1) / 2)).toFixed(3);
      var xfm     = 'rotate(' + ang.toFixed(1) + ') translate(0,-' + scaledDist + ') scale(' + szMul + ')';

      // ── Main petal: organic catmull-rom bezier ──
      var mainD = getOrganicPetalPath(pw, ph, 0.10);
      var mainP = svgEl('path', {
        d: mainD,
        fill: 'url(#' + gid + ')',
        stroke: def.colors.outline,
        'stroke-width': strokeW,
        'stroke-linejoin': 'round',
        opacity: (0.90 + 0.08 * (i % 2)).toFixed(2),
        transform: xfm,
      });
      mainP.classList.add('fl-petal');
      petalShGroup.appendChild(mainP);

      // ── Inner highlight: smaller petal, lighter fill, no stroke ──
      var hilD = getOrganicPetalPath(pw * 0.55, ph * 0.62, 0.04);
      var hilP = svgEl('path', {
        d: hilD,
        fill: def.colors.p2,
        opacity: '0.38',
        transform: xfm,
      });
      petalShGroup.appendChild(hilP);

      // ── Petal vein: thin bezier from base toward tip ──
      var vx = (pw * 0.07).toFixed(1);
      var vy = (-ph * 0.48).toFixed(1);
      var vt = (-ph * 0.88).toFixed(1);
      var veinD = 'M0,0 Q' + vx + ',' + vy + ' 0,' + vt;
      petalShGroup.appendChild(svgEl('path', {
        d: veinD,
        fill: 'none',
        stroke: def.colors.outline,
        'stroke-width': (Math.max(0.4, strokeW * 0.35)).toFixed(2),
        'stroke-linecap': 'round',
        opacity: '0.32',
        transform: xfm,
      }));
    }

    petG.appendChild(petalShGroup);
    svg.appendChild(petG);

    // ── Centre (tiered circles + dot ring — cel-shade style) ─────
    var cR = def.centerR * s;
    // Outer shadow halo
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: fy, r: (cR * 1.30).toFixed(1),
      fill: 'rgba(0,0,0,0.18)',
    }));
    // Main center disc
    var cir = svgEl('circle', {
      cx: cx, cy: fy, r: cR.toFixed(1),
      fill: def.colors.center,
      stroke: 'rgba(255,255,255,0.30)',
      'stroke-width': Math.max(1, 2 * s).toFixed(1),
    });
    cir.classList.add('fl-center');
    svg.appendChild(cir);
    // Inner lighter tier (cel-shade highlight)
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: fy, r: (cR * 0.54).toFixed(1),
      fill: 'rgba(255,255,255,0.28)',
    }));

    // Dot ring around center edge — replaces scattered pollen
    var polG = svgEl('g');
    polG.classList.add('fl-pollen');
    var dotCount = Math.min(8, Math.max(5, Math.round(cR * 1.1)));
    var dotR     = cR * 0.82;
    var dotSize  = (cR * 0.17).toFixed(1);
    for (var di = 0; di < dotCount; di++) {
      var da = (2 * Math.PI / dotCount) * di;
      polG.appendChild(svgEl('circle', {
        cx: (cx + Math.cos(da) * dotR).toFixed(1),
        cy: (fy + Math.sin(da) * dotR).toFixed(1),
        r:  dotSize,
        fill: 'rgba(255,255,255,0.75)',
      }));
    }
    svg.appendChild(polG);

    return svg;
  }

  // ── GSAP timeline (scrub 0→1 via drag) ───────────────────────
  // Returns null if GSAP isn't loaded; caller falls back to direct SVG attrs.
  function buildTimeline(svg, size) {
    if (typeof gsap === 'undefined') return null;
    // Use same proportional coords as buildFlower
    var cx      = size / 2;
    var fy      = Math.round(size * 0.37);
    var stemBot = Math.round(size * 0.88);

    var stem   = svg.querySelector('.fl-stem');
    var leaf0  = svg.querySelector('.fl-leaf-0');
    var leaf1  = svg.querySelector('.fl-leaf-1');
    var bud    = svg.querySelector('.fl-bud');
    var petG   = svg.querySelector('.fl-petals');
    var center = svg.querySelector('.fl-center');
    var pollen = svg.querySelector('.fl-pollen');

    // petG already has the correct initial SVG attribute (translate+scale 0).
    // We do NOT re-set it here to avoid GSAP CSS vs SVG attribute conflicts.
    // GSAP animates scale via the 'scale' shorthand which should cascade correctly.
    gsap.set(stem,   { scaleY: 0.06, svgOrigin: cx + ' ' + stemBot });
    gsap.set(leaf0,  { scale: 0, opacity: 0, svgOrigin: cx + ' ' + stemBot });
    gsap.set(leaf1,  { scale: 0, opacity: 0, svgOrigin: cx + ' ' + stemBot });
    gsap.set(bud,    { scale: 1, opacity: 1 });
    gsap.set(center, { scale: 0, svgOrigin: cx + ' ' + fy });
    gsap.set(pollen, { scale: 0, opacity: 0, svgOrigin: cx + ' ' + fy });

    var tl = gsap.timeline({ paused: true });
    tl
      // 0–32%: stem grows up from base
      .to(stem,   { scaleY: 1, duration: 0.32, ease: 'power2.inOut' }, 0)
      // 12–40%: leaves unfurl
      .to(leaf0,  { scale: 1, opacity: 1, rotation: -40, duration: 0.28, ease: 'back.out(2)' }, 0.12)
      .to(leaf1,  { scale: 1, opacity: 1, rotation:  40, duration: 0.28, ease: 'back.out(2)' }, 0.20)
      // 28–48%: bud folds away
      .to(bud,    { scale: 0, opacity: 0, duration: 0.20, ease: 'power2.in' }, 0.28)
      // 34–72%: whole petal group blooms open
      .to(petG,   { scale: 1, duration: 0.38, ease: 'back.out(1.8)' }, 0.34)
      // 63–78%: centre pops in
      .to(center, { scale: 1, duration: 0.22, ease: 'back.out(2.8)' }, 0.63)
      // 73–84%: pollen sparkles
      .to(pollen, { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(3)' }, 0.73)
      // 84–100%: whole group sways gently — fully open
      .to(petG,   { rotation: '+=4', yoyo: true, repeat: 1, duration: 0.16, ease: 'sine.inOut' }, 0.84);

    return tl;
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

    // Complete bloom instantly
    if (activeTimeline) {
      if (typeof gsap !== 'undefined') {
        gsap.to(activeTimeline, { progress: 1, duration: 0.22, ease: 'power2.out' });
      } else {
        activeTimeline.progress(1);
      }
    } else if (activePetG) {
      // GSAP-free fallback: snap petals to full scale
      activePetG.setAttribute('transform',
        'translate(' + activeCX + ',' + activeFY + ') scale(1)'
      );
    }

    // Bounce pop
    var svg = wrap.querySelector('.flower-svg');
    if (svg) {
      if (typeof gsap !== 'undefined') {
        gsap.to(svg, {
          scale: 1.22, duration: 0.16, ease: 'power2.out',
          onComplete: function () {
            gsap.to(svg, { scale: 1, duration: 0.30, ease: 'elastic.out(1, 0.5)' });
          },
        });
      } else {
        // CSS fallback bounce
        svg.style.transition = 'transform 0.16s ease-out';
        svg.style.transform  = 'scale(1.18)';
        setTimeout(function () {
          svg.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          svg.style.transform  = 'scale(1)';
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
            heartStep++;
            advanceHeart(heartStep);
            goTo(12);   // → s5/Q5
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

  // ── Add a flower to the composed bouquet SVG ─────────────────
  function addToBouquet(idx) {
    var slotG = document.getElementById('bqF' + idx);
    if (!slotG) return;

    var slot = BQ_SLOTS[idx];

    // Build flower at BQ_SIZE. Use a unique gid suffix to avoid id collision
    // with the large active-stage flower (which uses idx without suffix).
    var mini   = buildFlower(DEFS[idx], BQ_SIZE, idx + 100);
    var miniTl = buildTimeline(mini, BQ_SIZE);
    if (miniTl) {
      miniTl.progress(1);  // instantly fully bloomed
      miniTl.kill();
    } else {
      var miniPetG = mini.querySelector('.fl-petals');
      if (miniPetG) {
        miniPetG.setAttribute('transform',
          'translate(' + BQ_HALF + ',' + BQ_HEAD_Y + ') scale(1)'
        );
      }
    }

    // ── Transform: stem-bottom lands at (sbx, sby), flower rotated by rot ──
    // Equivalent steps (right-to-left application):
    //   1. translate(-BQ_HALF, -BQ_STEM_BOT) — bring stem-bottom to local origin
    //   2. rotate(rot)                        — tilt around that point
    //   3. translate(sbx, sby)               — move to final global position
    slotG.setAttribute('transform',
      'translate(' + slot.sbx + ',' + slot.sby + ')' +
      ' rotate(' + slot.rot + ')' +
      ' translate(' + (-BQ_HALF) + ',' + (-BQ_STEM_BOT) + ')'
    );
    slotG.appendChild(mini);

    // Entrance: pop in from flower-head position
    var rotRad = slot.rot * Math.PI / 180;
    var headVbX = (slot.sbx + BQ_RISE * Math.sin(rotRad)).toFixed(1);
    var headVbY = (slot.sby - BQ_RISE * Math.cos(rotRad)).toFixed(1);
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(slotG,
        { scale: 0, opacity: 0, svgOrigin: headVbX + ' ' + headVbY },
        { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }
      );
    } else {
      slotG.style.opacity = '0';
      slotG.style.transition = 'opacity 0.4s ease';
      requestAnimationFrame(function () { slotG.style.opacity = '1'; });
    }

    burstHearts(idx);
    updateWrap(idx + 1);
  }

  // ── Load flower onto center stage ─────────────────────────────
  function loadFlower(idx) {
    var wrap = document.getElementById('activeFlowerWrap');
    if (!wrap) return;

    if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
    activePetG = null;
    wrap.innerHTML = '';
    fillPct = 0;
    setRing(0);

    var size = 240;
    var svg  = buildFlower(DEFS[idx], size, idx);
    wrap.appendChild(svg);

    // Store petG reference for GSAP-free fallback animation
    activePetG = svg.querySelector('.fl-petals');
    activeCX   = size / 2;
    activeFY   = Math.round(size * 0.37);   // matches buildFlower's fy formula

    // petG already has scale(0) via SVG attribute (set in buildFlower).
    // buildTimeline returns null if GSAP not loaded — that's fine.
    activeTimeline = buildTimeline(svg, size);

    var ctr = document.getElementById('flowerCounter');
    if (ctr) ctr.textContent = 'ดอกที่ ' + (idx + 1) + ' / ' + DEFS.length;

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(svg,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.40, ease: 'back.out(1.8)' }
      );
    } else {
      // Fallback: simple CSS transition entrance
      svg.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      svg.style.opacity    = '0';
      svg.style.transform  = 'scale(0.6)';
      requestAnimationFrame(function () {
        svg.style.opacity   = '1';
        svg.style.transform = 'scale(1)';
      });
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
          // GSAP-free fallback: scale petals via SVG attribute directly
          activePetG.setAttribute('transform',
            'translate(' + activeCX + ',' + activeFY + ') scale(' + (fillPct / 100).toFixed(4) + ')'
          );
        }
        setRing(fillPct);

        if (fillPct >= 100) {
          dragging = false;
          if (ghostEl) ghostEl.style.display = 'none';
          if (canEl)   canEl.classList.remove('can-held');
          bloomCurrent();
        }
      }

      lastX = e.clientX;
      lastY = e.clientY;
    };

    _onCanUp = function () {
      if (!dragging) return;
      dragging = false;
      if (ghostEl) ghostEl.style.display = 'none';
      if (canEl)   canEl.classList.remove('can-held');
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

  function updateWrap(count) {
    var paper  = document.getElementById('bqPaperRect');
    var ribbon = document.getElementById('bqRibRect');
    if (!paper) return;
    // Grow paper progressively: 0 → 75% of BQ_PAPER_H while watering
    var h = Math.round((count / DEFS.length) * BQ_PAPER_H * 0.78);
    var y = BQ_VBH - h;
    paper.setAttribute('y', y);
    paper.setAttribute('height', h);
    if (count >= 4 && ribbon) {
      ribbon.setAttribute('y', y);
      ribbon.setAttribute('height', h);
      ribbon.setAttribute('opacity', '0.88');
    }
  }

  function burstHearts(slotIdx) {
    // Compute flower-head screen position from master SVG viewBox coords
    var masterSvg = document.getElementById('bqMasterSvg');
    if (!masterSvg) return;
    var r = masterSvg.getBoundingClientRect();
    var slot    = BQ_SLOTS[slotIdx];
    var rotRad  = slot.rot * Math.PI / 180;
    var vbX     = slot.sbx + BQ_RISE * Math.sin(rotRad);
    var vbY     = slot.sby - BQ_RISE * Math.cos(rotRad);
    var scaleX  = r.width  / BQ_VBW;
    var scaleY  = r.height / BQ_VBH;
    var cx      = r.left + vbX * scaleX;
    var cy      = r.top  + vbY * scaleY;
    var colors  = ['#FF4D8B','#FF90C0','#FFD600','#C084FC','#7DDFFF'];
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
    var paper  = document.getElementById('bqPaperRect');
    var ribbon = document.getElementById('bqRibRect');
    var bow    = document.getElementById('bqBowG');
    var cont   = document.getElementById('bwContainer');

    if (!paper) { if (callback) callback(); return; }

    // 1. Paper shoots up to full height with bounce
    var finalY = BQ_VBH - BQ_PAPER_H;  // = 165
    if (typeof gsap !== 'undefined') {
      gsap.to(paper,  { attr: { y: finalY, height: BQ_PAPER_H }, duration: 0.42, ease: 'back.out(1.6)' });
      if (ribbon) gsap.to(ribbon, { attr: { y: finalY, height: BQ_PAPER_H }, opacity: 0.9, duration: 0.42, ease: 'back.out(1.6)' });
    } else {
      paper.setAttribute('y', finalY);
      paper.setAttribute('height', BQ_PAPER_H);
      if (ribbon) { ribbon.setAttribute('y', finalY); ribbon.setAttribute('height', BQ_PAPER_H); ribbon.setAttribute('opacity', '0.9'); }
    }

    // 2. Bow pops in at BQ_PAPER_TOP
    setTimeout(function () {
      if (!bow) return;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(bow,
          { scale: 0, opacity: 0, svgOrigin: '160 ' + finalY },
          { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.8)' }
        );
      } else {
        bow.setAttribute('opacity', '1');
      }
    }, 440);

    // 3. Sparkle burst from centre of bouquet
    setTimeout(function () {
      var masterSvg = document.getElementById('bqMasterSvg');
      var base = masterSvg ? masterSvg.getBoundingClientRect()
                           : (cont ? cont.getBoundingClientRect() : null);
      if (!base) return;
      var cx     = base.left + base.width  * 0.50;
      var cy     = base.top  + base.height * 0.38;
      var sparks = ['#FF4D8B','#FFD600','#C084FC','#7DDFFF','#FF9800','#4CAF60','#FF5FAE','#FFE566'];
      for (var i = 0; i < 14; i++) {
        (function (i) {
          var sp  = document.createElement('div');
          sp.className = 'bq-spark';
          var ang = (i / 14) * Math.PI * 2;
          var d   = 24 + Math.random() * 28;
          sp.style.cssText = [
            'left:' + (cx - 4.5) + 'px',
            'top:'  + (cy - 4.5) + 'px',
            'background:' + sparks[i % sparks.length],
            '--sx:' + Math.round(Math.cos(ang) * d) + 'px',
            '--sy:' + Math.round(Math.sin(ang) * d) + 'px',
            'animation-delay:' + (i * 30) + 'ms',
          ].join(';');
          document.body.appendChild(sp);
          setTimeout(function () { sp.parentNode && sp.parentNode.removeChild(sp); }, 1200);
        }(i));
      }
    }, 580);

    // 4. Callback after animation settles
    setTimeout(function () { if (callback) callback(); }, 1700);
  }

  function resetWrap() {
    var paper  = document.getElementById('bqPaperRect');
    var ribbon = document.getElementById('bqRibRect');
    var bow    = document.getElementById('bqBowG');
    if (paper)  { paper.setAttribute('y', BQ_VBH);  paper.setAttribute('height', '0'); }
    if (ribbon) { ribbon.setAttribute('y', BQ_VBH); ribbon.setAttribute('height', '0'); ribbon.setAttribute('opacity', '0'); }
    if (bow)    { bow.setAttribute('opacity', '0');  if (typeof gsap !== 'undefined') gsap.set(bow, { scale: 0 }); }
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
    // Clear all flower slots in the master bouquet SVG
    [0, 1, 2, 3, 4, 5].forEach(function (i) {
      var g = document.getElementById('bqF' + i);
      if (!g) return;
      g.innerHTML = '';
      g.removeAttribute('transform');
      if (typeof gsap !== 'undefined') gsap.set(g, { clearProps: 'all' });
    });
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
      md.data[k] = md.data[k] >= 128 ? 255 : 0;  // match reveal-count threshold
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
