// Portfolio home — small, dependency-free interactions.
document.documentElement.classList.add('js');

const T = { copied: 'Email copied', soon: 'Case page coming soon' };

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- reveal on scroll ----
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  // stagger siblings inside the same grid
  const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
  el.style.transitionDelay = reduced ? '0s' : `${Math.min(sib, 4) * 70}ms`;
  io.observe(el);
});

// ---- nav pill: highlight the section in view ----
const pill = document.querySelector('.pill');
const glow = pill.querySelector('.pill-glow');
const links = [...pill.querySelectorAll('a[data-nav]')];
const sections = links.map((a) => document.getElementById(a.dataset.nav));
// "AI" and "Skills" belong to the About/Experience part of the page for the pill
const groups = { ai: 'experience', skills: 'experience' };

function setActive(id) {
  links.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === id));
  const a = links.find((l) => l.dataset.nav === id);
  if (!a) { glow.style.opacity = 0; return; }
  glow.style.opacity = 1;
  glow.style.width = `${a.offsetWidth}px`;
  glow.style.transform = `translateX(${a.offsetLeft}px)`;
}

function onScroll() {
  if (!links.length) return;
  const mid = window.innerHeight * 0.4;
  let current = null;
  for (const id of ['work', 'about', 'experience', 'ai', 'skills', 'contact']) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= mid) current = groups[id] || id;
  }
  setActive(current);
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// ---- copy email ----
const toast = document.querySelector('.toast');
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(say.t);
  say.t = setTimeout(() => toast.classList.remove('show'), 1800);
}
document.querySelectorAll('[data-copy]').forEach((b) => {
  b.addEventListener('click', async () => {
    const text = b.dataset.copy;
    try { await navigator.clipboard.writeText(text); say(T.copied); }
    catch { window.location.href = `mailto:${text}`; }
  });
});

// ---- case links that are not ready yet ----
document.querySelectorAll('a[href="#"][data-case]').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); say(T.soon); });
});

// ---- case pages: pill marks "Work", side index follows the reader ----
if (!links.length) {
  const a = pill.querySelector('a.is-active');
  if (a) { const place = () => { glow.style.opacity = 1; glow.style.width = `${a.offsetWidth}px`; glow.style.transform = `translateX(${a.offsetLeft}px)`; }; place(); window.addEventListener('resize', place); document.fonts && document.fonts.ready.then(place); }
}
const toc = [...document.querySelectorAll('.toc a')];
if (toc.length) {
  const secs = toc.map((a) => document.querySelector(a.getAttribute('href')));
  const mark = () => {
    let cur = 0;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.35) cur = i; });
    toc.forEach((a, i) => a.classList.toggle('is-active', i === cur));
  };
  window.addEventListener('scroll', mark, { passive: true }); mark();
}

// ---- live site embeds: skip the heavy 3D scene on phones, where a poster is shown ----
if (window.matchMedia('(min-width: 601px)').matches) {
  document.querySelectorAll('iframe[data-src]').forEach((f) => { f.src = f.dataset.src; });
}
