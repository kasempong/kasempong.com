'use strict';

// ── Particle canvas ───────────────────────────────────────────────
var canvas  = document.getElementById('bg-canvas');
var ctx     = canvas.getContext('2d');
var pars    = [];
var GLYPHS  = ['✦', '✧', '⋆', '🌙'];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function makePar() {
  return {
    x:          Math.random() * canvas.width,
    y:          canvas.height + 10 + Math.random() * 80,
    glyph:      GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    size:       9 + Math.random() * 11,
    vy:         0.22 + Math.random() * 0.40,
    vx:         (Math.random() - 0.5) * 0.16,
    opacity:    0,
    maxOpacity: 0.12 + Math.random() * 0.22,
    dying:      false,
  };
}

function initPars() {
  pars = [];
  for (var i = 0; i < 45; i++) {
    var p = makePar();
    p.y = Math.random() * (canvas.height + 50);
    pars.push(p);
  }
}

function tickPars() {
  for (var i = 0; i < pars.length; i++) {
    var p = pars[i];
    p.y -= p.vy;
    p.x += p.vx;
    if (!p.dying) p.opacity = Math.min(p.opacity + 0.007, p.maxOpacity);
    if (p.y < canvas.height * 0.12) { p.dying = true; p.opacity -= 0.004; }
    if (p.opacity <= 0 && p.dying) pars[i] = makePar();
  }
}

function drawPars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < pars.length; i++) {
    var p = pars[i];
    if (p.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.font = p.size + 'px serif';
    ctx.fillText(p.glyph, p.x, p.y);
    ctx.restore();
  }
}

// ── Companions ────────────────────────────────────────────────────
var COMP_CFG = [
  { radiusBase: 112, baseAngle: 0,    speed: 0.44, flyDelay: 2900 },
  { radiusBase: 155, baseAngle: 2.09, speed: 0.27, flyDelay: 3550 },
  { radiusBase: 198, baseAngle: 4.19, speed: 0.17, flyDelay: 4200 },
];
var FLY_DUR = 900;
var showComps = Math.min(window.innerWidth, window.innerHeight) >= 480;

function getRadius(base) {
  var minDim = Math.min(window.innerWidth, window.innerHeight);
  return base * Math.max(0.58, Math.min(1.0, minDim / 640));
}

function orbitXY(cfg, angle) {
  var cx = window.innerWidth  / 2;
  var cy = window.innerHeight / 2;
  var r  = getRadius(cfg.radiusBase);
  var wide = window.innerWidth < 560 ? 1.4 : 1.0;
  return {
    x: cx + r * wide * Math.cos(angle) - 14,
    y: cy + r * 0.82 * Math.sin(angle) - 14,
  };
}

function offScreenXY(idx) {
  var cx = window.innerWidth  / 2;
  var cy = window.innerHeight / 2;
  if (idx === 0) return { x: window.innerWidth  + 50, y: cy - 90 };
  if (idx === 1) return { x: cx + 40,              y: window.innerHeight + 50 };
  return             { x: -50,                    y: cy + 70 };
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

var compEls = [
  document.getElementById('comp-0'),
  document.getElementById('comp-1'),
  document.getElementById('comp-2'),
];

var compState = COMP_CFG.map(function(cfg, i) {
  return {
    cfg:        cfg,
    el:         compEls[i],
    phase:      'waiting',
    flyStart:   null,
    flyFrom:    null,
    orbitStart: null,
  };
});

// ── Main RAF loop ─────────────────────────────────────────────────
var rafId     = null;
var loopAlive = true;
var loopT0    = null;

function mainLoop(ts) {
  if (!loopT0) loopT0 = ts;
  var elapsed = ts - loopT0;

  if (showComps) {
    compState.forEach(function(s, idx) {
      if (s.phase === 'waiting' && elapsed >= s.cfg.flyDelay) {
        s.phase    = 'flying';
        s.flyStart = ts;
        s.flyFrom  = offScreenXY(idx);
      }
    });

    compState.forEach(function(s) {
      if (s.phase === 'flying') {
        var t    = Math.min((ts - s.flyStart) / FLY_DUR, 1);
        var ease = easeOut(t);
        var tgt  = orbitXY(s.cfg, s.cfg.baseAngle);
        s.el.style.left    = (s.flyFrom.x + (tgt.x - s.flyFrom.x) * ease) + 'px';
        s.el.style.top     = (s.flyFrom.y + (tgt.y - s.flyFrom.y) * ease) + 'px';
        s.el.style.opacity = String(Math.min(ease * 1.3, 1));
        if (t >= 1) { s.phase = 'orbiting'; s.orbitStart = ts; }
      } else if (s.phase === 'orbiting') {
        var sec   = (ts - s.orbitStart) / 1000;
        var angle = s.cfg.baseAngle + s.cfg.speed * sec;
        var pos   = orbitXY(s.cfg, angle);
        s.el.style.left    = pos.x + 'px';
        s.el.style.top     = pos.y + 'px';
        s.el.style.opacity = '1';
      }
    });
  }

  tickPars();
  drawPars();

  if (loopAlive) rafId = requestAnimationFrame(mainLoop);
}

// ── Name letters ─────────────────────────────────────────────────
var NAME     = 'Kasempong';
var nameWrap = document.getElementById('name-wrap');
NAME.split('').forEach(function(ch) {
  var s = document.createElement('span');
  s.className   = 'name-letter';
  s.textContent = ch;
  nameWrap.appendChild(s);
});
var nameLetters = nameWrap.querySelectorAll('.name-letter');

function revealName() {
  nameLetters.forEach(function(el, i) {
    setTimeout(function() { el.classList.add('lit'); }, i * 190);
  });
}

// ── Tooth ─────────────────────────────────────────────────────────
var toothEl = document.getElementById('tooth');

function revealTooth() {
  toothEl.classList.add('show');
  setTimeout(function() {
    toothEl.classList.remove('show');
    toothEl.style.opacity   = '1';
    toothEl.style.transform = 'scale(1)';
    requestAnimationFrame(function() { toothEl.classList.add('float'); });
  }, 680);
}

// ── Subtitle typewriter ───────────────────────────────────────────
var subEl = document.getElementById('subtitle');
var SUB   = 'Be humble. Be patient.';

function typeSubtitle() {
  subEl.classList.add('visible');
  var i  = 0;
  var iv = setInterval(function() {
    subEl.textContent += SUB[i++];
    if (i >= SUB.length) clearInterval(iv);
  }, 62);
}

// ── Enter button ──────────────────────────────────────────────────
var enterBtn = document.getElementById('enter-btn');

function showEnterBtn() {
  enterBtn.classList.add('show');
  setTimeout(function() {
    enterBtn.classList.remove('show');
    enterBtn.style.opacity   = '1';
    enterBtn.style.transform = 'translateY(0)';
    requestAnimationFrame(function() { enterBtn.classList.add('pulse'); });
  }, 700);
}

// ── Black hole transition ─────────────────────────────────────────
var entered = false;

function triggerBlackHole() {
  if (entered) return;
  entered = true;
  enterBtn.disabled = true;
  loopAlive = false;
  cancelAnimationFrame(rafId);

  var cx = window.innerWidth  / 2;
  var cy = window.innerHeight / 2;

  document.getElementById('center-stage').classList.add('suck-in');

  compEls.forEach(function(el) {
    el.style.transition = 'left 0.5s ease-in, top 0.5s ease-in, transform 0.5s ease-in, opacity 0.4s ease-in';
    el.style.left       = (cx - 14) + 'px';
    el.style.top        = (cy - 14) + 'px';
    el.style.transform  = 'scale(0.04) rotate(400deg)';
    el.style.opacity    = '0';
  });

  canvas.style.transition = 'opacity 0.45s ease';
  canvas.style.opacity    = '0';

  setTimeout(function() {
    document.getElementById('vortex').classList.add('expand');
  }, 80);

  setTimeout(function() {
    sessionStorage.setItem('_entered', '1');
    window.location.replace('/');
  }, 980);
}

enterBtn.addEventListener('click', triggerBlackHole);
enterBtn.addEventListener('touchend', function(e) {
  e.preventDefault();
  triggerBlackHole();
});

// ── Boot sequence ─────────────────────────────────────────────────
resizeCanvas();
initPars();
requestAnimationFrame(mainLoop);

var _t1 = setTimeout(revealName,    500);
var _t2 = setTimeout(revealTooth,  1400);
var _t3 = setTimeout(typeSubtitle, 1900);
var _t4 = setTimeout(showEnterBtn, 3500);

window.addEventListener('resize', resizeCanvas);

// Cancel pending timers if the page is unloaded (BFCache / tab close)
window.addEventListener('pagehide', function () {
  clearTimeout(_t1);
  clearTimeout(_t2);
  clearTimeout(_t3);
  clearTimeout(_t4);
});
