// ── Ink FX: little symbols that float up when you click ─────────
// Shared by index.html and welcome.html. Exposes window.InkFX.
(function () {
  'use strict';

  // Full set of decorative symbols
  var SYMBOLS = [
    'ᯤ', '=͟͟͞♡', 'ᯅ̈', '·͜·♡', '˘͈ᵕ˘͈', '♡̆̈', '𓍲', '𓍱', 'ꪔ̤̥', '𓍯', 'ꊞ', '𓂃',
    'ꕀ', '*﹆', '˚ ༘♡', '⋆｡˚', '⤾', '・°☆', '✎ ̼', '◡̈ ⑅', '♡̷', '𖦹',
    '･͛♡̷̷̷･͛', 'ᐧ༚̮ᐧ', 'εїз', 'ᙏ̤̫', '˳✧༚', '/✿', '˙ᘧ ͜ ˙', '♡ ⊸ ꒰ ❛ ❜ ꒱',
    'ॱଳ͘', '◡̎', '･῾ ᵎ ⌇ ⁺◦', '✩‧₊˚', '♡̩͙', '·˚ ₊˚ˑ', '✧‧₊˚', '♡˖*°',
    'ʬʬʬ', '･ ͜ʖ ･', '♡﹆', '˚◞♡ ⃗', '₊⋆', ':-)', '˙ ͜ʟ˙', 'യ', '⍤', '꙳⸌☻ັ⸍꙳',
    '⋆·˚ ༘ *', '*:･ﾟ◡̈', '✕', '⌒', '✩', '=͟͟͞͞♡', '˙ᴥ˙', '❝❞', 'ツ', '✱', '﹡',
    '＊', '÷', '°', '★', '→', '←', '↑', '↓', '✓', '○',
    'ᨼ ᩚ', '𖠚ᐝ', '⋆ Ꮺ ָ࣪ ۰', '꙳⋆ᯭ', '𓌈˒˒', '𓎩 ⸝⸝', '⁺◟ ✿⃣', 'ᰔᩚ', '⋆⑅˚₊',
    '॰｡ཻ˚♡', '𖠚໊', '⿻', '-ˋˏ * ٩( ◡̉̈ )۶ * ˎˊ-', '(՞ ܸ. .ܸ՞)', '|ꒉ:)و ̑̑',
    '◌', '⁽̨̡ ¨̮ ⁾̧̢', 'ꗃ', 'Ѽ', '₍ ⺣̤̬ ₎', '⌵̈⃝*₊', '☄︎.', '◟̊₍ꃓ₎◞◟₍ꃔ₎◞̊', 'ꁗ',
    '𓇼𓂂𓏸', '◟◟☃︎', 'ೀ', '𓂃◌𓈒𓐍𓇼', 'ᕐ ̆̈͜͡ ᕐ', '◝✩⡱', '¨̮∗⿻ᐝ', '𓌉', '𓇋', '☃︎',
    '౨ৎ', '◌⑅⃝*॰ॱ', '❅*⋆', '↟.｡.:*', '✩̋*̣̩⋆̩*✧̥͘', '࣪˓ .𖤣𖥧˚.', 'ʕ·͡ˑ·ཻʔ',
    'o̖⸜((̵̵́ ̆͒͟˚̩̭ ̆͒)̵̵̀)⸝o̗'
  ];

  // Small single marks — for sparkles, twinkles and drifting background bits
  var SMALL = [
    '♡', '♡̷', '✩', '★', '✧', '⋆', '₊⋆', '⋆｡˚', '˚ ༘♡', '✱', '﹡', '＊', '°',
    'εїз', '𓂃', '𖦹', '꙳', '❅', '☄︎', '౨ৎ', 'ᯤ', '✓', '○', '◌', '⿻', '✿'
  ];

  // Eye pairs + mouths → little faces like ( ˊ ᵕ ˋ )
  var EYES = [
    ['ˊ', 'ˋ'], ['◞', '◟'], ['.ܸ', '.ܸ'], ['•', '•'], ['›', '‹'], ['o̴̶̷᷄', 'o̴̶̷̥᷅'],
    ['≧', '≦'], ['ˇ', 'ˇ'], ['◜', '◝'], ['◡', '◡'], ['•̀', '•́'], ['^', '^'],
    ['ᵒ̴̶̷̥́', 'ᵒ̴̶̷̣̥̀'], ['ꈍ', 'ꈍ'], ['⏑', '⏑'], ['◝', '◜'], ['•́', '•̀'], ['⊳', '⊲'],
    ['o̴̶̷̤', 'o̴̶̷̤'], ['˃̶̤́', '˂̶̤̀'], ['´', '｀'], ['-᷅', '-᷄'], ['߹', '߹'],
    ['՞', '՞'], ['ಠ', 'ಠ'], ['ᴗ͈', 'ᴗ͈']
  ];
  var MOUTHS = ['ᵕ', 'ᴗ', '‿', 'ω', '◡', '_ ̫ _', '.', 'ㅅ', '▿'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function face() {
    var e = pick(EYES);
    var m = pick(MOUTHS);
    if (m === '_ ̫ _') return '( ' + e[0] + ' _ ̫ _ ' + e[1] + ' )';
    return '( ' + e[0] + ' ' + m + ' ' + e[1] + ' )';
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fonts for every script in the symbol library. Google serves each in
  // small unicode-range slices, so a browser only downloads the pieces
  // for symbols that actually appear on screen.
  var FONT_FAMILIES = ["Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans Egyptian Hieroglyphs", "Noto Sans Math", "Noto Sans JP", "Noto Sans KR", "Noto Sans Thai", "Noto Serif Tibetan", "Noto Sans Sinhala", "Noto Sans Georgian", "Noto Sans Devanagari", "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans Runic", "Noto Sans Linear B", "Noto Sans Linear A", "Noto Sans Lepcha", "Noto Sans Cham", "Noto Sans Tai Tham", "Noto Sans Buginese", "Noto Sans Batak", "Noto Sans Javanese", "Noto Sans Mongolian", "Noto Sans Inscriptional Pahlavi", "Noto Sans Kannada", "Noto Sans Bengali", "Noto Sans Oriya", "Noto Sans NKo", "Noto Sans Armenian", "Noto Sans Canadian Aboriginal", "Noto Sans Lao", "Noto Sans Telugu", "Noto Sans Malayalam", "Noto Sans Yi", "Noto Sans Bamum"];
  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?' + FONT_FAMILIES.map(function (f) {
    return 'family=' + f.replace(/ /g, '+');
  }).join('&') + '&display=swap';
  function addFonts() { if (!fonts.parentNode) document.head.appendChild(fonts); }
  // Wait until the page has loaded so these fonts never slow the first paint.
  if (document.readyState === 'complete') setTimeout(addFonts, 300);
  else window.addEventListener('load', function () { setTimeout(addFonts, 300); });
  document.addEventListener('pointerdown', addFonts, { once: true });
  var FONT_STACK = FONT_FAMILIES.map(function (f) { return '"' + f + '"'; }).join(',');

  // Rough ink-edge filter, used by buttons and frames: filter: url(#ink-rough)
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML =
    '<filter id="ink-rough" x="-5%" y="-20%" width="110%" height="140%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter>';
  function addSvg() { document.body.appendChild(svg); }
  if (document.body) addSvg(); else document.addEventListener('DOMContentLoaded', addSvg);

  // Inject styles once
  var css = document.createElement('style');
  css.textContent =
    '.inkfx{position:fixed;z-index:10050;pointer-events:none;white-space:nowrap;' +
    'color:var(--ink,var(--text,#1b1a17));line-height:1;' +
    'font-family:' + FONT_STACK + ',"Segoe UI Symbol","Apple Symbols",' +
    '"Noto Sans",system-ui,sans-serif;transform:translate(-50%,-50%);' +
    'animation:inkfxFloat var(--d,1.1s) cubic-bezier(.2,.7,.3,1) forwards;}' +
    '@keyframes inkfxFloat{0%{opacity:0;transform:translate(-50%,-50%) scale(.6) rotate(0deg);}' +
    '12%{opacity:1;}65%{opacity:.9;}100%{opacity:0;transform:translate(calc(-50% + var(--tx,0px)),calc(-50% + var(--ty,-60px)))' +
    ' scale(1) rotate(var(--rot,0deg));}}';
  document.head.appendChild(css);

  function spawn(x, y, text, opts) {
    opts = opts || {};
    var el = document.createElement('span');
    el.className = 'inkfx';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = (opts.size || 16) + 'px';
    el.style.setProperty('--tx', (opts.tx || 0) + 'px');
    el.style.setProperty('--ty', (opts.ty || -60) + 'px');
    el.style.setProperty('--rot', (opts.rot || 0) + 'deg');
    el.style.setProperty('--d', (opts.dur || 1.1) + 's');
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, (opts.dur || 1.1) * 1000 + 60);
  }

  // Weighted pick: choose a category by weight, then a symbol inside it.
  // The original set counts as its own category, "classic".
  function pickFromLibrary() {
    var L = window.InkSymbols;
    if (!L) return pick(SYMBOLS);
    var cats = [['classic', SYMBOLS, 4]];
    Object.keys(L.LIB).forEach(function (k) {
      if (L.LIB[k].length) cats.push([k, L.LIB[k], L.WEIGHTS[k] || 1]);
    });
    var total = 0, i;
    for (i = 0; i < cats.length; i++) total += cats[i][2];
    var r = Math.random() * total;
    for (i = 0; i < cats.length; i++) { r -= cats[i][2]; if (r < 0) return pick(cats[i][1]); }
    return pick(SYMBOLS);
  }

  // One click → one main symbol or face, plus a couple of tiny marks
  function burst(x, y) {
    if (reduceMotion) return;
    var main = Math.random() < 0.2 ? face() : pickFromLibrary();
    spawn(x, y - 6, main, { size: 19, tx: (Math.random() - 0.5) * 24, ty: -80, dur: 1.7 });
    var n = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = 24 + Math.random() * 26;
      spawn(x, y, pick(SMALL), {
        size: 11 + Math.random() * 7,
        tx: Math.cos(a) * r,
        ty: Math.sin(a) * r - 20,
        rot: (Math.random() - 0.5) * 120,
        dur: 1.1 + Math.random() * 0.5
      });
    }
  }

  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, iframe')) return;
    burst(e.clientX, e.clientY);
  }, { passive: true });

  window.InkFX = { SYMBOLS: SYMBOLS, SMALL: SMALL, pick: pick, face: face, pickFromLibrary: pickFromLibrary, spawn: spawn, burst: burst };
})();
