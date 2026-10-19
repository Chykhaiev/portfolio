// Small page helpers: copy email, "coming soon" for placeholder links, reveal on scroll, nav state.
const toast = document.querySelector('.h-toast');
let tt;
function say(msg) {
  if (!toast) return;
  toast.textContent = msg; toast.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2200);
}
document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  if (b.dataset.todo) { say('Contact details are coming soon'); return; }
  try { await navigator.clipboard.writeText(b.dataset.copy); say('Email copied'); } catch { say(b.dataset.copy); }
}));
document.querySelectorAll('a[data-todo]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); say('Coming soon'); }));

const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' }) : null;
document.querySelectorAll('.rv').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

const bar = document.querySelector('.h-nav');
const links = [...document.querySelectorAll('.h-nav-links a')];
const secs = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
function mark() {
  bar && bar.classList.toggle('solid', scrollY > 8);
  let cur = null;
  secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s.id; });
  links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${cur}`));
}
addEventListener('scroll', mark, { passive: true }); mark();
