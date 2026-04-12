'use strict';

// ── Site config ───────────────────────────────────────────────
var SITE_CONFIG = {
  BD_PASSWORD: '28042001', // birthday gate password — change here only
};

// ── Year ─────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── Navbar scroll ─────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile nav toggle ─────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.querySelector('.nav-links');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', () => navLinks.classList.remove('open')));

// ── Translations ──────────────────────────────────────────────
const translations = {
  en: {
    nav_about:        'About',
    nav_contact:      'Contact',
    hero_pill:        '✦ Available for work',
    hero_greeting:    "Hi, I'm",
    hero_bio:         "I'm a dentist with a curious mind. By day I do dentistry. By night I learn coding.",
    hero_cta_talk:    "Let's Talk ✉",
    hero_cta_email:   'Email Me ✉',
    contact_eyebrow:  'reach out',
    contact_title:    "Let's Connect 💬",
    contact_subtitle: "I'm always open to new opportunities, collaborations, or just a good conversation.",
    contact_email_label: 'Email',
    footer_made:      'Made with ♡',
    roles: ['General Dentist', 'Experimental Projects', 'Open-minded', 'Music Lover'],
  },
  th: {
    nav_about:        'เกี่ยวกับ',
    nav_contact:      'ติดต่อ',
    hero_pill:        '✦ พร้อมรับงาน',
    hero_greeting:    'สวัสดี ฉันชื่อ',
    hero_bio:         'ฉันเป็นทันตแพทย์ที่ช่างสงสัย กลางวันทำฟัน กลางคืนเรียนเขียนโค้ด',
    hero_cta_talk:    'คุยกันเลย ✉',
    hero_cta_email:   'ส่งอีเมล ✉',
    contact_eyebrow:  'ติดต่อฉัน',
    contact_title:    'มาเชื่อมต่อกัน 💬',
    contact_subtitle: 'ยินดีรับโอกาสใหม่ๆ งานร่วมมือ หรือแค่บทสนทนาดีๆ เสมอ',
    contact_email_label: 'อีเมล',
    footer_made:      'สร้างด้วยความรัก ♡',
    roles: ['ทันตแพทย์ทั่วไป', 'โปรเจกต์ทดลอง', 'เปิดกว้าง', 'คนรักดนตรี'],
  },
  zh: {
    nav_about:        '关于',
    nav_contact:      '联系',
    hero_pill:        '✦ 接受工作邀约',
    hero_greeting:    '你好，我是',
    hero_bio:         '我是一名充满好奇心的牙医。白天看诊，晚上学编程。',
    hero_cta_talk:    '联系我 ✉',
    hero_cta_email:   '发邮件 ✉',
    contact_eyebrow:  '联系方式',
    contact_title:    '保持联系 💬',
    contact_subtitle: '随时欢迎新机会、合作项目，或一次愉快的交流。',
    contact_email_label: '邮箱',
    footer_made:      '用爱制作 ♡',
    roles: ['全科牙医', '实验项目', '思想开放', '音乐爱好者'],
  },
};

// ── Language switcher ─────────────────────────────────────────
let currentLang = localStorage.getItem('lang') || 'en';
let roleIndex = 0, charIndex = 0, deleting = false;
let typingTimer = null;

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const t = translations[lang];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // Update lang attribute
  document.documentElement.lang = lang === 'zh' ? 'zh' : lang === 'th' ? 'th' : 'en';

  // Mark active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Restart typing with new language roles
  roleIndex = 0; charIndex = 0; deleting = false;
  if (typingTimer) clearTimeout(typingTimer);
  document.getElementById('typed-role').textContent = '';
  typeRole();
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});

// ── Typing effect ─────────────────────────────────────────────
const roleEl = document.getElementById('typed-role');

function typeRole() {
  const roles = translations[currentLang].roles;
  const current = roles[roleIndex];

  if (!deleting) {
    roleEl.textContent = current.slice(0, ++charIndex);
    if (charIndex === current.length) {
      deleting = true;
      typingTimer = setTimeout(typeRole, 2000);
      return;
    }
  } else {
    roleEl.textContent = current.slice(0, --charIndex);
    if (charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
    }
  }
  typingTimer = setTimeout(typeRole, deleting ? 55 : 95);
}

// ── Dark mode ─────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  // Keep Spotify embed in sync with site theme
  var sf = document.getElementById('spotifyEmbed');
  if (sf) {
    var base = 'https://open.spotify.com/embed/playlist/6hkjQl9fSd55QTU9S7KCBa?utm_source=generator&theme=';
    sf.src = base + (theme === 'dark' ? '0' : '1');
  }
}

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Init ──────────────────────────────────────────────────────
function getAutoTheme() {
  const h = new Date().getHours();
  return (h >= 6 && h < 20) ? 'light' : 'dark';
}
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);
applyLang(currentLang);



// ── Header stars ──────────────────────────────────────────────
(function () {
  const nav   = document.getElementById('navbar');
  const glyphs = ['✦', '✧', '⋆', '✶', '·', '⊹'];
  const COUNT  = 14;

  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.className   = 'nav-star';
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left     = (Math.random() * 100) + '%';
    s.style.top      = (Math.random() * 120 - 10) + '%';
    s.style.fontSize = (Math.random() * 9 + 7) + 'px';
    s.style.setProperty('--dur',   (Math.random() * 2 + 1.2) + 's');
    s.style.setProperty('--delay', (Math.random() * 3)       + 's');
    nav.appendChild(s);
  }
})();

// ── Button glitter ────────────────────────────────────────────
(function () {
  const glyphs = ['✦', '✧', '⋆', '✶', '*', '·'];

  function spawnSparks(btn, count) {
    const rect = btn.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const sp    = document.createElement('span');
      sp.className   = 'btn-spark';
      sp.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];

      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * 45 + 18;
      sp.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      sp.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      sp.style.left            = (Math.random() * 100) + '%';
      sp.style.top             = (Math.random() * 100) + '%';
      sp.style.fontSize        = (Math.random() * 7 + 7) + 'px';
      sp.style.animationDelay  = (Math.random() * 0.15) + 's';
      sp.style.color           = getComputedStyle(document.documentElement)
                                   .getPropertyValue('--accent').trim();
      btn.appendChild(sp);
      setTimeout(() => sp.remove(), 800);
    }
  }

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => spawnSparks(btn, 8));
    btn.addEventListener('click',      () => spawnSparks(btn, 14));
  });
})();

// ── Background canvas: stars & moons ─────────────────────────
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  const mouse  = { x: -999, y: -999 };
  let particles = [];
  const COUNT = 55;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('touchmove', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchstart', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', () => { mouse.x = -999; mouse.y = -999; }, { passive: true });

  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

  class Particle {
    constructor() { this.init(); }

    init() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.size = Math.random() * 4 + 2;
      const roll = Math.random();
      this.type = roll < 0.62 ? 'star' : roll < 0.88 ? 'moon' : 'tooth';
      this.baseOpacity = Math.random() * 0.45 + 0.15;
      this.phase = Math.random() * Math.PI * 2;
      this.phaseSpeed = Math.random() * 0.018 + 0.006;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed  = (Math.random() - 0.5) * 0.008;
    }

    color(alpha) {
      return isDark()
        ? `rgba(230, 195, 155, ${alpha})`
        : `rgba(160, 95, 65, ${alpha})`;
    }

    drawStar(alpha) {
      const s = this.size;
      ctx.save();
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color(alpha);
      // 4-point sparkle
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? s * 2.2 : s * 0.7;
        i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
                : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawMoon(alpha) {
      const r = this.size * 2.8;
      ctx.save();
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color(alpha);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(r * 0.45, -r * 0.1, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    drawTooth(alpha) {
      const s = this.size * 2.2;
      ctx.save();
      ctx.rotate(this.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isDark() ? `rgba(240,210,180,${alpha})` : `rgba(200,150,120,${alpha})`;
      // Simple tooth shape: rounded top, two roots at bottom
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, 0);
      ctx.bezierCurveTo(-s * 0.8, -s, s * 0.8, -s, s * 0.6, 0);
      ctx.lineTo(s * 0.5, s * 0.5);
      ctx.bezierCurveTo(s * 0.4, s * 0.9, s * 0.1, s * 0.9, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.1, s * 0.9, -s * 0.4, s * 0.9, -s * 0.5, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    update() {
      this.phase    += this.phaseSpeed;
      this.rotation += this.rotSpeed;

      // Mouse repulsion
      const dx   = this.x - mouse.x;
      const dy   = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140 && dist > 0) {
        const force = (140 - dist) / 140;
        this.vx += (dx / dist) * force * 0.6;
        this.vy += (dy / dist) * force * 0.6;
      }

      // Damping & speed cap
      this.vx *= 0.97;
      this.vy *= 0.97;
      const spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
      if (spd > 2.5) { this.vx = (this.vx/spd)*2.5; this.vy = (this.vy/spd)*2.5; }

      this.x += this.vx;
      this.y += this.vy;

      // Wrap
      if (this.x < -30) this.x = canvas.width  + 30;
      if (this.x > canvas.width  + 30) this.x = -30;
      if (this.y < -30) this.y = canvas.height + 30;
      if (this.y > canvas.height + 30) this.y = -30;
    }

    draw() {
      const alpha = this.baseOpacity * (0.65 + 0.35 * Math.sin(this.phase));
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.type === 'star')       this.drawStar(alpha);
      else if (this.type === 'moon')  this.drawMoon(alpha);
      else                            this.drawTooth(alpha);
      ctx.restore();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
})();

// ── Floating companions ────────────────────────────────────────
(function () {
  const starMsgs = [
    'You\'re doing great! ✨',
    'Keep smiling! 😊',
    'You got this! 💪',
    'Believe in yourself! 🌟',
    'Amazing day ahead! 🌸',
    'Stay curious! 🔍',
    'You\'re wonderful! 💖',
    'Keep going! 🚀',
    'Shine bright! ⭐',
    'You inspire others! 🌻',
    'Today is your day! ☀️',
    'Dream big! 🦋',
  ];

  const jupMsgs = [
    'You\'re made of stardust! 🌌',
    'Shine like a supernova! ✨',
    'Every galaxy starts with one star 🌟',
    'Your gravity pulls good things in 🪐',
    'Orbit your dreams! 🚀',
    'The universe cheers for you! 🌠',
    'Light-years of potential ahead 💫',
    'Space is vast — so is your heart 💙',
    'You outshine every constellation ⭐',
    'Shoot for the stars! ☄️',
    'Black holes can\'t hold you back! 🌀',
    'You are your own galaxy 🌌',
  ];

  function makeCompanion(id, glyph, msgs, sx, sy, speed, imgSrc) {
    const wrap = document.createElement('div');
    wrap.className = 'cmp-wrap';
    wrap.id = id + '-wrap';

    const icon = document.createElement('span');
    icon.className = 'cmp-icon';
    icon.id = id;
    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = id;
      img.draggable = false;
      icon.appendChild(img);
    } else {
      icon.textContent = glyph;
    }
    wrap.appendChild(icon);

    const bubble = document.createElement('div');
    bubble.className = 'cmp-bubble';
    bubble.id = id + '-bubble';

    document.body.appendChild(wrap);
    document.body.appendChild(bubble);

    let x = sx, y = sy;
    let vx = (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 0.3 + 0.25) * speed;
    let vy = (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 0.3 + 0.25) * speed;
    let phase = Math.random() * Math.PI * 2;
    let bubbleTimer = null;
    let dragging = false, dragOffX = 0, dragOffY = 0, prevX = sx, prevY = sy;

    function showMsg() {
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      bubble.classList.add('show');
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2800);
    }

    // Drag start
    wrap.addEventListener('mousedown', e => {
      dragging = true; dragOffX = e.clientX - x; dragOffY = e.clientY - y;
      vx = 0; vy = 0; wrap.style.cursor = 'grabbing'; e.preventDefault();
    });
    wrap.addEventListener('touchstart', e => {
      dragging = true;
      dragOffX = e.touches[0].clientX - x; dragOffY = e.touches[0].clientY - y;
      vx = 0; vy = 0;
    }, { passive: true });

    // Drag move
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      prevX = x; prevY = y;
      x = e.clientX - dragOffX; y = e.clientY - dragOffY;
    });
    window.addEventListener('touchmove', e => {
      if (!dragging) return;
      prevX = x; prevY = y;
      x = e.touches[0].clientX - dragOffX; y = e.touches[0].clientY - dragOffY;
    }, { passive: true });

    // Drag end — toss with release velocity
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      vx = Math.max(-3, Math.min(3, (x - prevX) * 0.4));
      vy = Math.max(-3, Math.min(3, (y - prevY) * 0.4));
      wrap.style.cursor = 'grab';
    }
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    wrap.addEventListener('click', showMsg);
    wrap.style.cursor = 'grab';

    return function update() {
      if (!dragging) {
        phase += 0.011;
        x += vx + Math.sin(phase) * 0.22;
        y += vy + Math.cos(phase * 0.75) * 0.22;
        vx *= 0.98; vy *= 0.98;
        // Extra margin on top/bottom for mobile status bar + nav
        const mx = 60;
        const mt = 72;  // top: clears status bar
        const mb = 80;  // bottom: clears iOS home bar
        if (x < mx) { vx = Math.abs(vx); }
        if (x > window.innerWidth  - mx) { vx = -Math.abs(vx); }
        if (y < mt) { vy = Math.abs(vy); }
        if (y > window.innerHeight - mb) { vy = -Math.abs(vy); }
      }
      wrap.style.left   = x + 'px';
      wrap.style.top    = y + 'px';
      // Keep bubble fully inside viewport — flip left/right and up/down as needed
      const bw = bubble.offsetWidth  || 160;
      const bh = bubble.offsetHeight || 32;
      let bx = x - bw / 2;                  // center-align bubble under cursor
      let by = y - bh - 62;                  // default: above companion (36px clear of 52px Kuromi top)
      if (by < 8)           by = y + 52;     // flip below if too close to top
      if (bx < 8)           bx = 8;
      if (bx + bw > window.innerWidth - 8)  bx = window.innerWidth - bw - 8;
      bubble.style.left = bx + 'px';
      bubble.style.top  = by + 'px';
    };
  }

  const moonMsgs = [
    'You light up the dark! 🌙',
    'Even the moon has phases — keep going! 🌒',
    'You\'re a total lunatic... in the best way! 🌝',
    'Reach for the moon — land among the stars! ⭐',
    'Rest when you need to, rise when you\'re ready! 🌕',
    'Your glow is all your own 🌙',
    'Like the moon, you\'re always whole 💫',
    'Tides turn — so will this! 🌊',
    'You make the night beautiful 🌌',
    'Full moon energy: unstoppable! 🔮',
    'Be patient — the moon was once a new moon 🌑',
    'You\'re a work of cosmic art 🎑',
  ];

  const updateStar = makeCompanion(
    'cstar', '✦', starMsgs,
    window.innerWidth * 0.25, window.innerHeight * 0.45, 0.5
  );
  const updateJup = makeCompanion(
    'cjup', '🟡', jupMsgs,
    window.innerWidth * 0.72, window.innerHeight * 0.55, 0.375
  );
  const updateMoon = makeCompanion(
    'cmoon', '🌙', moonMsgs,
    window.innerWidth * 0.55, window.innerHeight * 0.25, 0.42
  );

  const kuromiMsgs = [
    'Darkness is just sparkle in disguise 🖤',
    'You\'re my favourite human 💗',
    'Stay spooky, stay sweet 🎀',
    'Plot twist: you\'re amazing 🖤',
    'Your vibe is immaculate ✨',
    'Keep being delightfully you! 🌙',
    'Even skulls can be adorable 💀💖',
    'Mischief managed... cutely 🎀',
    'You make the dark side cuter 💜',
    'boo! ꒰˶• ༝ •˶꒱ (just kidding, hi!)',
    'Best human I\'ve ever floated past 🖤',
    'Gothic & gorgeous, just like today 🌸',
  ];
  const updateKuromi = makeCompanion(
    'ckuromi', null, kuromiMsgs,
    window.innerWidth * 0.82, window.innerHeight * 0.38, 0.35,
    'kuromi.png'
  );

  // "hi" hint label on the star
  const starLabel = document.createElement('span');
  starLabel.className = 'cmp-label';
  starLabel.textContent = 'hi';
  document.getElementById('cstar-wrap').appendChild(starLabel);

  // "helo" hint label on Jupiter
  const jupLabel = document.createElement('span');
  jupLabel.className = 'cmp-label';
  jupLabel.textContent = 'helo';
  document.getElementById('cjup-wrap').appendChild(jupLabel);

  // "psst" hint label on Moon
  const moonLabel = document.createElement('span');
  moonLabel.className = 'cmp-label';
  moonLabel.textContent = 'psst';
  document.getElementById('cmoon-wrap').appendChild(moonLabel);

  // "kuri" hint label on Kuromi
  const kuromiLabel = document.createElement('span');
  kuromiLabel.className = 'cmp-label';
  kuromiLabel.textContent = 'kuromi';
  document.getElementById('ckuromi-wrap').appendChild(kuromiLabel);

  // Animated ring around Jupiter
  const ring = document.createElement('span');
  ring.className = 'cjup-ring';
  document.getElementById('cjup-wrap').appendChild(ring);

  function loop() { updateStar(); updateJup(); updateMoon(); updateKuromi(); requestAnimationFrame(loop); }
  loop();
})();

// ── Flying ships ──────────────────────────────────────────────
(function () {
  let active = false;

  function spawnDot(x, y, opacity) {
    const dot = document.createElement('span');
    dot.className = 'flyship-trail';
    dot.style.left    = x + 'px';
    dot.style.top     = y + 'px';
    dot.style.opacity = opacity * 0.4;
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.opacity = '0';
      setTimeout(() => dot.remove(), 600);
    });
  }

  function spawnShip() {
    if (active) return;
    active = true;
    const glyph    = Math.random() < 0.5 ? '🚀' : '🛸';
    const el       = document.createElement('span');
    el.className   = 'flyship';
    el.textContent = glyph;
    document.body.appendChild(el);

    const goRight  = Math.random() < 0.5;
    const baseY    = Math.random() * (window.innerHeight * 0.72) + 40;
    const duration = Math.random() * 3000 + 4000;
    const startX   = goRight ? -60 : window.innerWidth + 60;
    const endX     = goRight ? window.innerWidth + 60 : -60;
    const waveAmp  = 18 + Math.random() * 18;
    const waveFreq = 3 + Math.random() * 2;
    const baseAngle = goRight ? -40 : 140;

    const start = performance.now();
    let lastX = startX, lastY = baseY, lastDot = 0;

    function tick(now) {
      const t  = Math.min((now - start) / duration, 1);
      const x  = startX + (endX - startX) * t;
      const y  = baseY + Math.sin(t * Math.PI * waveFreq) * waveAmp;
      const op = t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1;

      const pathAngle = Math.atan2(y - lastY, x - lastX) * (180 / Math.PI);
      const angle     = baseAngle + pathAngle * 0.55;
      // Trail comes from opposite of travel direction (true exhaust side)
      const tailRad = (pathAngle + 180) * Math.PI / 180;
      const tailX   = x + Math.cos(tailRad) * 14;
      const tailY   = y + Math.sin(tailRad) * 14;

      el.style.left      = x + 'px';
      el.style.top       = y + 'px';
      el.style.opacity   = op;
      el.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;

      if (now - lastDot > 70) { spawnDot(tailX, tailY, op); lastDot = now; }

      lastX = x; lastY = y;
      if (t < 1) { requestAnimationFrame(tick); }
      else { el.remove(); active = false; }
    }
    requestAnimationFrame(tick);
  }

  function scheduleNext() {
    setTimeout(() => { spawnShip(); scheduleNext(); }, 8000 + Math.random() * 7000);
  }
  setTimeout(scheduleNext, Math.random() * 3000 + 1500);
})();

// ── Scroll animations ─────────────────────────────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
  { threshold: 0.15 }
);
document.querySelectorAll('.pin, .section-title, .section-subtitle, .section-eyebrow').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ── Changelog panel ───────────────────────────────────────────────
(function () {
  const btn     = document.getElementById('changelogBtn');
  const panel   = document.getElementById('changelogPanel');
  const overlay = document.getElementById('changelogOverlay');
  const close   = document.getElementById('changelogClose');

  function openPanel() {
    panel.classList.add('open');
    overlay.classList.add('open');
    panel.removeAttribute('aria-hidden');
  }
  function shutPanel() {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  btn.addEventListener('click', openPanel);
  close.addEventListener('click', shutPanel);
  overlay.addEventListener('click', shutPanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shutPanel(); });
})();

// ── Secret triple-click "Made with ♡" → birthday page ─────────────
(function () {
  const SECRET_PW = SITE_CONFIG.BD_PASSWORD;
  const target    = document.querySelector('[data-i18n="footer_made"]');
  if (!target) return;

  let clicks = 0;
  let timer  = null;

  target.addEventListener('click', function () {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(function () { clicks = 0; }, 500);

    if (clicks >= 3) {
      clicks = 0;
      clearTimeout(timer);
      if (window.openBdGate) window.openBdGate();
    }
  });
})();

// ── Who modal ─────────────────────────────────────────────────
(function () {
  const btn     = document.getElementById('whoBtn');
  const modal   = document.getElementById('whoModal');
  const overlay = document.getElementById('whoOverlay');
  const close   = document.getElementById('whoClose');

  function open() {
    modal.classList.add('open');   modal.removeAttribute('aria-hidden');
    overlay.classList.add('open'); overlay.removeAttribute('aria-hidden');
  }
  function shut() {
    modal.classList.remove('open');   modal.setAttribute('aria-hidden','true');
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true');
  }

  btn.addEventListener('click', open);
  close.addEventListener('click', shut);
  overlay.addEventListener('click', shut);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
})();

// ── Projects modal ────────────────────────────────────────────
(function () {
  const btn     = document.getElementById('projectsBtn');
  const modal   = document.getElementById('projectsModal');
  const overlay = document.getElementById('projectsOverlay');
  const close   = document.getElementById('projectsClose');

  function open() {
    modal.classList.add('open');   modal.removeAttribute('aria-hidden');
    overlay.classList.add('open'); overlay.removeAttribute('aria-hidden');
  }
  function shut() {
    modal.classList.remove('open');   modal.setAttribute('aria-hidden','true');
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true');
  }

  btn.addEventListener('click', open);
  close.addEventListener('click', shut);
  overlay.addEventListener('click', shut);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
})();

// ── Island panel ──────────────────────────────────────────────
(function () {
  const btn     = document.getElementById('island-widget');
  const panel   = document.getElementById('islandPanel');
  const overlay = document.getElementById('islandOverlay');
  const close   = document.getElementById('islandPanelClose');

  function open() {
    panel.classList.add('open');   panel.removeAttribute('aria-hidden');
    overlay.classList.add('open'); overlay.removeAttribute('aria-hidden');
  }
  function shut() {
    panel.classList.remove('open');   panel.setAttribute('aria-hidden','true');
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true');
  }

  btn.addEventListener('click', open);
  close.addEventListener('click', shut);
  overlay.addEventListener('click', shut);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
})();

// ── Status bar ────────────────────────────────────────────────
(function () {
  const STATUS_KEY  = 'ksp_status';
  const COLOR_KEY   = 'ksp_status_color';
  const PW_KEY      = 'ksp_pw';
  const DEFAULT_PW  = 'vibecheck';   // ← fallback password if none saved
  const DEFAULT_CLR = '#48c78e';

  const statusBar   = document.getElementById('statusBar');
  const statusDot   = statusBar.querySelector('.status-dot');
  const statusText  = document.getElementById('statusText');
  const overlay     = document.getElementById('statusEditOverlay');
  const pwInput     = document.getElementById('statusPwInput');
  const newTextInput= document.getElementById('statusNewText');
  const stepPw      = document.getElementById('statusStepPw');
  const stepEdit    = document.getElementById('statusStepEdit');
  const saveBtn     = document.getElementById('statusSaveBtn');
  const cancelBtn   = document.getElementById('statusCancelBtn');
  const swatches    = document.querySelectorAll('.swatch');
  const changePwToggle = document.getElementById('statusChangePwToggle');
  const changePwFields = document.getElementById('statusChangePwFields');
  const newPwInput     = document.getElementById('statusNewPw');
  const confirmPwInput = document.getElementById('statusConfirmPw');

  function getPassword() { return localStorage.getItem(PW_KEY) || DEFAULT_PW; }

  // Apply color to bar
  function applyColor(c) {
    statusDot.style.background = c;
    statusDot.style.boxShadow  = `0 0 6px 2px ${c}99`;
    statusBar.style.borderColor = `${c}55`;
  }

  // Load saved state
  const savedText  = localStorage.getItem(STATUS_KEY);
  const savedColor = localStorage.getItem(COLOR_KEY) || DEFAULT_CLR;
  if (savedText) statusText.textContent = savedText;
  applyColor(savedColor);

  // Mark active swatch
  let activeColor = savedColor;
  function updateSwatches(c) {
    activeColor = c;
    swatches.forEach(s => s.classList.toggle('selected', s.dataset.color === c));
  }
  updateSwatches(savedColor);

  swatches.forEach(s => s.addEventListener('click', () => updateSwatches(s.dataset.color)));

  // Triple-click / triple-tap detection
  let tapCount = 0, tapTimer = null;
  function onTap() {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 500);
    if (tapCount >= 3) { tapCount = 0; openOverlay(); }
  }
  statusText.addEventListener('click', onTap);
  statusText.addEventListener('touchend', e => { e.preventDefault(); onTap(); });

  // Change-password toggle
  changePwToggle.addEventListener('click', () => {
    const open = changePwFields.style.display === 'none';
    changePwFields.style.display = open ? '' : 'none';
    changePwToggle.textContent = open ? 'cancel password change' : 'change password';
    if (open) newPwInput.focus();
  });

  function openOverlay() {
    stepPw.style.display = '';
    stepEdit.style.display = 'none';
    changePwFields.style.display = 'none';
    changePwToggle.textContent = 'change password';
    pwInput.value = '';
    newPwInput.value = '';
    confirmPwInput.value = '';
    newTextInput.value = statusText.textContent;
    updateSwatches(activeColor);
    saveBtn.textContent = 'next';
    overlay.classList.add('open');
    setTimeout(() => pwInput.focus(), 50);
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    pwInput.value = '';
  }

  let step = 'pw';

  saveBtn.addEventListener('click', () => {
    if (step === 'pw' || stepEdit.style.display === 'none') {
      if (pwInput.value !== getPassword()) {
        pwInput.style.borderColor = '#e05c5c';
        setTimeout(() => pwInput.style.borderColor = '', 800);
        return;
      }
      step = 'edit';
      stepPw.style.display = 'none';
      stepEdit.style.display = '';
      saveBtn.textContent = 'save';
      setTimeout(() => { newTextInput.focus(); newTextInput.select(); }, 50);
    } else {
      // Handle password change if fields visible
      if (changePwFields.style.display !== 'none') {
        const np = newPwInput.value.trim();
        const cp = confirmPwInput.value.trim();
        if (np && np !== cp) {
          confirmPwInput.style.borderColor = '#e05c5c';
          setTimeout(() => confirmPwInput.style.borderColor = '', 800);
          return;
        }
        if (np) localStorage.setItem(PW_KEY, np);
      }
      // Save status + color
      const val = newTextInput.value.trim();
      if (!val) return;
      statusText.textContent = val;
      localStorage.setItem(STATUS_KEY, val);
      applyColor(activeColor);
      localStorage.setItem(COLOR_KEY, activeColor);
      step = 'pw';
      closeOverlay();
    }
  });

  cancelBtn.addEventListener('click', () => { step = 'pw'; closeOverlay(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) { step = 'pw'; closeOverlay(); } });
  pwInput.addEventListener('keydown',      e => { if (e.key === 'Enter') saveBtn.click(); });
  newTextInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
  confirmPwInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
})();

// ── Bangkok Environment Panel ─────────────────────────────────
(function () {
  const CACHE_KEY   = 'ksp_env_cache';
  const CACHE_TTL   = 30 * 60 * 1000; // 30 minutes

  const aqiVal      = document.getElementById('envAqiVal');
  const aqiBadge    = document.getElementById('envAqiBadge');
  const tempVal     = document.getElementById('envTempVal');
  const heatVal     = document.getElementById('envHeatVal');
  const heatBadge   = document.getElementById('envHeatBadge');
  const newsList    = document.getElementById('envNewsList');
  const updatedEl   = document.getElementById('envUpdated');
  const refreshBtn  = document.getElementById('envRefresh');

  // ── Helpers ────────────────────────────────────────────────
  function aqiInfo(v) {
    if (v <= 50)  return { label: 'Good',     cls: 'env-badge-good' };
    if (v <= 100) return { label: 'Moderate',  cls: 'env-badge-moderate' };
    if (v <= 150) return { label: 'Sensitive', cls: 'env-badge-usg' };
    if (v <= 200) return { label: 'Unhealthy', cls: 'env-badge-unhealthy' };
    return              { label: 'Very bad',   cls: 'env-badge-very' };
  }

  function heatInfo(v) {
    if (v < 27)  return { label: 'Normal',   cls: 'env-badge-good' };
    if (v < 33)  return { label: 'Caution',  cls: 'env-badge-caution' };
    if (v < 42)  return { label: 'Warning',  cls: 'env-badge-warning' };
    if (v < 52)  return { label: 'Danger',   cls: 'env-badge-danger' };
    return              { label: 'Extreme',  cls: 'env-badge-extreme' };
  }

  function setBadge(el, label, cls) {
    el.textContent = label;
    el.className = 'env-badge ' + cls;
  }

  function setUpdated() {
    const now = new Date();
    updatedEl.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Render ──────────────────────────────────────────────────
  function render(data) {
    if (data.aqi !== null) {
      aqiVal.textContent = data.aqi;
      const info = aqiInfo(data.aqi);
      setBadge(aqiBadge, info.label, info.cls);
    } else {
      aqiVal.textContent = '—';
      aqiBadge.textContent = 'n/a';
      aqiBadge.className = 'env-badge env-badge-neutral';
    }

    if (data.temp !== null) tempVal.textContent = data.temp + '°';
    if (data.heat !== null) {
      heatVal.textContent = data.heat + '°';
      const info = heatInfo(data.heat);
      setBadge(heatBadge, info.label, info.cls);
    }

    newsList.innerHTML = '';
    if (!data.news || data.news.length === 0) {
      newsList.innerHTML = '<li class="env-news-loading">No news available.</li>';
    } else {
      data.news.forEach(function (item) {
        const li = document.createElement('li');
        li.className = 'env-news-item';
        li.innerHTML =
          '<div class="env-news-item-title">' + item.title + '</div>' +
          '<div class="env-news-item-summary">' + item.summary + '</div>' +
          '<div class="env-news-item-date">' + item.date + '</div>';
        newsList.appendChild(li);
      });
    }

    setUpdated();
  }

  // ── Fetch ───────────────────────────────────────────────────
  // Fetch with 8-second timeout
  function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const tid   = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal }).finally(function () { clearTimeout(tid); });
  }

  async function fetchAll() {
    refreshBtn.classList.add('spinning');
    newsList.innerHTML = '<li class="env-news-loading">loading news…</li>';

    const result = { aqi: null, temp: null, heat: null, news: [] };

    // 1. Open-Meteo (no key, direct)
    try {
      const wRes = await fetchWithTimeout(
        'https://api.open-meteo.com/v1/forecast' +
        '?latitude=13.75&longitude=100.52' +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m' +
        '&temperature_unit=celsius&timezone=Asia%2FBangkok',
        8000
      );
      const wData = await wRes.json();
      result.temp = Math.round(wData.current.temperature_2m);
      result.heat = Math.round(wData.current.apparent_temperature);
    } catch (_) { /* show — */ }

    // 2. AQI — AQICN demo token (no key needed)
    try {
      const aRes = await fetchWithTimeout('https://api.waqi.info/feed/bangkok/?token=demo', 8000);
      const aData = await aRes.json();
      if (aData.status === 'ok' && aData.data && aData.data.aqi) {
        result.aqi = aData.data.aqi;
      }
    } catch (_) { /* show — */ }

    // 3. News — Google News RSS via rss2json
    try {
      const rssUrl = encodeURIComponent(
        'https://news.google.com/rss/search?q=thailand+PM2.5+OR+flood+OR+pollution+OR+plastic+sea+OR+trash+ocean+OR+air+quality+OR+haze&hl=en-US&gl=US&ceid=US:en'
      );
      const nRes = await fetchWithTimeout('https://api.rss2json.com/v1/api.json?rss_url=' + rssUrl + '&count=3', 8000);
      const nData = await nRes.json();
      if (nData.status === 'ok' && Array.isArray(nData.items)) {
        result.news = nData.items.map(function (item) {
          return {
            title: item.title.replace(/\s*-\s*[^-]+$/, ''), // strip source suffix
            summary: item.description
              ? item.description.replace(/<[^>]+>/g, '').slice(0, 120) + '…'
              : '',
            date: item.pubDate ? item.pubDate.slice(0, 10) : '',
          };
        });
      }
    } catch (_) {
      newsList.innerHTML = '<li class="env-news-loading">couldn\'t load news — try refreshing 🔄</li>';
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
    render(result);
    refreshBtn.classList.remove('spinning');
  }

  // ── Init: load on first panel open ─────────────────────────
  function loadEnv() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) { render(data); return; }
      } catch (_) { /* stale, refetch */ }
    }
    fetchAll();
  }

  refreshBtn.addEventListener('click', fetchAll);

  // Trigger when island panel opens
  const islandBtn = document.getElementById('island-widget');
  if (islandBtn) {
    islandBtn.addEventListener('click', function () {
      setTimeout(loadEnv, 300); // after panel slides in
    });
  }
})();

// ── Background parallax ───────────────────────────────────────
window.addEventListener('scroll', () => {
  const y = 50 + window.scrollY * 0.12;
  document.body.style.backgroundPositionY = y + '%';
}, { passive: true });

// ── Birthday gate overlay ─────────────────────────────────────────
(function () {
  var SECRET_PW = SITE_CONFIG.BD_PASSWORD;
  var overlay  = document.getElementById('bdGateOverlay');
  var display  = document.getElementById('bdHeartDisplay');
  var inputEl  = document.getElementById('bdRealInput');
  var errorEl  = document.getElementById('bdError');
  if (!overlay) return;

  function updateDisplay() {
    var len = inputEl.value.length;
    display.textContent = len === 0 ? '\u{1F497}' : '\u{1F493}'.repeat(len);
    display.style.fontSize   = len <= 4 ? '28px' : len <= 6 ? '24px' : '20px';
    display.style.letterSpacing = len <= 4 ? '4px' : '2px';
  }

  function shake() {
    display.style.transition = 'transform 0.05s';
    [6,-6,5,-5,3,0].forEach(function(x, i) {
      setTimeout(function() { display.style.transform = 'translateX(' + x + 'px)'; }, i * 55);
    });
    setTimeout(function() { display.style.transform = ''; }, 350);
  }

  inputEl.addEventListener('input', function() {
    inputEl.value = inputEl.value.replace(/\D/g, '').slice(0, 8);
    updateDisplay();
    errorEl.textContent = '';
    if (inputEl.value.length === 8) {
      if (inputEl.value === SECRET_PW) {
        overlay.classList.remove('open');
        window.location.href = '/birthday.html';
      } else {
        shake();
        errorEl.textContent = '\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E30 \u{1F494}';
        setTimeout(function() { inputEl.value = ''; updateDisplay(); errorEl.textContent = ''; }, 900);
      }
    }
  });

  document.getElementById('bdInputWrap').addEventListener('click', function() {
    inputEl.focus();
  });

  window.openBdGate = function() {
    inputEl.value = '';
    updateDisplay();
    errorEl.textContent = '';
    overlay.classList.add('open');
    inputEl.focus();
    setTimeout(function() { inputEl.focus(); }, 80);
  };

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });
})();
