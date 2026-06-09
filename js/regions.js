/* ============================================================
   產區地圖 — 義大利 20 區「探索清單」(ledger)，可切換「酒款 ⇄ 酒莊」兩種檢視
   狀態：tasted 已品飲（有評分）/ cellar 待品飲（有酒未評分）/ unexplored 未探索（無收藏）
   ============================================================ */

import { ITALY_REGIONS, ITALY_ZONE_GROUPS, PRODUCERS } from './data.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

const stateOf = (wines) => !wines || !wines.length
  ? 'unexplored'
  : (wines.some(w => w.rating != null) ? 'tasted' : 'cellar');

const STATE_ORDER = { tasted: 0, cellar: 1, unexplored: 2 };
const STATE_MARK  = { tasted: '★', cellar: '◌', unexplored: '·' };
const STATE_ZH    = { tasted: '已品飲', cellar: '待品飲', unexplored: '未探索' };

let _drinks = [];
let _view = 'wines';   // 'wines' | 'producers'

export function renderRegions(drinks) {
  _drinks = drinks;
  const summaryEl = $('#regions-summary');
  const zonesEl = $('#regions-zones');
  if (!zonesEl) return;

  if (summaryEl) summaryEl.innerHTML = summaryHTML(drinks);
  renderView();

  // 檢視切換（酒款 ⇄ 酒莊）— 委派一次即可
  const seg = $('#regions-view');
  if (seg && !seg.dataset.bound) {
    seg.dataset.bound = '1';
    seg.addEventListener('click', e => {
      const btn = e.target.closest('[data-view]');
      if (!btn || btn.dataset.view === _view) return;
      _view = btn.dataset.view;
      $$('#regions-view [data-view]').forEach(b => {
        const on = b.dataset.view === _view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderView();
    });
  }
}

function indexByRegion(drinks) {
  const by = {};
  drinks.forEach(d => { if (d.region_key) (by[d.region_key] ||= []).push(d); });
  return by;
}
const sortWines = (wines) => (wines || []).slice()
  .sort((a, b) => (a.rating == null) - (b.rating == null));   // 已評分排前

function summaryHTML(drinks) {
  const byRegion = indexByRegion(drinks);
  const total = ITALY_REGIONS.length;
  let entered = 0, tasted = 0;
  ITALY_REGIONS.forEach(r => {
    const st = stateOf(byRegion[r.key]);
    if (st !== 'unexplored') entered++;
    if (st === 'tasted') tasted++;
  });
  const producerCount = PRODUCERS.filter(p => drinks.some(d => d.producer === p.key)).length;

  return `
    <div class="regions__stats">
      <span class="regions__stat"><b>${tasted}</b> 已品飲</span>
      <span class="regions__stat"><b>${entered}</b> 已踏入</span>
      <span class="regions__stat regions__stat--mute"><b>${total}</b> 全區</span>
      <span class="regions__stat regions__stat--mute"><b>${producerCount}</b> 酒莊</span>
    </div>
    <div class="seg" id="regions-view" role="group" aria-label="切換檢視：酒款或酒莊">
      <button type="button" data-view="wines" class="is-active" aria-pressed="true">酒款</button>
      <button type="button" data-view="producers" aria-pressed="false">酒莊</button>
    </div>
    <div class="regions__legend">
      <i class="region__mark region__mark--tasted">★</i>已品飲
      <i class="region__mark region__mark--cellar">◌</i>待品飲
      <i class="region__mark region__mark--unexplored">·</i>未探索
    </div>`;
}

function renderView() {
  const zonesEl = $('#regions-zones');
  if (!zonesEl) return;
  zonesEl.dataset.view = _view;
  zonesEl.innerHTML = _view === 'producers'
    ? producerViewHTML(_drinks)
    : wineViewHTML(_drinks);
}

/* ---- 酒款檢視（產區 → 酒款）---- */
function wineViewHTML(drinks) {
  const byRegion = indexByRegion(drinks);

  return ITALY_ZONE_GROUPS.map(g => {
    const regions = ITALY_REGIONS.filter(r => g.zones.includes(r.zone));
    const gEntered = regions.filter(r => stateOf(byRegion[r.key]) !== 'unexplored').length;

    const entered = regions
      .map(r => ({ r, wines: sortWines(byRegion[r.key]), st: stateOf(byRegion[r.key]) }))
      .filter(x => x.st !== 'unexplored')
      .sort((a, b) => STATE_ORDER[a.st] - STATE_ORDER[b.st])
      .map(x => regionRow(x.r, x.wines, x.st)).join('');

    const unexplored = regions.filter(r => stateOf(byRegion[r.key]) === 'unexplored');
    const more = unexplored.length ? `
      <details class="regions__more">
        <summary><span class="region__mark region__mark--unexplored">·</span>其餘 ${unexplored.length} 區待探索</summary>
        <ul class="regions__list regions__list--more">${unexplored.map(r => regionRow(r, [], 'unexplored')).join('')}</ul>
      </details>` : '';

    return `
      <section class="regions__zone">
        <header class="regions__zone-head">
          <h3 lang="it">${esc(g.it)} <em lang="zh-Hant">${esc(g.zh)}</em></h3>
          <span class="regions__zone-count"><b>${gEntered}</b>/${regions.length}</span>
        </header>
        <ul class="regions__list">${entered}</ul>
        ${more}
      </section>`;
  }).join('');
}

function regionRow(r, wines, st) {
  const body = st === 'unexplored'
    ? ''
    : `<span class="region__wines">${wines.map(chip).join('')}</span>`;
  return `
    <li class="region region--${st}">
      <span class="region__mark region__mark--${st}" aria-hidden="true">${STATE_MARK[st]}</span>
      <span class="region__name" lang="it">${esc(r.name_it)}<em lang="zh-Hant">${esc(r.name_zh)}</em></span>
      <span class="sr-only">（${STATE_ZH[st]}）</span>
      ${body}
      <span class="region__note">${esc(r.note)}</span>
    </li>`;
}

const chip = (w) =>
  `<button type="button" class="region__chip" data-wine-id="${esc(w.id)}" title="${esc(w.name_en)}">${esc(w.name_en)}</button>`;

/* ---- 酒莊檢視（產區 → 酒莊；只列已收藏的莊，空產區不出現）---- */
function producerViewHTML(drinks) {
  const owned = PRODUCERS
    .map(p => ({ p, wines: sortWines(drinks.filter(d => d.producer === p.key)) }))
    .filter(x => x.wines.length)
    .map(x => ({ ...x, st: stateOf(x.wines) }));

  return ITALY_ZONE_GROUPS.map(g => {
    const inZone = owned.filter(x => {
      const r = ITALY_REGIONS.find(rr => rr.key === x.p.region_key);
      return r && g.zones.includes(r.zone);
    }).sort((a, b) => STATE_ORDER[a.st] - STATE_ORDER[b.st]);
    if (!inZone.length) return '';

    const rows = inZone.map(x => producerRow(x.p, x.wines, x.st)).join('');
    return `
      <section class="regions__zone">
        <header class="regions__zone-head">
          <h3 lang="it">${esc(g.it)} <em lang="zh-Hant">${esc(g.zh)}</em></h3>
          <span class="regions__zone-count"><b>${inZone.length}</b> 莊</span>
        </header>
        <ul class="regions__list regions__list--producers">${rows}</ul>
      </section>`;
  }).join('');
}

function producerRow(p, wines, st) {
  const region = ITALY_REGIONS.find(r => r.key === p.region_key);
  const meta = [p.founded, p.type, p.tagline].filter(Boolean).join(' · ');
  return `
    <li class="producer producer--${st}">
      <button type="button" class="producer__row" data-producer-key="${esc(p.key)}" aria-label="${esc(p.key)} ${esc(p.name_zh)}（${STATE_ZH[st]}），${wines.length} 支">
        <span class="region__mark region__mark--${st}" aria-hidden="true">${STATE_MARK[st]}</span>
        <span class="producer__main">
          <span class="producer__name" lang="it">${esc(p.key)}<em lang="zh-Hant">${esc(p.name_zh)}</em></span>
          <span class="producer__meta">${esc(meta)}</span>
        </span>
        <span class="producer__aside">
          ${region ? `<span class="producer__region" lang="it">${esc(region.name_it)}</span>` : ''}
          <span class="producer__count">${wines.length} 支</span>
        </span>
      </button>
    </li>`;
}
