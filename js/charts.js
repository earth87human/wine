/* ============================================================
   Charts — pure SVG, animated on intersection
   ============================================================ */

import { ITALY_REGIONS } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function renderCharts(drinks, typeMeta) {
  renderTypeChart(drinks, typeMeta);
  renderRegionChart(drinks);
  renderVarietalChart(drinks);
  addChartCaptions(drinks);
  observeChartsForAnimation();
}

/* Pinned figure captions — the studied-appendix finish */
function addChartCaptions(drinks) {
  const caps = {
    'chart-type':     'i · 依酒型 by type',
    'chart-region':   'ii · 依產區 by region',
    'chart-varietal': 'iii · 依品種 by varietal',
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

/* ---- Region bars (義大利產區，原文 + 國旗) ---- */
function renderRegionChart(drinks) {
  const counts = {};
  drinks.forEach(d => {
    if (d.region_key) counts[d.region_key] = (counts[d.region_key] || 0) + 1;
  });

  const rows = Object.entries(counts)
    .map(([key, count]) => {
      const r = ITALY_REGIONS.find(x => x.key === key);
      return { name: r ? r.name_it : key, count };
    })
    .sort((a, b) => b.count - a.count);
  const max = Math.max(...rows.map(r => r.count), 1);

  const html = rows.map((r, i) => `
    <div class="row">
      <span class="label"><span class="flag" aria-hidden="true">🇮🇹</span>${esc(r.name)}</span>
      <div class="track">
        <div class="fill" data-w="${(r.count / max * 100).toFixed(1)}%"
             style="transition-delay: ${i * 70}ms;"></div>
      </div>
      <span class="num">${r.count}</span>
    </div>
  `).join('');

  $('#chart-region-body').innerHTML = `
    <div class="chart__bar chart__bar--region">${html}</div>
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
