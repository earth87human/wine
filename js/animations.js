/* ============================================================
   Motion — slow, sparse, cinematic
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---- Scroll reveal (slow, staggered, once) ---- */
export function setupReveal() {
  const els = $$('.reveal, .card');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-in')); return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const sibs = el.parentElement
        ? [...el.parentElement.children].filter(s => s.classList.contains('card') || s.classList.contains('reveal'))
        : [];
      const idx = Math.max(0, sibs.indexOf(el));
      el.style.transitionDelay = (idx % 8) * 100 + 'ms';
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
}

/* ---- Nav: transparent over the hero, solid after ---- */
export function setupNav() {
  const nav = $('#nav');
  if (!nav) return;
  const hero = $('#hero');
  let threshold = hero ? hero.offsetHeight - 80 : 200;   // cached — no forced layout per scroll
  const onScroll = () => { nav.classList.toggle('is-scrolled', window.scrollY > threshold); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { threshold = hero ? hero.offsetHeight - 80 : 200; onScroll(); }, { passive: true });

  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const t = $(href);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // land focus on the destination so the keyboard guest continues from there
      if (t.id !== 'hero') { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    });
  });

  // "Which room am I in" — mark the current section on the nav
  const links = $$('.nav__menu a');
  if ('IntersectionObserver' in window && links.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.removeAttribute('aria-current'));
        const here = links.find(l => l.getAttribute('href') === '#' + en.target.id);
        if (here) here.setAttribute('aria-current', 'true');
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
    $$('#collection, #stats, #about').forEach(s => io.observe(s));
  }
}

/* ---- Cinematic: hero Ken-Burns + parallax, band parallax ---- */
export function setupCinema() {
  const heroImg = $('#hero-img');
  const heroInner = $('.hero__inner');
  const bandImgs = $$('.band__img');
  let ticking = false;
  function update() {
    const y = window.scrollY;
    if (heroImg) {
      const s = (1.04 + Math.min(y, 900) / 900 * 0.06).toFixed(4);
      heroImg.style.transform = `scale(${s}) translateY(${(y * 0.05).toFixed(1)}px)`;
    }
    if (heroInner) heroInner.style.transform = `translateY(${(y * 0.06).toFixed(1)}px)`;
    bandImgs.forEach(img => {
      const band = img.closest('.band');
      if (!band) return;
      const r = band.getBoundingClientRect();
      const off = (r.top + r.height / 2 - window.innerHeight / 2) * -0.08;
      img.style.transform = `translateY(${off.toFixed(1)}px)`;
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---- Number tween ---- */
export function animateCounter(el, target, duration = 1100) {
  if (!el) return;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

/* ---- Loader: plain paper fade ---- */
export function hideLoader() {
  document.body.classList.add('is-ready');            // the hero text begins to rise...
  const loader = $('#loader');
  if (!loader) return;
  requestAnimationFrame(() => loader.classList.add('is-done')); // ...as the paper clears — one continuous breath
  setTimeout(() => { if (loader.parentElement) loader.remove(); }, 1300);
}
