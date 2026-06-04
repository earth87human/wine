import { drinks, typeMeta, styleAxisTier, STYLE_AXIS_ENDS } from './data.js';
import { setupReveal, setupNav, animateCounter, hideLoader, setupCinema } from './animations.js';
import { renderCharts } from './charts.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

let lastFocused = null;

/* ============================================================
   Dates + photography
   ============================================================ */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, mo, da] = String(iso).split('-').map(Number);
  if (!y || !mo || !da) return esc(String(iso));
  return `${da} ${MONTHS[mo - 1]} ${y}`;
}

const IMG_BASE = 'https://images.unsplash.com/';
// verified Unsplash IDs (HTTP 200, image/jpeg)
const IMG_BY_TYPE = {
  'red':             'photo-1553361371-9b22f78e8b1d',
  'sparkling-red':   'photo-1607955868623-e135a7e50b0d',
  'white':           'photo-1597905722448-a1df7c00000a',
  'sparkling-white': 'photo-1607955868623-e135a7e50b0d',
  'rose':            'photo-1547595628-c61a29f496f0',
};
// One DISTINCT, individually-verified (HTTP 200 + visually vetted) photo per wine,
// so the gallery never repeats a tile.
const IMG_BY_ID = {
  'pinot-nero-eppan':                 'photo-1600673177531-46749442aa63', // elegant glass of light red
  'barbera-nizza-carretta':           'photo-1600785083041-3d6506387699', // oak barrels in the cellar
  'arneis-cayega-carretta':           'photo-1585553616435-2dc0a54e271d', // golden white wine on dark
  'lambrusco-grasparossa-tradizione': 'photo-1607955868623-e135a7e50b0d', // sparkling, fine bubbles
  'lambrusco-spiriti-folletti':       'photo-1553361371-9b22f78e8b1d',    // deep red pour
};
function photoFor(d, w, h) {
  const id = IMG_BY_ID[d.id] || IMG_BY_TYPE[d.type] || 'photo-1553361371-9b22f78e8b1d';
  return `${IMG_BASE}${id}?ixlib=rb-4.0.3&q=78&auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}`;
}

// Each photo resolves up from its colour wash — never a pop, never a broken icon.
function revealImages(scope = document) {
  $$('.card__img img, .about__img, .band__img, .modal-media img', scope).forEach(img => {
    if (img.dataset.bound) return;
    img.dataset.bound = '1';
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', () => { img.classList.add('is-loaded'); img.style.opacity = '1'; img.removeAttribute('src'); }, { once: true });
    }
  });
}

/* ============================================================
   Filters config
   ============================================================ */
const BUCKETS = [
  { key: 'all',       zh: '全部',   match: () => true },
  { key: 'wine',      zh: '葡萄酒', match: d => d.category === 'wine' },
  { key: 'beer',      zh: '啤酒',   match: d => d.category === 'beer' },
  { key: 'sparkling', zh: '氣泡',   match: d => d.type.startsWith('sparkling') },
  { key: 'red',       zh: '紅酒',   match: d => d.type === 'red' || d.type === 'sparkling-red' },
  { key: 'white',     zh: '白酒',   match: d => d.type === 'white' || d.type === 'sparkling-white' },
  { key: 'rose',      zh: '粉紅',   match: d => d.type === 'rose' },
  { key: 'totry',     zh: '待品飲', match: d => d.rating == null },
];

/* ============================================================
   Photo card
   ============================================================ */
function renderCard(d, i) {
  const isRated = d.rating != null;
  const meta = typeMeta[d.type] || { group: 'other' };
  const isFeat = i === 0;
  const img = isFeat ? photoFor(d, 1500, 1031) : photoFor(d, 900, 1125);
  const srcset = isFeat
    ? `${photoFor(d, 900, 619)} 900w, ${photoFor(d, 1200, 825)} 1200w, ${photoFor(d, 1500, 1031)} 1500w`
    : `${photoFor(d, 600, 750)} 600w, ${photoFor(d, 750, 938)} 750w, ${photoFor(d, 900, 1125)} 900w, ${photoFor(d, 1200, 1500)} 1200w`;
  const sizes = isFeat ? '(max-width:1100px) 90vw, 60vw' : '(max-width:680px) 86vw, (max-width:1100px) 45vw, 30vw';
  const imgAttrs = isFeat
    ? `loading="lazy" width="1500" height="1031"`
    : `loading="lazy" width="900" height="1125"`;
  const yr = d.year ? ` · ${d.year}` : '';
  const sub = `${esc(d.varietal)} · ${esc(d.region_zh || d.region)}${yr}`;
  const rating = isRated
    ? `<span class="card__rating" role="img" aria-label="我的評分 ${d.rating} / 5">${
        Array.from({ length: 5 }, (_, n) => `<i class="${n < d.rating ? 'on' : ''}"></i>`).join('')}</span>`
    : `<span class="card__unrated">待品飲</span>`;
  const axis = d.style_axis != null
    ? `<span class="card__axis" role="img" aria-label="風格光譜 ${d.style_axis}／100，越右越風土" title="風格光譜 ${d.style_axis}/100"><i style="left:${d.style_axis}%"></i></span>`
    : '<span></span>';
  return `
    <article class="card${isFeat ? ' card--feature' : ''}"
             role="listitem" tabindex="0"
             data-id="${d.id}" data-type="${d.type}" data-group="${meta.group}" data-category="${d.category}">
      <div class="card__img" style="background:${esc(d.color_hex || '#ECE8E0')}">
        <img ${imgAttrs} decoding="async" alt="" sizes="${sizes}" srcset="${srcset}" src="${img}" />
      </div>
      <div class="card__cap">
        <p class="card__name">${esc(d.name_zh)}</p>
        <p class="card__meta">${sub}</p>
        <div class="card__foot">${rating}${axis}</div>
      </div>
    </article>`;
}

/* ============================================================
   Filters
   ============================================================ */
function renderFilters() {
  const root = $('#filters');
  if (!root) return;
  root.innerHTML = BUCKETS.map(b => {
    const count = b.key === 'all' ? drinks.length : drinks.filter(b.match).length;
    if (count === 0 && b.key !== 'all') return '';
    return `<button class="filter ${b.key === 'all' ? 'is-active' : ''}" data-filter="${b.key}"
              aria-label="${esc(b.zh)}（${count}）" aria-pressed="${b.key === 'all' ? 'true' : 'false'}">${esc(b.zh)}</button>`;
  }).join('');

  root.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    $$('.filter', root).forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    applyFilter(btn.dataset.filter);
  });
}

function applyFilter(key) {
  const bucket = BUCKETS.find(b => b.key === key) || BUCKETS[0];
  const grid = $('#grid');
  if (grid) grid.setAttribute('aria-busy', 'true');
  let visible = 0, entering = 0;
  $$('.card').forEach(card => {
    const d = drinks.find(x => x.id === card.dataset.id);
    const show = bucket.match(d);
    if (show) {
      const wasHidden = card.hasAttribute('hidden');
      card.hidden = false;
      card.classList.remove('is-leaving');
      if (wasHidden) {
        card.style.transitionDelay = (entering++ % 9) * 60 + 'ms';
        requestAnimationFrame(() => card.classList.add('is-in'));
      }
      visible++;
    } else if (!card.hasAttribute('hidden')) {
      card.classList.add('is-leaving');
      card.classList.remove('is-in');
      setTimeout(() => { card.hidden = true; card.classList.remove('is-leaving'); }, 460);
    }
  });
  const empty = $('#grid-empty');
  if (empty) empty.hidden = visible > 0;
  const live = $('#grid-count');
  if (live) live.textContent = visible > 0
    ? `${bucket.key === 'all' ? '全部收藏' : bucket.zh}，共 ${visible} 支`
    : '這一類，我還沒開過';
  if (grid) requestAnimationFrame(() => grid.setAttribute('aria-busy', 'false'));
}

/* ============================================================
   Grid
   ============================================================ */
function renderGrid() {
  const grid = $('#grid');
  if (!grid) return;
  const sorted = [...drinks].sort((a, b) =>
    (b.tasting_date || '').localeCompare(a.tasting_date || ''));
  grid.innerHTML = sorted.map(renderCard).join('');

  const open = el => {
    const card = el.closest('.card');
    if (!card) return;
    const d = drinks.find(x => x.id === card.dataset.id);
    if (d) openModal(d);
  };
  grid.addEventListener('click', e => open(e.target));
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e.target); }
  });

  // Anticipatory: warm the detail photo into cache on first hover/focus
  const prefetch = e => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card || card.dataset.prefetched) return;
    card.dataset.prefetched = '1';
    const d = drinks.find(x => x.id === card.dataset.id);
    if (d) new Image().src = photoFor(d, 1100, 1400);
  };
  grid.addEventListener('pointerover', prefetch);
  grid.addEventListener('focusin', prefetch);
}

/* ============================================================
   Modal (detail)
   ============================================================ */
function openModal(d, { push = true } = {}) {
  const modal = $('#modal');
  const inner = $('#modal-inner');
  const meta = typeMeta[d.type] || {};
  const isRated = d.rating != null;

  const enParts = (d.name_en || '').split(' ').filter(Boolean);
  const enMain = enParts.slice(0, -1).join(' ');
  const enLast = enParts.slice(-1)[0] || '';
  const nameHTML = enParts.length > 1
    ? `${esc(enMain)} <em>${esc(enLast)}</em>`
    : `<em>${esc(d.name_en || '')}</em>`;

  const facts = [
    { label: '國家', value: d.country_zh, sub: d.country },
    { label: '產區', value: d.region_zh || d.region, sub: d.region_zh ? d.region : '' },
    { label: '品種', value: d.varietal_zh, sub: d.varietal },
    { label: d.category === 'beer' ? '型態' : '年份', value: d.year ? d.year : (d.category === 'beer' ? (meta.zh || '—') : 'NV'), sub: d.year || d.category === 'beer' ? '' : '非年份' },
    { label: 'ABV', value: d.abv != null ? `${d.abv}%` : '—', sub: '' },
    { label: '甜度', value: d.sweetness || '—', sub: '' },
  ];

  // 購入資訊：站主實際買的價格／瓶數，外加市場行情參考（非評分）
  const fmtNT = n => 'NT$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const buyLines = [
    d.bottles ? `購入 ${d.bottles} 瓶` : '',
    d.market_price_twd ? `市場行情 ${esc(d.market_price_twd)}` : '',
  ].filter(Boolean);
  const priceBlock = d.price != null ? `
      <div class="modal-buy">
        <div class="modal-buy__main">
          <span class="modal-buy__amt">${d.price_estimated ? '約 ' : ''}${fmtNT(d.price)}</span>
          <span class="modal-buy__unit">／瓶${d.price_estimated ? '（推估）' : ''}</span>
        </div>
        ${buyLines.length ? `<div class="modal-buy__lines">${buyLines.map(l => `<span>${l}</span>`).join('')}</div>` : ''}
      </div>` : '';

  // 評分點：支援小數（如 3.8 → 第 4 顆點填 80%）
  const ratingDots = val => Array.from({ length: 5 }, (_, n) => {
    const fill = Math.max(0, Math.min(1, val - n));
    if (fill >= 1) return '<i class="on"></i>';
    if (fill <= 0) return '<i></i>';
    return `<i class="on is-partial" style="--p:${(fill * 100).toFixed(0)}%"></i>`;
  }).join('');
  const ratingMarkup = isRated
    ? `<div class="modal-rating">${ratingDots(d.rating)} <span>${d.rating} / 5</span></div>`
    : `<div class="modal-rating modal-rating--unrated"><span>待品飲 · 等我自己喝過，再親手打分</span></div>`;

  // 我的筆記：已品飲但沒寫筆記 → 誠實標示（不再顯示「待品飲」）
  const notesMarkup = d.notes_long
    ? `<p>${esc(d.notes_long)}</p>`
    : (isRated
        ? '<p class="modal-empty-note">喝過了，這支沒特別落筆——分數就是心得。</p>'
        : '<p class="modal-empty-note">待品飲 · 尚未落筆</p>');

  // 怎麼喝：適飲期／溫度／醒酒，三條小規格
  const serveRows = [
    ['適飲期', d.drink_window],
    ['飲用溫度', d.serve_temp],
    ['要不要醒酒', d.decant],
  ].filter(([, v]) => v);
  const serveSection = serveRows.length ? `
      <div class="modal-section">
        <h3>怎麼喝 / How to Enjoy</h3>
        <dl class="modal-serve">
          ${serveRows.map(([k, v]) => `<div class="modal-serve__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        </dl>
      </div>` : '';

  // 知識區塊：品種／產區／分級／酒莊／入門／背景（皆為事實、非個人評價）
  const knowSection = [
    ['品種小知識', 'About the Grape', d.varietal_note],
    ['產區風土', 'The Region', d.region_note],
    ['產區分級', 'Classification', d.classification_note],
    ['酒莊', 'The Producer', d.producer_note],
    ['為什麼好入門', 'Easy to Love', d.why_beginner],
    ['深入認識', 'Background', d.background],
  ].filter(([, , v]) => v)
   .map(([zh, en, v]) => `<div class="modal-section"><h3>${esc(zh)} / ${esc(en)}</h3><p>${esc(v)}</p></div>`)
   .join('');

  const axisTier = styleAxisTier(d.style_axis);
  const axisSection = axisTier ? `
      <div class="modal-section">
        <h3>風格光譜 / Style Axis</h3>
        <div class="axis">
          <div class="axis__track"><span class="axis__marker" style="left:${d.style_axis}%"><b>${d.style_axis}</b></span></div>
          <div class="axis__ends">
            <span>${esc(STYLE_AXIS_ENDS.left.zh)} <em>${esc(STYLE_AXIS_ENDS.left.en)}</em></span>
            <span>${esc(STYLE_AXIS_ENDS.right.zh)} <em>${esc(STYLE_AXIS_ENDS.right.en)}</em></span>
          </div>
          <div class="axis__tier">${esc(axisTier.zh)} <em>${esc(axisTier.en)}</em></div>
        </div>
        ${d.style_note ? `<p style="margin-top:0.9rem">${esc(d.style_note)}</p>` : ''}
      </div>` : '';

  const chips = arr => (arr && arr.length)
    ? `<div class="chip-row">${arr.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>`
    : `<p class="modal-empty-note">待品飲 · 尚未落筆</p>`;
  const prose = txt => txt
    ? `<p>${esc(txt)}</p>`
    : `<p class="modal-empty-note">待品飲 · 尚未落筆</p>`;

  inner.innerHTML = `
    <div class="modal-media"><img alt="${esc(d.name_zh)} 的酒杯" decoding="async" width="1100" height="1400" src="${photoFor(d, 1100, 1400)}" /></div>
    <div class="modal-info">
      <div class="modal-info__head">
        <div class="modal-info__eyebrow">${esc(d.category === 'beer' ? 'BEER' : 'WINE')} · ${esc(meta.zh || d.type_zh)}</div>
        <p class="modal-info__name-zh">${esc(d.name_zh)}</p>
        <h2 class="modal-info__name" id="modal-title" lang="en">${nameHTML}</h2>
        <div class="modal-info__meta">
          <span class="modal-info__producer">${esc(d.producer)}</span>
          <span class="modal-info__logged">${isRated ? '品飲 · Tasted' : '記下 · Noted'} ${esc(fmtDate(d.tasting_date))}</span>
        </div>
      </div>

      <div class="modal-facts">
        ${facts.map(f => `
          <div class="modal-fact">
            <div class="modal-fact__label">${esc(f.label)}</div>
            <div class="modal-fact__value">${esc(f.value)}${f.sub ? `<em>${esc(f.sub)}</em>` : ''}</div>
          </div>`).join('')}
      </div>

      ${priceBlock ? `<div class="modal-section"><h3>購入 / Acquired</h3>${priceBlock}</div>` : ''}
      <div class="modal-section"><h3>評分 / Rating</h3>${ratingMarkup}</div>
      ${axisSection}
      <div class="modal-taste">
        <div class="modal-section"><h3>香氣 / Aroma</h3>${chips(d.aroma)}</div>
        <div class="modal-section"><h3>口感 / Palate</h3>${chips(d.palate)}</div>
      </div>
      <div class="modal-section"><h3>尾韻 / Finish</h3>${prose(d.finish)}</div>
      <div class="modal-section"><h3>配餐 / Pairing</h3>${chips(d.pairing)}${d.pairing_note ? `<p class="modal-pair-note">${esc(d.pairing_note)}</p>` : ''}</div>
      ${serveSection}
      <div class="modal-section"><h3>我的筆記 / Notes</h3>${notesMarkup}</div>
      ${knowSection ? `<div class="modal-know">${knowSection}</div>` : ''}
      <div class="modal-section"><h3>場景 / Context</h3><p>${esc(fmtDate(d.tasting_date))} · ${esc(d.occasion)}</p></div>
    </div>`;

  const sheet = $('.modal__sheet');
  sheet.scrollTop = 0;
  sheet.setAttribute('aria-labelledby', 'modal-title');
  lastFocused = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (push && location.hash !== '#w-' + d.id) {
    history.pushState({ wine: d.id }, '', '#w-' + d.id);
  }
  // while the guest is in the room, the rest of the property recedes
  [...document.body.children].forEach(el => {
    if (el !== modal && el.id !== 'loader' && !el.classList.contains('skip-link')) el.setAttribute('inert', '');
  });
  revealImages(inner);
  requestAnimationFrame(() => sheet.focus({ preventScroll: true }));
}

function closeModalUI() {
  const modal = $('#modal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.querySelectorAll('[inert]').forEach(el => el.removeAttribute('inert'));
  requestAnimationFrame(() => {
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
    else $('.nav__logo')?.focus({ preventScroll: true });
    lastFocused = null;
  });
}

function closeModal() {
  if (history.state && history.state.wine) {
    history.back();
  } else {
    if (location.hash.startsWith('#w-')) history.replaceState(null, '', location.pathname + location.search);
    closeModalUI();
  }
}

function setupModal() {
  const modal = $('#modal');
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const f = $$('.modal__sheet a[href], .modal__sheet button:not([disabled]), .modal__sheet [tabindex]:not([tabindex="-1"])')
        .filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
  window.addEventListener('popstate', () => {
    const id = location.hash.startsWith('#w-') ? location.hash.slice(3) : null;
    if (id) {
      const d = drinks.find(x => x.id === id);
      if (d) { openModal(d, { push: false }); return; }
    }
    if (modal.classList.contains('is-open')) closeModalUI();
  });
}

/* ============================================================
   Figures (counters) — animate when the Data band enters view
   ============================================================ */
function setupFigures() {
  const band = $('#hero-stats');
  if (!band) return;
  const countries = new Set(drinks.map(d => d.country_zh || d.country)).size;
  const varietals = new Set(drinks.map(d => d.varietal)).size;
  const targets = [drinks.length, countries, varietals];
  const els = $$('.stat__num', band);
  els.forEach((el, i) => el.dataset.target = String(targets[i]));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || document.documentElement.classList.contains('no-motion') || !('IntersectionObserver' in window)) {
    els.forEach((el, i) => el.textContent = String(targets[i]));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      els.forEach((el, i) => animateCounter(el, targets[i], 1100 + i * 120));
      io.disconnect();
    });
  }, { threshold: 0.4 });
  io.observe(band);
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  const ssMode = new URLSearchParams(location.search).has('ss');
  if (ssMode) {
    document.documentElement.classList.add('no-motion');
    document.body.classList.add('is-ready');
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderFilters();
  renderGrid();
  renderCharts(drinks, typeMeta);
  revealImages();

  $('#grid-empty')?.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (b) $(`.filter[data-filter="${b.dataset.filter}"]`)?.click();
  });

  setupModal();
  setupNav();
  if (!reduceMotion && !ssMode) setupCinema();
  setupReveal();
  setupFigures();

  if (ssMode) {
    document.querySelectorAll('.reveal, .card').forEach(el => el.classList.add('is-in'));
    document.querySelectorAll('.fill').forEach(f => { if (f.dataset.w) f.style.width = f.dataset.w; });
    document.querySelectorAll('.donut-arc').forEach(a => { if (a.dataset.target) a.setAttribute('stroke-dasharray', a.dataset.target); });
    const ldr = $('#loader'); if (ldr) ldr.remove();
    const modalId = new URLSearchParams(location.search).get('modal');
    if (modalId) { const d = drinks.find(x => x.id === modalId); if (d) openModal(d, { push: false }); }
    return;
  }

  // Deep link
  if (location.hash.startsWith('#w-')) {
    const d = drinks.find(x => x.id === location.hash.slice(3));
    if (d) openModal(d, { push: false });
  }

  // Loader fades once the hero image is in (or on a safety timeout)
  const heroImg = $('#hero-img');
  const reveal = () => { if (heroImg) heroImg.classList.add('is-loaded'); };
  const done = () => { reveal(); requestAnimationFrame(() => setTimeout(hideLoader, 120)); };
  if (heroImg && !(heroImg.complete && heroImg.naturalWidth)) {
    heroImg.addEventListener('load', done, { once: true });
    heroImg.addEventListener('error', done, { once: true });
    setTimeout(done, 1800);
  } else {
    done();
  }
}

document.addEventListener('DOMContentLoaded', init);
