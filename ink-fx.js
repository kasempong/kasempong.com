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

  // Fonts for the rarer symbols (Egyptian hieroglyphs, Bamum, extra symbols)
  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs' +
    '&family=Noto+Sans+Bamum&family=Noto+Sans+Yi&family=Noto+Sans+Symbols+2&display=swap';
  document.head.appendChild(fonts);

  // Inject styles once
  var css = document.createElement('style');
  css.textContent =
    '.inkfx{position:fixed;z-index:10050;pointer-events:none;white-space:nowrap;' +
    'color:var(--ink,var(--text,#1b1a17));line-height:1;' +
    'font-family:"Noto Sans Symbols 2","Noto Sans Egyptian Hieroglyphs","Noto Sans Bamum","Noto Sans Yi","Segoe UI Symbol","Apple Symbols",' +
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

  // One click → one main symbol or face, plus a couple of tiny marks
  function burst(x, y) {
    if (reduceMotion) return;
    var main = Math.random() < 0.3 ? face() : pick(SYMBOLS);
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

  window.InkFX = { SYMBOLS: SYMBOLS, SMALL: SMALL, pick: pick, face: face, spawn: spawn, burst: burst };
})();
