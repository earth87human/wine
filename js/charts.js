/* ============================================================
   Charts — pure SVG, animated on intersection
   ============================================================ */

import { styleAxisTier, STYLE_AXIS_ENDS } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function renderCharts(drinks, typeMeta) {
  renderTypeChart(drinks, typeMeta);
  renderCountryChart(drinks);
  renderRatingChart(drinks);
  renderVarietalChart(drinks);
  renderStyleChart(drinks);
  addChartCaptions(drinks);
  observeChartsForAnimation();
}

/* Pinned figure captions — the studied-appendix finish */
function addChartCaptions(drinks) {
  const caps = {
    'chart-type':     'i · 依酒型 by type',
    'chart-country':  'ii · 依產地 by origin',
    'chart-rating':   'iii · 依評分 by rating',
    'chart-varietal': 'iv · 依品種 by varietal',
    'chart-style':    'v · 風格光譜 terroir ⇄ intl',
  };
  Object.entries(caps).forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (!el || el.querySelector('.chart__caption')) return;
    const fc = document.createElement('figcaption');
    fc.className = 'chart__caption';
    fc.textContent = `Fig. ${label} · n = ${drinks.length} · 自記錄`;
    el.appendChild(fc);
  });
}

/* ---- Type donut ---- */
function renderTypeChart(drinks, typeMeta) {
  const counts = {};
  drinks.forEach(d => {
    counts[d.type] = (counts[d.type] || 0) + 1;
  });

  const items = Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      label: typeMeta[type]?.zh || type,
      color: typeMeta[type]?.accent || '#5C1A1B',
    }))
    .sort((a, b) => b.count - a.count);

  const total = drinks.length;
  const size = 180;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const gap = items.length > 1 ? 1.5 : 0;
  const usable = c - gap * items.length;   // reserve the gaps up front so the ring closes at exactly 360°
  const a11yLabel = `類型分布，共 ${total} 支：` + items.map(it => `${it.label} ${it.count} 支`).join('、');

  let offset = 0;
  const segments = items.map((it, i) => {
    const len = (it.count / total) * usable;
    const seg = `
      <circle class="donut-arc"
              cx="${size/2}" cy="${size/2}" r="${r}"
              fill="none"
              stroke="${it.color}"
              stroke-width="11"
              stroke-linecap="butt"
              stroke-dasharray="0 ${c}"
              data-target="${len} ${c}"
              stroke-dashoffset="-${offset}"
              transform="rotate(-90 ${size/2} ${size/2})"
              style="transition: stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1); transition-delay: ${i * 100}ms;"/>
    `;
    offset += len + gap; // gap already reserved in `usable`
    return seg;
  }).join('');

  const legend = items.map(it => `
    <li style="--lc:${it.color};">
      <span>${it.label}</span>
      <b>${it.count}</b>
    </li>
  `).join('');

  $('#chart-type-body').innerHTML = `
    <div class="chart__donut">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(a11yLabel)}">
        <title>${esc(a11yLabel)}</title>
        <circle cx="${size/2}" cy="${size/2}" r="${r}"
                fill="none" stroke="rgba(58,34,24,0.08)" stroke-width="11"/>
        ${segments}
        <text x="${size/2}" y="${size/2 - 4}" text-anchor="middle"
              font-family="Cormorant Garamond, serif" font-style="italic"
              font-size="36" fill="#6E1A1F">${total}</text>
        <text x="${size/2}" y="${size/2 + 16}" text-anchor="middle"
              font-family="Inter, sans-serif" font-size="9"
              letter-spacing="2.5" fill="#857C72">TOTAL</text>
      </svg>
      <ul class="chart__donut-legend">${legend}</ul>
    </div>
  `;
}

/* ---- Country bars ---- */
function renderCountryChart(drinks) {
  const counts = {};
  drinks.forEach(d => {
    const key = d.country_zh || d.country;
    counts[key] = (counts[key] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, c]) => c), 1);

  const rows = sorted.map(([name, count], i) => `
    <div class="row">
      <span class="label">${esc(name)}</span>
      <div class="track">
        <div class="fill" data-w="${(count / max * 100).toFixed(1)}%"
             style="transition-delay: ${i * 70}ms;"></div>
      </div>
      <span class="num">${count}</span>
    </div>
  `).join('');

  $('#chart-country-body').innerHTML = `
    <div class="chart__bar">${rows}</div>
  `;
}

/* ---- Rating distribution ---- */
function renderRatingChart(drinks) {
  const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star ... index 4 = 5 stars
  let unrated = 0;
  drinks.forEach(d => {
    // round to the nearest whole star so fractional ratings (e.g. 3.8) bucket cleanly
    if (d.rating >= 1 && d.rating <= 5) counts[Math.round(d.rating) - 1]++;
    else if (d.rating == null) unrated++;
  });
  const max = Math.max(...counts, unrated, 1);

  let rows = counts.map((count, i) => {
    const star = i + 1;
    const stars = Array.from({ length: star }, () => `<i></i>`).join('');
    return `
      <div class="row">
        <span class="stars">${stars}</span>
        <div class="track">
          <div class="fill" data-w="${(count / max * 100).toFixed(1)}%"
               style="transition-delay: ${i * 80}ms;"></div>
        </div>
        <span class="num">${count}</span>
      </div>
    `;
  }).reverse().join('');

  // "待品飲": bought-but-not-yet-rated bottles, shown as a dashed ghost bar so the
  // chart honestly sums to every bottle (matching the donut) without faking a low score.
  if (unrated > 0) {
    rows += `
      <div class="row row--unrated">
        <span class="totry-label">待品飲</span>
        <div class="track">
          <div class="fill fill--ghost" data-w="${(unrated / max * 100).toFixed(1)}%"
               style="transition-delay: 480ms;"></div>
        </div>
        <span class="num">${unrated}</span>
      </div>
    `;
  }

  $('#chart-rating-body').innerHTML = `
    <div class="chart__rating">${rows}</div>
  `;
}

/* ---- Varietal cloud ---- */
function renderVarietalChart(drinks) {
  const counts = {};
  drinks.forEach(d => {
    const key = d.varietal;  // 內容用義大利文品種名（非中文）
    counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...Object.values(counts), 1);
  const allSingles = max === 1;   // every varietal appears once → weighting would collapse to identical sizes

  // size mapping: 0.95rem → 1.9rem (calm uniform size when all counts are 1)
  const items = entries
    .map(([name, count], i) => {
      const t = count / max;
      const size = (allSingles ? 1.15 : 1.05 + t * 1.4).toFixed(2);
      const opacity = (allSingles ? 0.9 : 0.55 + t * 0.45).toFixed(2);
      return `<span style="font-size:${size}rem; opacity:${opacity}; transition-delay:${i * 40}ms;">${esc(name)}</span>`;
    })
    .join('');

  // honest framing when there's no frequency signal yet
  const note = allSingles
    ? `<p class="chart__cloud-note">共 ${entries.length} 種品種，每種各一支</p>`
    : '';

  $('#chart-varietal-body').innerHTML = `
    <div class="chart__cloud">${items}</div>${note}
  `;
}

/* ---- Style axis (terroir ⇄ international) ---- */
function renderStyleChart(drinks) {
  const items = drinks
    .filter(d => d.style_axis != null)
    .sort((a, b) => b.style_axis - a.style_axis);

  const ends = `
    <div class="chart__axis-ends">
      <span>${esc(STYLE_AXIS_ENDS.left.zh)}<i>${esc(STYLE_AXIS_ENDS.left.en)}</i></span>
      <span>${esc(STYLE_AXIS_ENDS.right.zh)}<i>${esc(STYLE_AXIS_ENDS.right.en)}</i></span>
    </div>
  `;

  const rows = items.map((d, i) => {
    const v = d.style_axis;
    const tier = styleAxisTier(v);
    const short = d.name_en || d.name_zh || '';  // 內容用義大利文酒名（非中文）
    return `
      <div class="row" title="${esc(d.name_en)} · ${esc(tier.zh)}（${v}/100）">
        <span class="label">${esc(short)}</span>
        <div class="track">
          <div class="fill" data-w="${v}%" style="transition-delay:${i * 70}ms;"></div>
          <i class="dot" style="left:${v}%; background:${esc(d.color_hex || '#5C1A1B')};"></i>
        </div>
        <span class="axis-tier">${esc(tier.zh)}</span>
      </div>
    `;
  }).join('');

  $('#chart-style-body').innerHTML = `
    <div class="chart__axis">
      ${ends}
      <div class="chart__axis-rows">${rows}</div>
    </div>
  `;
}

/* ---- Animation trigger ---- */
function observeChartsForAnimation() {
  const charts = $$('.chart');
  if (!('IntersectionObserver' in window)) {
    charts.forEach(c => activateChart(c));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activateChart(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  charts.forEach(c => io.observe(c));
}

function activateChart(chart) {
  // Donut: set stroke-dasharray to target value
  $$('.donut-arc', chart).forEach(arc => {
    const target = arc.dataset.target;
    if (target) arc.setAttribute('stroke-dasharray', target);
  });
  // Bars: set width to target
  $$('.fill', chart).forEach(fill => {
    const w = fill.dataset.w;
    if (w) fill.style.width = w;
  });
  // Cloud: fade in (already done via opacity in CSS — but we want stagger).
  // The Web Animations API isn't governed by the reduced-motion CSS media query, so gate it here.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    $$('.chart__cloud span', chart).forEach((s, i) => {
      s.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: s.style.opacity || 0.7, transform: 'translateY(0)' }],
        { duration: 600, delay: i * 40, fill: 'forwards', easing: 'cubic-bezier(0.16,1,0.3,1)' }
      );
    });
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
