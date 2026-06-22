/* ============================================================
   產區地圖 — 多國「探索清單」(ledger)，可切換「酒款 ⇄ 酒莊」兩種檢視
   狀態：tasted 已品飲（有評分）/ cellar 待品飲（有酒未評分）/ unexplored 未探索（無收藏）
   多國：走 ATLAS（義大利 + 紐西蘭 + …）。第一國為「主場」不另標國家標頭；
        其後的國家（如紐西蘭）以橫跨整列的國家標頭分隔。
   ============================================================ */

import { ATLAS, PRODUCERS, regionByKey } from './data.js';

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

const ALL_REGIONS = ATLAS.flatMap(c => c.regions);

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
  const total = ALL_REGIONS.length;
  let entered = 0, tasted = 0;
  ALL_REGIONS.forEach(r => {
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

// 國家標頭（橫跨整列）— 主場（第一國，義大利）不標，其後國家才標。
function countryHead(country, byRegion) {
  const total = country.regions.length;
  const entered = country.regions.filter(r => stateOf(byRegion[r.key]) !== 'unexplored').length;
  return `
    <header class="regions__country-head">
      <span class="regions__flag" aria-hidden="true">${country.flag}</span>
      <h3 lang="en">${esc(country.name_en)} <em lang="zh-Hant">${esc(country.name_zh)}</em></h3>
      <span class="regions__country-count"><b>${entered}</b>/${total}</span>
    </header>`;
}

/* ---- 酒款檢視（國家 → 產區 → 酒款）---- */
function wineViewHTML(drinks) {
  const byRegion = indexByRegion(drinks);

  return ATLAS.map((country, ci) => {
    // 主場（義大利）一律顯示；其後國家只有「有收藏」時才出現，避免空國家洗版。
    const hasWines = country.regions.some(r => (byRegion[r.key] || []).length);
    if (ci > 0 && !hasWines) return '';

    const head = ci === 0 ? '' : countryHead(country, byRegion);
    const zones = country.zoneGroups
      .map(g => zoneSectionHTML(g, country.regions, byRegion))
      .join('');
    return head + zones;
  }).join('');
}

function zoneSectionHTML(g, regions, byRegion) {
  const zoneRegions = regions.filter(r => g.zones.includes(r.zone));
  const gEntered = zoneRegions.filter(r => stateOf(byRegion[r.key]) !== 'unexplored').length;

  const entered = zoneRegions
    .map(r => ({ r, wines: sortWines(byRegion[r.key]), st: stateOf(byRegion[r.key]) }))
    .filter(x => x.st !== 'unexplored')
    .sort((a, b) => STATE_ORDER[a.st] - STATE_ORDER[b.st])
    .map(x => regionRow(x.r, x.wines, x.st)).join('');

  const unexplored = zoneRegions.filter(r => stateOf(byRegion[r.key]) === 'unexplored');
  const more = unexplored.length ? `
    <details class="regions__more">
      <summary><span class="region__mark region__mark--unexplored">·</span>其餘 ${unexplored.length} 區待探索</summary>
      <ul class="regions__list regions__list--more">${unexplored.map(r => regionRow(r, [], 'unexplored')).join('')}</ul>
    </details>` : '';

  return `
    <section class="regions__zone">
      <header class="regions__zone-head">
        <h3 lang="it">${esc(g.it)} <em lang="zh-Hant">${esc(g.zh)}</em></h3>
        <span class="regions__zone-count"><b>${gEntered}</b>/${zoneRegions.length}</span>
      </header>
      <ul class="regions__list">${entered}</ul>
      ${more}
    </section>`;
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

/* ---- 酒莊檢視（國家 → 產區 → 酒莊；只列已收藏的莊，空產區不出現）---- */
function producerViewHTML(drinks) {
  const byRegion = indexByRegion(drinks);
  const owned = PRODUCERS
    .map(p => ({ p, wines: sortWines(drinks.filter(d => d.producer === p.key)) }))
    .filter(x => x.wines.length)
    .map(x => ({ ...x, st: stateOf(x.wines) }));

  return ATLAS.map((country, ci) => {
    const keySet = new Set(country.regions.map(r => r.key));
    const inCountry = owned.filter(x => keySet.has(x.p.region_key));
    if (!inCountry.length) return '';

    const head = ci === 0 ? '' : countryHead(country, byRegion);
    const zones = country.zoneGroups.map(g => {
      const inZone = inCountry.filter(x => {
        const r = regionByKey(x.p.region_key);
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
    return head + zones;
  }).join('');
}

function producerRow(p, wines, st) {
  const region = regionByKey(p.region_key);
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
