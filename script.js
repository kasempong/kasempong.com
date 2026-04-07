'use strict';

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
    roles: ['Dentist', 'Smile Designer', 'Oral Health Advocate', 'Your Trusted Dentist'],
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
    roles: ['ทันตแพทย์', 'ผู้ออกแบบรอยยิ้ม', 'ผู้ดูแลสุขภาพช่องปาก', 'ทันตแพทย์ของคุณ'],
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
    roles: ['牙医', '微笑设计师', '口腔健康倡导者', '您信赖的牙医'],
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
const savedTheme = localStorage.getItem('theme') || getAutoTheme();
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

// ── Floating companion star ────────────────────────────────────
(function () {
  const messages = [
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

  const wrap = document.createElement('div');
  wrap.id = 'cstar-wrap';
  const star = document.createElement('span');
  star.id = 'cstar';
  star.textContent = '✦';
  wrap.appendChild(star);
  document.body.appendChild(wrap);

  const bubble = document.createElement('div');
  bubble.id = 'cstar-bubble';
  document.body.appendChild(bubble);

  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let cx = tx, cy = ty;
  let bubbleTimer = null;

  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  window.addEventListener('touchmove', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });

  function showMessage() {
    bubble.textContent = messages[Math.floor(Math.random() * messages.length)];
    bubble.classList.add('show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2500);
  }

  wrap.addEventListener('click', showMessage);
  wrap.addEventListener('touchend', e => { e.preventDefault(); showMessage(); }, { passive: false });

  function animate() {
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    wrap.style.left = cx + 'px';
    wrap.style.top  = cy + 'px';
    bubble.style.left = (cx - 60) + 'px';
    bubble.style.top  = (cy - 48) + 'px';
    requestAnimationFrame(animate);
  }
  animate();
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
